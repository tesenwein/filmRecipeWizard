import { dialog, ipcMain } from 'electron';
import * as fs from 'fs/promises';
import { ExportResult, ImportResult } from '../../shared/types';
import { ImageProcessor } from '../image-processor';
import { StorageService } from '../storage-service';
import { generateXMPContent } from '../xmp-generator';

export class ExportHandlers {
  constructor(
    private imageProcessor: ImageProcessor,
    private storageService: StorageService
  ) {}

  setupHandlers(): void {
    // Handle XMP download - generate XMP and show save dialog
    ipcMain.handle('download-xmp', async (_event, data) => {
      try {
        // Generate XMP content
        const xmpContent = generateXMPContent(data.adjustments, data.include);

        // Show save dialog
        // Derive a friendly filename from AI if present
        const sanitizeName = (n: string) =>
          n
            .replace(/\b(image\s*match|imagematch|match|target|base|ai|photo)\b/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        const rawName =
          (data?.adjustments?.preset_name as string | undefined) ||
          `Preset-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
        const clean =
          sanitizeName(rawName) ||
          `Preset-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
        const baseName = clean
          .replace(/[^A-Za-z0-9 _-]+/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/\s/g, '-');
        const safeName = `${baseName}-Preset`;
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

    // Export single recipe
    ipcMain.handle('export-recipe', async (_event, recipeId: string, exportPath?: string): Promise<ExportResult> => {
      try {
        // Get the process/recipe data
        const process = await this.storageService.getProcess(recipeId);
        if (!process) {
          return { success: false, error: 'Recipe not found' };
        }

        // Show save dialog if no export path provided
        let filePath = exportPath;
        if (!filePath) {
          const result = await dialog.showSaveDialog({
            title: 'Save Recipe',
            defaultPath: `${process.name || 'Recipe'}.json`,
            filters: [
              { name: 'JSON Files', extensions: ['json'] },
              { name: 'All Files', extensions: ['*'] },
            ],
          });

          if (result.canceled || !result.filePath) {
            return { success: false, error: 'Save cancelled' };
          }
          filePath = result.filePath;
        }

        // Prepare recipe data for export (remove absolute paths, include base64 data)
        const exportData = {
          id: process.id,
          name: process.name,
          timestamp: process.timestamp,
          prompt: process.prompt,
          userOptions: process.userOptions,
          recipeImageData: process.recipeImageData, // This is base64 data, safe to export
          results: process.results?.map(result => ({
            success: result.success,
            error: result.error,
            metadata: result.metadata,
            // Don't include absolute output paths
          })) || [],
          status: process.status,
        };

        // Export adjustments if available
        const adjustments = process.results?.[0]?.metadata?.aiAdjustments;
        if (adjustments) {
          const include = ['basic', 'color', 'detail', 'effects', 'lens'];
          try {
            const xmp = generateXMPContent(adjustments as any, include);
            (exportData as any).xmpPreset = xmp;
          } catch (error) {
            console.warn('Failed to generate XMP for export:', error);
          }
        }

        // Write file
        await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');

        return { success: true, filePath };
      } catch (error) {
        console.error('[IPC] Error exporting recipe:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Export all recipes
    ipcMain.handle('export-all-recipes', async (_event, exportPath?: string): Promise<ExportResult> => {
      try {
        // Show save dialog if no export path provided
        let filePath = exportPath;
        if (!filePath) {
          const result = await dialog.showSaveDialog({
            title: 'Save All Recipes',
            defaultPath: `Recipes-Export-${new Date().toISOString().slice(0, 10)}.json`,
            filters: [
              { name: 'JSON Files', extensions: ['json'] },
              { name: 'All Files', extensions: ['*'] },
            ],
          });

          if (result.canceled || !result.filePath) {
            return { success: false, error: 'Save cancelled' };
          }
          filePath = result.filePath;
        }

        // Load all recipes
        const recipes = await this.storageService.loadRecipes();

        // Prepare all recipe data for export
        const { app } = await import('electron');
        const exportData = {
          exportTimestamp: new Date().toISOString(),
          version: app.getVersion(),
          recipes: recipes.map(process => {
            const adj = process.results?.[0]?.metadata?.aiAdjustments;
            let xmpPreset;
            if (adj) {
              const include = ['basic', 'color', 'detail', 'effects', 'lens'];
              try {
                const xmp = generateXMPContent(adj as any, include);
                xmpPreset = xmp;
              } catch (error) {
                console.warn('Failed to generate XMP for export:', error);
              }
            }

            return {
              id: process.id,
              name: process.name,
              timestamp: process.timestamp,
              prompt: process.prompt,
              userOptions: process.userOptions,
              recipeImageData: process.recipeImageData, // This is base64 data, safe to export
              results: process.results?.map(result => ({
                success: result.success,
                error: result.error,
                metadata: result.metadata,
                // Don't include absolute output paths
              })) || [],
              status: process.status,
              xmpPreset,
            };
          }),
        };

        // Write file
        await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');

        return { success: true, filePath };
      } catch (error) {
        console.error('[IPC] Error exporting all recipes:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Import recipe
    ipcMain.handle('import-recipe', async (_event, importPath?: string): Promise<ImportResult> => {
      try {
        // Show open dialog if no import path provided
        let filePath = importPath;
        if (!filePath) {
          const result = await dialog.showOpenDialog({
            title: 'Import Recipe',
            filters: [
              { name: 'JSON Files', extensions: ['json'] },
              { name: 'All Files', extensions: ['*'] },
            ],
            properties: ['openFile'],
          });

          if (result.canceled || !result.filePaths.length) {
            return { success: false, error: 'Import cancelled' };
          }
          filePath = result.filePaths[0];
        }

        const content = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(content);

        let importedCount = 0;
        let errors: string[] = [];

        // Handle both single recipe and multiple recipes format
        const recipesToImport = data.recipes ? data.recipes : [data];

        for (const recipeData of recipesToImport) {
          try {
            // Generate new ID to avoid conflicts
            const newId = `recipe_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            
            // Create a new recipe with the imported data
            const newRecipe = {
              id: newId,
              name: recipeData.name || 'Imported Recipe',
              timestamp: new Date().toISOString(),
              prompt: recipeData.prompt || '',
              userOptions: recipeData.userOptions || {},
              recipeImageData: recipeData.recipeImageData, // Base64 data should be preserved
              results: recipeData.results || [],
              status: 'completed' as const,
            };

            // Add to storage
            await this.storageService.addProcess(newRecipe);
            importedCount++;
          } catch (error) {
            errors.push(`Failed to import recipe "${recipeData.name || 'Unknown'}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        if (importedCount === 0) {
          return { success: false, error: `No recipes imported. Errors: ${errors.join('; ')}` };
        }

        const message = importedCount === recipesToImport.length 
          ? `Successfully imported ${importedCount} recipe(s).`
          : `Imported ${importedCount} of ${recipesToImport.length} recipes. Some failed: ${errors.join('; ')}`;

        return { success: true, count: importedCount };
      } catch (error) {
        console.error('[IPC] Error importing recipe:', error);
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
  }
}