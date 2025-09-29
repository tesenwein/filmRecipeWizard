import { dialog, ipcMain } from 'electron';
import { createErrorResponse, logError } from '../../shared/error-utils';
import { ExportResult } from '../../shared/types';
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
    try {
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

      // Add each recipe as a separate file
      for (const recipe of recipes) {
        const recipeData = {
          id: recipe.id,
          name: recipe.name,
          description: recipe.description,
          createdAt: recipe.createdAt,
          results: recipe.results,
        };

        // Add recipe JSON to ZIP
        zip.addFile(`${recipe.name || 'Recipe'}.frw.json`, Buffer.from(JSON.stringify(recipeData, null, 2)));
      }

      // Write ZIP file
      zip.writeZip(saveRes.filePath);

      return { success: true, filePath: saveRes.filePath };
    } catch (error) {
      logError('ExportHandlers', 'Error creating recipes ZIP', error);
      return createErrorResponse(error);
    }
  }

  setupHandlers(): void {
    // Generate XMP content (no save dialog) and return the string
    ipcMain.handle('generate-xmp', async (_event, data) => {
      try {
        const include = {
          basic: data?.include?.basic ?? true,
          hsl: data?.include?.hsl ?? true,
          colorGrading: data?.include?.colorGrading ?? true,
          curves: data?.include?.curves ?? true,
          pointColor: data?.include?.pointColor ?? true,
          grain: data?.include?.grain ?? true,
          masks: data?.include?.masks ?? true,
          exposure: data?.include?.exposure ?? false,
          sharpenNoise: false,
          vignette: data?.include?.vignette ?? true,
        } as any;

        if (data?.recipeName) (include as any).recipeName = String(data.recipeName);
        const xmpContent = generateXMPContent(data.adjustments, include);

        return { success: true, content: xmpContent };
      } catch (error) {
        logError('IPC', 'Error generating XMP content', error);
        return createErrorResponse(error);
      }
    });

    // Note: Individual export handlers removed - now using unified export system
    // The following handlers have been replaced by UnifiedExportHandler:
    // - download-xmp
    // - export-profile
    // - export-preset-to-lightroom  
    // - export-profile-to-lightroom
    // - export-style-to-capture-one
    // - export-basic-style-to-capture-one
    // - generate-capture-one-style
    // - generate-capture-one-basic-style
    // - download-capture-one-style
    // - download-capture-one-basic-style

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
          version: '1.0',
          type: 'film-recipe-wizard-recipe',
          recipe: cleanedProcess,
          exportedAt: new Date().toISOString(),
        };

        zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2)));

        // Add any result images as base64 data URLs
        if (cleanedProcess.results) {
          for (let i = 0; i < cleanedProcess.results.length; i++) {
            const result = cleanedProcess.results[i];
            if ((result as any).base64DataUrl) {
              // Extract base64 data from data URL
              const base64Data = (result as any).base64DataUrl.split(',')[1];
              if (base64Data) {
                zip.addFile(`result-${i}.jpg`, Buffer.from(base64Data, 'base64'));
              }
            }
          }
        }

        // Write ZIP file
        zip.writeZip(saveRes.filePath);

        return { success: true, filePath: saveRes.filePath };
      } catch (error) {
        logError('IPC', 'Error exporting recipe', error);
        return createErrorResponse(error);
      }
    });

    // Export selected recipes to ZIP
    ipcMain.handle('export-selected-recipes', async (_event, recipeIds: string[]): Promise<ExportResult> => {
      try {
        if (!recipeIds || recipeIds.length === 0) {
          return { success: false, error: 'No recipes selected' };
        }

        const recipes = [];
        for (const recipeId of recipeIds) {
          const recipe = await this.storageService.getProcess(recipeId);
          if (recipe) {
            recipes.push(recipe);
          }
        }

        if (recipes.length === 0) {
          return { success: false, error: 'No valid recipes found' };
        }

        return await this.createRecipesZip(recipes, 'Export Selected Recipes', 'Selected-Recipes.frw.zip');
      } catch (error) {
        logError('IPC', 'Error exporting selected recipes', error);
        return createErrorResponse(error);
      }
    });

    // Export all recipes to ZIP
    ipcMain.handle('export-all-recipes', async (): Promise<ExportResult> => {
      try {
        const recipes = await this.storageService.loadRecipes();
        if (!recipes || recipes.length === 0) {
          return { success: false, error: 'No recipes found to export' };
        }

        return await this.createRecipesZip(recipes, 'Export All Recipes', 'All-Recipes.frw.zip');
      } catch (error) {
        logError('IPC', 'Error exporting all recipes', error);
        return createErrorResponse(error);
      }
    });
  }
}
