import { dialog, ipcMain } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createErrorResponse, logError } from '../../shared/error-utils';
import { ExportResult } from '../../shared/types';
import { generateCaptureOneBasicStyle, generateCaptureOneStyle } from '../capture-one-generator';
import { ImageProcessor } from '../image-processor';
import { SettingsService } from '../settings-service';
import { StorageService } from '../storage-service';
import { generateXMPContent } from '../xmp-generator';

export class ExportHandlers {
  constructor(
    private imageProcessor: ImageProcessor,
    private storageService: StorageService,
    private settingsService: SettingsService
  ) { }

  // Helper function to create ZIP file with recipes
  private async createRecipesZip(recipes: any[], title: string, defaultFilename: string): Promise<ExportResult> {
    const saveRes = await dialog.showSaveDialog({
      title,
      defaultPath: defaultFilename,
      filters: [
        { name: 'Film Recipe Wizard Zip', extensions: ['zip'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (saveRes.canceled || !saveRes.filePath) {
      return { success: false, error: 'Export canceled' };
    }

    // Build ZIP contents
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();

    // Clean up recipes to remove absolute paths
    const cleanedRecipes = recipes.map(recipe => {
      const cleaned = { ...recipe };
      if (cleaned.results) {
        cleaned.results = cleaned.results.map((result: any) => {
          const cleanedResult = { ...result };
          // Remove absolute paths - these are temporary/local paths that won't be valid on import
          delete cleanedResult.inputPath;
          delete cleanedResult.outputPath;
          return cleanedResult;
        });
      }
      return cleaned;
    });

    // Write manifest with processes
    const manifest = {
      schema: 'film-recipe-wizard-bulk@1',
      exportedAt: new Date().toISOString(),
      count: cleanedRecipes.length,
      processes: cleanedRecipes,
    };
    zip.addFile('all-recipes.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));

    // Export recipe images and XMP presets for each process
    for (let i = 0; i < recipes.length; i++) {
      const recipe = recipes[i];
      const recipeDir = `recipe-${i + 1}-${recipe.id}`;

      // Add recipe image if available
      if ((recipe as any).recipeImageData) {
        const buf = Buffer.from((recipe as any).recipeImageData, 'base64');
        zip.addFile(`${recipeDir}/recipe.jpg`, buf);
      }

      // Add XMP presets for each result
      try {
        const results = recipe.results || [];
        results.forEach((r: any) => {
          const adj = r?.metadata?.aiAdjustments;
          if (adj) {
            const include = {
              basic: true,
              hsl: true,
              colorGrading: true,
              curves: true,
              pointColor: true,
              grain: true,
              vignette: true,
              masks: true,
              exposure: false,
              sharpenNoise: false,
            } as any;
            if (recipe.name) (include as any).recipeName = String(recipe.name);
            const xmp = generateXMPContent(adj, include);
            const safePreset = (recipe.name || 'Custom Recipe')
              .replace(/[^A-Za-z0-9 _-]+/g, '')
              .replace(/\s+/g, ' ')
              .trim()
              .replace(/\s/g, '-');
            zip.addFile(
              `presets/${safePreset || 'Custom-Recipe'}.xmp`,
              Buffer.from(xmp, 'utf8')
            );
          }
        });
      } catch (e) {
        console.warn('[IPC] createRecipesZip: failed to add XMP presets for recipe:', recipe.id, e);
      }
    }

    // Write out the zip
    zip.writeZip(saveRes.filePath);
    return { success: true, filePath: saveRes.filePath };
  }

  setupHandlers(): void {
    // Generate XMP content (no save dialog) and return the string
    ipcMain.handle('generate-xmp-content', async (_event, data: { adjustments: any; include?: any; recipeName?: string }) => {
      try {
        // Merge caller prefs with sensible defaults
        const include = {
          basic: data?.include?.basic ?? true,
          hsl: data?.include?.hsl ?? true,
          colorGrading: data?.include?.colorGrading ?? true,
          curves: data?.include?.curves ?? true,
          pointColor: data?.include?.pointColor ?? true,
          grain: data?.include?.grain ?? true,
          vignette: data?.include?.vignette ?? true,
          masks: data?.include?.masks ?? true,
          // Exposure: respect caller if provided; default to false here
          exposure: data?.include?.exposure ?? false,
          sharpenNoise: false,
        } as any;
        if (data?.recipeName) (include as any).recipeName = String(data.recipeName);
        const xmpContent = generateXMPContent(data.adjustments, include);
        return { success: true, content: xmpContent };
      } catch (error) {
        logError('IPC', 'Error generating XMP content', error);
        return createErrorResponse(error);
      }
    });

    // Note: download-xmp handler removed - now using unified export system

    // Export a recipe (process) to a ZIP file
    ipcMain.handle('export-recipe', async (_event, processId: string): Promise<ExportResult> => {
      try {
        if (!processId) throw new Error('No processId provided');
        const process = await this.storageService.getProcess(processId);
        if (!process) throw new Error('Recipe not found');

        // Suggest a friendly default filename
        const aiName = (process as any)?.results?.[0]?.metadata?.aiAdjustments?.preset_name as
          | string
          | undefined;
        const rawName = (process.name || aiName || `Recipe-${process.id || 'export'}`).toString();
        const safeName = rawName
          .replace(/[^A-Za-z0-9 _-]+/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/\s/g, '-');

        const saveRes = await dialog.showSaveDialog({
          title: 'Export Recipe (ZIP)',
          defaultPath: `${safeName || 'Recipe'}.frw.zip`,
          filters: [
            { name: 'Film Recipe Wizard Zip', extensions: ['zip'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });
        if (saveRes.canceled || !saveRes.filePath) {
          return { success: false, error: 'Export canceled' };
        }

        // Build ZIP contents
        const AdmZip = require('adm-zip');
        const zip = new AdmZip();

        // Clean up process to remove absolute paths
        const cleanedProcess = { ...process };
        if (cleanedProcess.results) {
          cleanedProcess.results = cleanedProcess.results.map(result => {
            const cleanedResult = { ...result };
            // Remove absolute paths - these are temporary/local paths that won't be valid on import
            delete cleanedResult.inputPath;
            delete cleanedResult.outputPath;
            return cleanedResult;
          });
        }

        // Write manifest with embedded base64 images and results
        const manifest = {
          schema: 'film-recipe-wizard@1',
          exportedAt: new Date().toISOString(),
          process: cleanedProcess,
        };
        zip.addFile('recipe.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));

        // Also export recipe image if available
        if ((process as any).recipeImageData) {
          const buf = Buffer.from((process as any).recipeImageData, 'base64');
          zip.addFile('images/recipe.jpg', buf);
        }
        // Note: target and base images are no longer stored in ProcessHistory

        // Optionally include XMP presets for each successful result
        try {
          const results = process.results || [];
          results.forEach((r: any, idx: number) => {
            const adj = r?.metadata?.aiAdjustments;
            if (!adj) return;

            // Always export all available features from AI adjustments
            const include = {
              basic: true,
              hsl: true,
              colorGrading: true,
              curves: true,
              pointColor: true,
              grain: true,
              vignette: true,
              masks: true,
              exposure: false, // Keep exposure separate and disabled by default
              sharpenNoise: false, // Not implemented in XMP
              strength: 1.0, // Default strength
            } as any;

            // Ensure internal XMP uses the recipe's canonical name (with index suffix when multiple)
            (include as any).recipeName = `${process.name || 'Recipe'}${results.length > 1 ? `-${idx + 1}` : ''}`;
            const xmp = generateXMPContent(adj as any, include);
            const baseName = (process.name || 'Recipe') + (results.length > 1 ? `-${idx + 1}` : '');
            const safePreset = baseName
              .replace(/[^A-Za-z0-9 _-]+/g, '')
              .replace(/\s+/g, ' ')
              .trim()
              .replace(/\s/g, '-');
            zip.addFile(
              `presets/${safePreset || 'Custom-Recipe'}.xmp`,
              Buffer.from(xmp, 'utf8')
            );
          });
        } catch (e) {
          console.warn('[IPC] export-recipe: failed to add XMP presets:', e);
        }

        // Write out the zip
        zip.writeZip(saveRes.filePath);
        return { success: true, filePath: saveRes.filePath };
      } catch (error) {
        logError('IPC', 'Error exporting recipe', error);
        return createErrorResponse(error);
      }
    });

    // Export selected recipes to a ZIP file
    ipcMain.handle('export-selected-recipes', async (_event, recipeIds: string[]): Promise<ExportResult> => {
      try {
        if (!recipeIds || recipeIds.length === 0) {
          throw new Error('No recipes selected for export');
        }

        const allRecipes = await this.storageService.loadRecipes();
        const selectedRecipes = allRecipes.filter(recipe => recipeIds.includes(recipe.id));
        
        if (selectedRecipes.length === 0) {
          throw new Error('No matching recipes found');
        }

        return await this.createRecipesZip(
          selectedRecipes,
          'Export Selected Recipes (ZIP)',
          `Selected-Recipes-${new Date().toISOString().split('T')[0]}.frw.zip`
        );
      } catch (error) {
        logError('IPC', 'Error exporting selected recipes', error);
        return createErrorResponse(error);
      }
    });

    // Export all recipes to a ZIP file
    ipcMain.handle('export-all-recipes', async (): Promise<ExportResult> => {
      try {
        const recipes = await this.storageService.loadRecipes();
        if (!recipes || recipes.length === 0) {
          throw new Error('No recipes to export');
        }

        const saveRes = await dialog.showSaveDialog({
          title: 'Export All Recipes (ZIP)',
          defaultPath: `All-Recipes-${new Date().toISOString().split('T')[0]}.frw.zip`,
          filters: [
            { name: 'Film Recipe Wizard Zip', extensions: ['zip'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });
        if (saveRes.canceled || !saveRes.filePath) {
          return { success: false, error: 'Export canceled' };
        }

        // Build ZIP contents
        const AdmZip = require('adm-zip');
        const zip = new AdmZip();

        // Clean up recipes to remove absolute paths
        const cleanedRecipes = recipes.map(recipe => {
          const cleaned = { ...recipe };
          if (cleaned.results) {
            cleaned.results = cleaned.results.map((result: any) => {
              const cleanedResult = { ...result };
              // Remove absolute paths - these are temporary/local paths that won't be valid on import
              delete cleanedResult.inputPath;
              delete cleanedResult.outputPath;
              return cleanedResult;
            });
          }
          return cleaned;
        });

        // Write manifest with all processes
        const manifest = {
          schema: 'film-recipe-wizard-bulk@1',
          exportedAt: new Date().toISOString(),
          count: cleanedRecipes.length,
          processes: cleanedRecipes,
        };
        zip.addFile('all-recipes.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));

        // Export recipe images and XMP presets for each process
        for (let i = 0; i < recipes.length; i++) {
          const recipe = recipes[i];
          const recipeDir = `recipe-${i + 1}-${recipe.id}`;

          // Add recipe image if available
          if ((recipe as any).recipeImageData) {
            const buf = Buffer.from((recipe as any).recipeImageData, 'base64');
            zip.addFile(`${recipeDir}/recipe.jpg`, buf);
          }

          // Add XMP presets for each result
          try {
            const results = recipe.results || [];
            results.forEach((r: any, idx: number) => {
              const adj = r?.metadata?.aiAdjustments;
              if (!adj) return;
              const include = {
                basic: true,
                hsl: true,
                colorGrading: true,
                curves: true,
                sharpenNoise: true,
                vignette: true,
                pointColor: true,
                grain: true,
                exposure: false,
                masks: true,
              } as any;
              // Ensure internal XMP uses the recipe's canonical name (with index suffix when multiple)
              (include as any).recipeName = `${recipe.name || 'Recipe'}${results.length > 1 ? `-${idx + 1}` : ''}`;
              const xmp = generateXMPContent(adj as any, include);
              const baseName = (recipe.name || 'Recipe') + (results.length > 1 ? `-${idx + 1}` : '');
              const safePreset = baseName
                .replace(/[^A-Za-z0-9 _-]+/g, '')
                .replace(/\s+/g, ' ')
                .trim()
                .replace(/\s/g, '-');
              zip.addFile(
                `${recipeDir}/presets/${safePreset || 'Custom-Recipe'}.xmp`,
                Buffer.from(xmp, 'utf8')
              );
            });
          } catch (e) {
            console.warn(`[IPC] export-all-recipes: failed to add XMP presets for recipe ${recipe.id}:`, e);
          }
        }

        // Write out the zip
        zip.writeZip(saveRes.filePath);
        return { success: true, filePath: saveRes.filePath, count: recipes.length };
      } catch (error) {
        logError('IPC', 'Error exporting all recipes', error);
        return createErrorResponse(error);
      }
    });


    // Generate camera profile
    ipcMain.handle('generate-camera-profile', async (_event, data) => {
      try {
        const result = await this.imageProcessor.generateCameraProfile(data);
        return result;
      } catch (error) {
        logError('IPC', 'Error generating camera profile', error);
        return createErrorResponse(error);
      }
    });

    // Export camera profile (generate from adjustments and save)
    ipcMain.handle('export-profile', async (_event, data: { adjustments: any; recipeIndex?: number; recipeName?: string }) => {
      try {
        // First generate the camera profile XMP content
        const profileResult = await this.imageProcessor.generateCameraProfile(data);
        if (!profileResult.success || !profileResult.xmpContent) {
          return { success: false, error: profileResult.error || 'Failed to generate profile' };
        }

        // Show save dialog
        const { dialog } = require('electron');
        // Use recipe name if AI generated "Custom Recipe"
        const aiPresetName = (data.adjustments?.preset_name as string | undefined);
        const recipeName = (data?.recipeName as string | undefined);
        const presetName = (aiPresetName && aiPresetName !== 'Custom Recipe') ? aiPresetName : (recipeName || 'Camera Profile');
        const safeName = presetName
          .replace(/[^A-Za-z0-9 _-]+/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/\s/g, '-');

        const result = await dialog.showSaveDialog({
          title: 'Export Profile',
          defaultPath: `${safeName}-Profile.xmp`,
          filters: [
            { name: 'Camera Profile', extensions: ['xmp'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (!result.canceled && result.filePath) {
          // Write the file
          await fs.writeFile(result.filePath, profileResult.xmpContent, 'utf8');
          return { success: true, outputPath: result.filePath };
        } else {
          return { success: false, error: 'Save canceled' };
        }
      } catch (error) {
        logError('IPC', 'Error exporting profile', error);
        return createErrorResponse(error);
      }
    });

    // Direct export preset to Lightroom folder
    ipcMain.handle('export-preset-to-lightroom', async (_event, data: { adjustments: any; recipeName?: string }) => {
      try {
        // Get Lightroom profile path from settings
        const settings = await this.settingsService.loadSettings();
        if (!settings.lightroomProfilePath) {
          return { success: false, error: 'Lightroom profile path not configured. Please set it in Settings.' };
        }

        // Generate XMP content
        const include = {
          basic: true,
          hsl: true,
          colorGrading: true,
          curves: true,
          pointColor: true,
          grain: true,
          vignette: true,
          masks: true,
          exposure: false,
          sharpenNoise: false,
        } as any;
        if (data?.recipeName) (include as any).recipeName = String(data.recipeName);
        const xmpContent = generateXMPContent(data.adjustments, include);

        // Create safe filename
        const presetName = data?.recipeName || 'Custom Recipe';
        const safeName = presetName
          .replace(/[^A-Za-z0-9 _-]+/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/\s/g, '-');

        // Ensure directory exists
        await fs.mkdir(settings.lightroomProfilePath, { recursive: true });

        // Write file to Lightroom folder (overwrite if exists)
        const filePath = path.join(settings.lightroomProfilePath, `${safeName}.xmp`);
        await fs.writeFile(filePath, xmpContent, { encoding: 'utf8', flag: 'w' });

        return { success: true, outputPath: filePath };
      } catch (error) {
        logError('IPC', 'Error exporting preset to Lightroom', error);
        return createErrorResponse(error);
      }
    });

    // Direct export camera profile to Lightroom folder
    ipcMain.handle('export-profile-to-lightroom', async (_event, data: { adjustments: any; recipeName?: string }) => {
      try {
        // Get Lightroom profile path from settings
        const settings = await this.settingsService.loadSettings();
        if (!settings.lightroomProfilePath) {
          return { success: false, error: 'Lightroom profile path not configured. Please set it in Settings.' };
        }

        // Generate camera profile XMP content
        const profileResult = await this.imageProcessor.generateCameraProfile(data);
        if (!profileResult.success || !profileResult.xmpContent) {
          return { success: false, error: profileResult.error || 'Failed to generate profile' };
        }

        // Create safe filename
        const aiPresetName = (data.adjustments?.preset_name as string | undefined);
        const recipeName = (data?.recipeName as string | undefined);
        const presetName = (aiPresetName && aiPresetName !== 'Custom Recipe') ? aiPresetName : (recipeName || 'Camera Profile');
        const safeName = presetName
          .replace(/[^A-Za-z0-9 _-]+/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/\s/g, '-');

        // Ensure directory exists
        await fs.mkdir(settings.lightroomProfilePath, { recursive: true });

        // Write file to Lightroom folder (overwrite if exists)
        const filePath = path.join(settings.lightroomProfilePath, `${safeName}-Profile.xmp`);
        await fs.writeFile(filePath, profileResult.xmpContent, { encoding: 'utf8', flag: 'w' });

        return { success: true, outputPath: filePath };
      } catch (error) {
        logError('IPC', 'Error exporting profile to Lightroom', error);
        return createErrorResponse(error);
      }
    });

    // Direct export style to Capture One folder
    ipcMain.handle('export-style-to-capture-one', async (_event, data: { adjustments: any; recipeName?: string }) => {
      try {
        // Get Capture One styles path from settings
        const settings = await this.settingsService.loadSettings();
        if (!settings.captureOneStylesPath) {
          return { success: false, error: 'Capture One styles path not configured. Please set it in Settings.' };
        }

        // Generate Capture One style content
        const include = {
          basic: true,
          hsl: true,
          colorGrading: true,
          grain: true,
          vignette: true,
          masks: true,
        } as any;
        if (data?.recipeName) (include as any).recipeName = String(data.recipeName);
        const styleContent = generateCaptureOneStyle(data.adjustments, include);

        // Create safe filename
        const presetName = data?.recipeName || 'Custom Recipe';
        const safeName = presetName
          .replace(/[^A-Za-z0-9 _-]+/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/\s/g, '-');

        // Ensure directory exists
        await fs.mkdir(settings.captureOneStylesPath, { recursive: true });

        // Write file to Capture One folder (overwrite if exists)
        const filePath = path.join(settings.captureOneStylesPath, `${safeName}.costyle`);
        await fs.writeFile(filePath, styleContent, { encoding: 'utf8', flag: 'w' });

        return { success: true, outputPath: filePath };
      } catch (error) {
        logError('IPC', 'Error exporting style to Capture One', error);
        return createErrorResponse(error);
      }
    });

    // Direct export basic style to Capture One folder
    ipcMain.handle('export-basic-style-to-capture-one', async (_event, data: { adjustments: any; recipeName?: string }) => {
      try {
        // Get Capture One styles path from settings
        const settings = await this.settingsService.loadSettings();
        if (!settings.captureOneStylesPath) {
          return { success: false, error: 'Capture One styles path not configured. Please set it in Settings.' };
        }

        // Generate basic Capture One style content
        const include = {
          basic: true,
          hsl: false,
          colorGrading: false,
          grain: false,
          vignette: false,
        } as any;
        if (data?.recipeName) (include as any).recipeName = String(data.recipeName);
        const styleContent = generateCaptureOneBasicStyle(data.adjustments, include);

        // Create safe filename
        const presetName = data?.recipeName || 'Custom Recipe';
        const safeName = presetName
          .replace(/[^A-Za-z0-9 _-]+/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/\s/g, '-');

        // Ensure directory exists
        await fs.mkdir(settings.captureOneStylesPath, { recursive: true });

        // Write file to Capture One folder (overwrite if exists)
        const filePath = path.join(settings.captureOneStylesPath, `${safeName}-Basic.costyle`);
        await fs.writeFile(filePath, styleContent, { encoding: 'utf8', flag: 'w' });

        return { success: true, outputPath: filePath };
      } catch (error) {
        logError('IPC', 'Error exporting basic style to Capture One', error);
        return createErrorResponse(error);
      }
    });

    // Generate Capture One style content (no save dialog) and return the string
    ipcMain.handle('generate-capture-one-style', async (_event, data: { adjustments: any; include?: any; recipeName?: string }) => {
      try {
        const styleContent = generateCaptureOneStyle(data.adjustments, data.include || {});
        return { success: true, content: styleContent };
      } catch (error) {
        logError('IPC', 'Error generating Capture One style', error);
        return createErrorResponse(error);
      }
    });

    // Generate basic Capture One style content (no save dialog) and return the string
    ipcMain.handle('generate-capture-one-basic-style', async (_event, data: { adjustments: any; include?: any; recipeName?: string }) => {
      try {
        const styleContent = generateCaptureOneBasicStyle(data.adjustments, data.include || {});
        return { success: true, content: styleContent };
      } catch (error) {
        logError('IPC', 'Error generating basic Capture One style', error);
        return createErrorResponse(error);
      }
    });

    // Download Capture One style file (similar to downloadXMP)
    ipcMain.handle('download-capture-one-style', async (_event, data: { adjustments: any; include?: any; recipeName?: string }) => {
      try {
        const styleContent = generateCaptureOneStyle(data.adjustments, data.include || {});
        const fileName = `${data.recipeName || 'Custom-Style'}.costyle`;
        
        const saveRes = await dialog.showSaveDialog({
          title: 'Save Capture One Style',
          defaultPath: fileName,
          filters: [
            { name: 'Capture One Style', extensions: ['costyle'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });
        
        if (saveRes.canceled || !saveRes.filePath) {
          return { success: false, error: 'Export canceled' };
        }
        
        await fs.writeFile(saveRes.filePath, styleContent, { encoding: 'utf8' });
        return { success: true, filePath: saveRes.filePath };
      } catch (error) {
        logError('IPC', 'Error downloading Capture One style', error);
        return createErrorResponse(error);
      }
    });

    // Download basic Capture One style file
    ipcMain.handle('download-capture-one-basic-style', async (_event, data: { adjustments: any; include?: any; recipeName?: string }) => {
      try {
        const styleContent = generateCaptureOneBasicStyle(data.adjustments, data.include || {});
        const fileName = `${data.recipeName || 'Custom-Style'}-Basic.costyle`;
        
        const saveRes = await dialog.showSaveDialog({
          title: 'Save Basic Capture One Style',
          defaultPath: fileName,
          filters: [
            { name: 'Capture One Style', extensions: ['costyle'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });
        
        if (saveRes.canceled || !saveRes.filePath) {
          return { success: false, error: 'Export canceled' };
        }
        
        await fs.writeFile(saveRes.filePath, styleContent, { encoding: 'utf8' });
        return { success: true, filePath: saveRes.filePath };
      } catch (error) {
        logError('IPC', 'Error downloading basic Capture One style', error);
        return createErrorResponse(error);
      }
    });
  }
}
