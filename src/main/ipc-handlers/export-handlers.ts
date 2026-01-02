import { dialog, ipcMain } from 'electron';
import { createErrorResponse, logError } from '../../shared/error-utils';
import { ExportResult } from '../../shared/types';
import { ImageProcessor } from '../image-processor';
import { SettingsService } from '../settings-service';
import { StorageService } from '../storage-service';
import { generateXMPContent } from '../xmp-generator';
import { generateCaptureOneStyle } from '../capture-one-generator';
import type { ExportType } from '../unified-export-handler';

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

      // Create bulk export format with all-recipes.json
      const bulkData = {
        schema: 'film-recipe-wizard-bulk@1',
        processes: recipes.map(recipe => ({
          id: recipe.id,
          name: recipe.name,
          description: recipe.description,
          timestamp: recipe.timestamp,
          createdAt: recipe.createdAt,
          prompt: recipe.prompt,
          userOptions: recipe.userOptions,
          results: recipe.results,
          recipeImageData: recipe.recipeImageData,
          author: recipe.author,
          userRating: recipe.userRating,
        })),
      };

      // Add all-recipes.json to ZIP
      zip.addFile('all-recipes.json', Buffer.from(JSON.stringify(bulkData, null, 2)));

      // Write ZIP file
      zip.writeZip(saveRes.filePath);

      return { success: true, filePath: saveRes.filePath, count: recipes.length };
    } catch (error) {
      logError('ExportHandlers', 'Error creating recipes ZIP', error);
      return createErrorResponse(error);
    }
  }

  setupHandlers(): void {
    // Note: Individual export handlers removed - now using unified export system
    // The following handlers have been replaced by UnifiedExportHandler:
    // - download-xmp
    // - export-profile
    // - export-preset-to-lightroom
    // - export-profile-to-lightroom
    // - export-style-to-capture-one
    // - generate-capture-one-style
    // - download-capture-one-style
    // - generate-xmp (unused, removed)

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

        // Write recipe.json with embedded base64 images and results
        const recipeData = {
          version: '1.0',
          type: 'film-recipe-wizard-recipe',
          process: cleanedProcess,
          exportedAt: new Date().toISOString(),
        };

        zip.addFile('recipe.json', Buffer.from(JSON.stringify(recipeData, null, 2)));

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

    // Export all recipes to ZIP
    ipcMain.handle('export-all-recipes', async (): Promise<ExportResult> => {
      try {
        const recipes = await this.storageService.loadRecipes();
        if (!recipes || recipes.length === 0) {
          return { success: false, error: 'No recipes found to export' };
        }

        // Add date to filename: All-Recipes-2025-01-15.frw.zip
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const filename = `All-Recipes-${dateStr}.frw.zip`;

        return await this.createRecipesZip(recipes, 'Export All Recipes', filename);
      } catch (error) {
        logError('IPC', 'Error exporting all recipes', error);
        return createErrorResponse(error);
      }
    });

    // Export selected recipes as actual preset/profile/style files in a ZIP
    ipcMain.handle('export-selected-recipes-as-files', async (
      _event,
      recipeIds: string[],
      exportType: ExportType,
      includeMasks: boolean = true
    ): Promise<ExportResult> => {
      try {
        console.log('[ExportHandlers] export-selected-recipes-as-files called with:', { recipeIds, exportType, includeMasks });
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

        // Determine file extension and display name
        const exportConfigs: Record<ExportType, { extension: string; displayName: string }> = {
          'lightroom-preset': { extension: 'xmp', displayName: 'Lightroom Presets' },
          'lightroom-profile': { extension: 'xmp', displayName: 'Lightroom Profiles' },
          'capture-one-style': { extension: 'costyle', displayName: 'Capture One Styles' },
        };

        const config = exportConfigs[exportType];
        if (!config) {
          return { success: false, error: `Unknown export type: ${exportType}` };
        }

        // Show save dialog
        const saveRes = await dialog.showSaveDialog({
          title: `Export Selected Recipes as ${config.displayName}`,
          defaultPath: `Selected-${config.displayName.replace(/\s+/g, '-')}.zip`,
          filters: [
            { name: 'ZIP Files', extensions: ['zip'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (saveRes.canceled || !saveRes.filePath) {
          return { success: false, error: 'Export canceled' };
        }

        // Build ZIP contents
        const AdmZip = require('adm-zip');
        const zip = new AdmZip();

        const settings = await this.settingsService.loadSettings();
        const includeRating = settings.includeRatingInFilename !== false;

        // Process each recipe
        let successCount = 0;
        const errors: string[] = [];

        for (const recipe of recipes) {
          try {
            // Extract adjustments from the first result
            const firstResult = recipe.results?.[0];
            if (!firstResult?.metadata?.aiAdjustments) {
              errors.push(`${recipe.name || recipe.id}: No adjustments found`);
              continue;
            }

            const adjustments = firstResult.metadata.aiAdjustments;
            const recipeName = recipe.name || adjustments.preset_name || `Recipe-${recipe.id}`;
            const userRating = recipe.userRating;

            // Build include options
            const include: any = {
              basic: true,
              hsl: true,
              colorGrading: true,
              curves: true,
              pointColor: true,
              grain: true,
              vignette: true,
              masks: exportType !== 'lightroom-profile' && includeMasks, // Profiles don't support masks
              exposure: false,
              sharpenNoise: false,
            };

            // Generate file content
            let content: string;
            if (exportType === 'lightroom-preset') {
              content = generateXMPContent(adjustments, include);
            } else if (exportType === 'lightroom-profile') {
              const result = await this.imageProcessor.generateCameraProfile({ adjustments, recipeName });
              if (!result.success || !result.xmpContent) {
                errors.push(`${recipeName}: ${result.error || 'Failed to generate profile'}`);
                continue;
              }
              content = result.xmpContent;
            } else if (exportType === 'capture-one-style') {
              content = generateCaptureOneStyle(adjustments, include);
            } else {
              errors.push(`${recipeName}: Unknown export type`);
              continue;
            }

            // Build filename with rating if enabled
            let baseName = recipeName;
            if (includeRating && userRating && userRating >= 1 && userRating <= 5) {
              baseName = `${userRating} - ${baseName}`;
            }

            // Create safe filename
            const safeName = baseName
              .replace(/[^A-Za-z0-9 _-]+/g, '')
              .replace(/\s+/g, ' ')
              .trim()
              .replace(/\s/g, '-');

            // Determine filename based on export type
            let filename: string;
            if (exportType === 'lightroom-profile') {
              filename = `${safeName || 'Custom-Profile'}-Profile.${config.extension}`;
            } else {
              filename = `${safeName || 'Custom-Preset'}.${config.extension}`;
            }

            // Add file to ZIP
            zip.addFile(filename, Buffer.from(content, 'utf8'));
            successCount++;
          } catch (error) {
            const recipeName = recipe.name || recipe.id;
            errors.push(`${recipeName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        if (successCount === 0) {
          return {
            success: false,
            error: `Failed to export any recipes. Errors: ${errors.join('; ')}`,
          };
        }

        // Write ZIP file
        zip.writeZip(saveRes.filePath);

        return {
          success: true,
          filePath: saveRes.filePath,
          count: successCount,
          error: errors.length > 0 ? `Some exports failed: ${errors.join('; ')}` : undefined,
        };
      } catch (error) {
        logError('IPC', 'Error exporting selected recipes as files', error);
        return createErrorResponse(error);
      }
    });
  }
}
