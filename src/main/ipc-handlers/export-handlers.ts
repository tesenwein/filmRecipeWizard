import { dialog, ipcMain } from 'electron';
import * as fs from 'fs/promises';
import { ExportResult } from '../../shared/types';
import { ImageProcessor } from '../image-processor';
import { StorageService } from '../storage-service';
import { generateXMPContent } from '../xmp-generator';

export class ExportHandlers {
  constructor(
    private imageProcessor: ImageProcessor,
    private storageService: StorageService
  ) { }

  setupHandlers(): void {
    // Generate XMP content (no save dialog) and return the string
    ipcMain.handle('generate-xmp-content', async (_event, data: { adjustments: any; include?: any; recipeName?: string }) => {
      try {
        const include = {
          wbBasic: true,
          hsl: true,
          colorGrading: true,
          curves: true,
          pointColor: true,
          grain: true,
          vignette: true,
          masks: true,
          exposure: false,
          sharpenNoise: false,
          strength: data?.include?.strength ?? 1.0,
        } as any;
        if (data?.recipeName) (include as any).recipeName = String(data.recipeName);
        const xmpContent = generateXMPContent(data.adjustments, include);
        return { success: true, content: xmpContent };
      } catch (error) {
        console.error('[IPC] Error generating XMP content:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Handle XMP download - generate XMP and show save dialog
    ipcMain.handle('download-xmp', async (_event, data) => {
      try {
        // Always include all features - use strength slider to control intensity
        const include = {
          wbBasic: true,
          hsl: true,
          colorGrading: true,
          curves: true,
          pointColor: true,
          grain: true,
          masks: true,
          exposure: false, // Keep exposure separate and disabled by default
          sharpenNoise: false, // Not implemented in XMP
          vignette: true, // Enable vignette support
          strength: (data?.include && typeof data.include.strength === 'number') ? data.include.strength : 1.0, // Use strength slider (0-1, default 1.0)
        } as any;

        // Generate XMP content
        // Carry through recipeName so internal XMP uses canonical name
        if (data?.recipeName) (include as any).recipeName = String(data.recipeName);
        const xmpContent = generateXMPContent(data.adjustments, include);

        // Show save dialog
        const presetName = (data?.recipeName as string) || 'Custom Recipe';
        const safeName = presetName
          .replace(/[^A-Za-z0-9 _-]+/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/\s/g, '-');
        const result = await dialog.showSaveDialog({
          title: 'Save XMP Preset',
          defaultPath: `${safeName}.xmp`,
          filters: [
            { name: 'XMP Presets', extensions: ['xmp'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (!result.canceled && result.filePath) {
          // Write the file
          await fs.writeFile(result.filePath, xmpContent, 'utf8');
          return { success: true, filePath: result.filePath };
        } else {
          return { success: false, error: 'Save canceled' };
        }
      } catch (error) {
        console.error('[IPC] Error downloading XMP:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

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
          const results = Array.isArray(process.results) ? process.results : [];
          results.forEach((r, idx) => {
            const adj = r?.metadata?.aiAdjustments;
            if (!adj) return;

            // Always export all available features from AI adjustments
            const include = {
              wbBasic: true,
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
        console.error('[IPC] Error exporting recipe:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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
            cleaned.results = cleaned.results.map(result => {
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
            const results = Array.isArray(recipe.results) ? recipe.results : [];
            results.forEach((r, idx) => {
              const adj = r?.metadata?.aiAdjustments;
              if (!adj) return;
              const include = {
                wbBasic: true,
                hsl: true,
                colorGrading: true,
                curves: true,
                sharpenNoise: true,
                vignette: true,
                pointColor: true,
                grain: true,
                exposure: false,
                masks: false,
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
        console.error('[IPC] Error exporting all recipes:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });


    // Generate camera profile
    ipcMain.handle('generate-camera-profile', async (_event, data) => {
      try {
        const result = await this.imageProcessor.generateCameraProfile(data);
        return result;
      } catch (error) {
        console.error('[IPC] Error generating camera profile:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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
        console.error('[IPC] Error exporting profile:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
  }
}
