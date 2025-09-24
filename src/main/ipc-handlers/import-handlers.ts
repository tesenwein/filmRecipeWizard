import { dialog, ipcMain } from 'electron';
import * as fs from 'fs/promises';
import { createErrorResponse, logError } from '../../shared/error-utils';
import { ImportResult } from '../../shared/types';
import { StorageService } from '../storage-service';
import { parseXMPContent } from '../xmp-parser';

export class ImportHandlers {
  constructor(private storageService: StorageService) { }

  setupHandlers(): void {
    // Import recipe(s) from ZIP
    ipcMain.handle('import-recipe', async (): Promise<ImportResult> => {
      try {
        const openRes = await dialog.showOpenDialog({
          title: 'Import Recipe(s) (ZIP)',
          filters: [
            { name: 'ZIP Files', extensions: ['zip'] },
            { name: 'All Files', extensions: ['*'] },
          ],
          properties: ['openFile'],
        });
        if (openRes.canceled || openRes.filePaths.length === 0) {
          return { success: false, error: 'Import canceled' };
        }

        const filePath = openRes.filePaths[0];
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(filePath);

        // Check for bulk export (all-recipes.json) - try both at root and in subdirectories
        let bulkEntry = zip.getEntry('all-recipes.json');

        // If not found at root, search in subdirectories
        if (!bulkEntry) {
          const entries = zip.getEntries();
          for (const entry of entries) {
            if (entry.entryName.endsWith('all-recipes.json')) {
              bulkEntry = entry;
              break;
            }
          }
        }

        if (bulkEntry) {
          // Handle bulk import
          const json = bulkEntry.getData().toString('utf8');
          const parsed = JSON.parse(json);

          if (parsed.schema !== 'film-recipe-wizard-bulk@1' || !Array.isArray(parsed.processes)) {
            throw new Error('Invalid bulk recipe manifest');
          }

          // Import recipes, replacing existing ones if they match
          let importedCount = 0;
          let replacedCount = 0;
          const existingRecipes = await this.storageService.loadRecipes();

          for (const recipe of parsed.processes) {
            if (recipe && Array.isArray(recipe.results)) {
              // Check if a recipe with the same name and timestamp already exists
              const existingRecipe = existingRecipes.find(
                existing => existing.name === recipe.name && existing.timestamp === recipe.timestamp
              );

              if (existingRecipe) {
                // Replace existing recipe
                const updated = {
                  ...existingRecipe,
                  name: recipe.name,
                  prompt: recipe.prompt,
                  description: recipe.description,
                  userOptions: recipe.userOptions,
                  results: recipe.results,
                  recipeImageData: recipe.recipeImageData,
                  author: recipe.author,
                };
                await this.storageService.updateProcess(existingRecipe.id, updated);
                replacedCount++;
              } else {
                // Add new recipe
                const newId = this.storageService.generateProcessId();
                const imported = {
                  id: newId,
                  timestamp: recipe.timestamp || new Date().toISOString(), // Preserve original timestamp
                  name: recipe.name,
                  prompt: recipe.prompt,
                  description: recipe.description,
                  userOptions: recipe.userOptions,
                  results: recipe.results,
                  recipeImageData: recipe.recipeImageData,
                  author: recipe.author,
                };
                await this.storageService.addProcess(imported);
                importedCount++;
              }
            }
          }

          return { success: true, count: importedCount + replacedCount, replaced: replacedCount };
        } else {
          // Handle single recipe import - try both at root and in subdirectories
          let entry = zip.getEntry('recipe.json');

          // If not found at root, search in subdirectories
          if (!entry) {
            const entries = zip.getEntries();
            for (const e of entries) {
              if (e.entryName.endsWith('recipe.json')) {
                entry = e;
                break;
              }
            }
          }

          if (!entry) {
            // Provide more helpful error message
            const entries = zip.getEntries();
            const fileList = entries.map((e: any) => e.entryName).join(', ');
            throw new Error(`Invalid recipe file: neither recipe.json nor all-recipes.json found. ZIP contains: ${fileList}`);
          }

          const json = entry.getData().toString('utf8');
          const parsed = JSON.parse(json);
          const process = parsed?.process;
          if (!process || !Array.isArray(process.results)) {
            throw new Error('Invalid recipe manifest');
          }

          // Check if a recipe with the same name and timestamp already exists
          const existingRecipes = await this.storageService.loadRecipes();
          const existingRecipe = existingRecipes.find(
            existing => existing.name === process.name && existing.timestamp === process.timestamp
          );

          if (existingRecipe) {
            // Replace existing recipe
            const updated = {
              ...existingRecipe,
              name: process.name,
              prompt: process.prompt,
              description: process.description,
              userOptions: process.userOptions,
              results: process.results,
              recipeImageData: process.recipeImageData,
              author: process.author,
            };
            await this.storageService.updateProcess(existingRecipe.id, updated);
            return { success: true, count: 1, replaced: 1 };
          } else {
            // Add new recipe
            const newId = this.storageService.generateProcessId();
            const imported = {
              id: newId,
              timestamp: process.timestamp || new Date().toISOString(), // Preserve original timestamp
              name: process.name,
              prompt: process.prompt,
              description: process.description,
              userOptions: process.userOptions,
              results: process.results,
              recipeImageData: process.recipeImageData,
              author: process.author,
            };
            await this.storageService.addProcess(imported);
            return { success: true, count: 1, replaced: 0 };
          }
        }
      } catch (error) {
        logError('IPC', 'Error importing recipe', error);
        return createErrorResponse(error);
      }
    });

    // Import XMP file to create a recipe
    ipcMain.handle('import-xmp', async (_event, data: { filePath?: string; fileContent?: string; title?: string; description?: string }) => {
      try {
        let xmpPath: string;
        let xmpContent: string;

        if (data.filePath && data.fileContent) {
          // Use provided file path and content
          xmpPath = data.filePath;
          xmpContent = data.fileContent;
        } else {
          // Fallback to file selection dialog
          const result = await dialog.showOpenDialog({
            title: 'Import XMP Preset',
            filters: [
              { name: 'XMP Presets', extensions: ['xmp'] },
              { name: 'All Files', extensions: ['*'] },
            ],
            properties: ['openFile'],
          });

          if (result.canceled || !result.filePaths.length) {
            return { success: false, error: 'Import canceled' };
          }

          xmpPath = result.filePaths[0];
          xmpContent = await fs.readFile(xmpPath, 'utf8');
        }

        // Parse the XMP content
        const parseResult = parseXMPContent(xmpContent);
        if (!parseResult.success) {
          return { success: false, error: parseResult.error || 'Failed to parse XMP file' };
        }

        if (!parseResult.adjustments) {
          return { success: false, error: 'No valid adjustments found in XMP file' };
        }

        // Create a new recipe from the XMP data
        const newId = this.storageService.generateProcessId();
        const recipe = {
          id: newId,
          timestamp: new Date().toISOString(),
          name: data.title || parseResult.presetName || 'Imported XMP Preset',
          prompt: data.description || 'Imported from XMP preset',
          results: [
            {
              success: true,
              outputPath: xmpPath,
              metadata: {
                presetName: parseResult.presetName || 'Imported Preset',
                groupFolder: 'imported-xmp',
                aiAdjustments: parseResult.adjustments,
                sourceType: 'xmp-import',
                originalXmpPath: xmpPath,
                xmpDescription: parseResult.description, // Store XMP description in metadata
              },
            },
          ],
          status: 'completed' as const,
        };

        await this.storageService.addProcess(recipe);
        return { success: true, count: 1 };
      } catch (error) {
        logError('IPC', 'Error importing XMP', error);
        return createErrorResponse(error);
      }
    });
  }
}
