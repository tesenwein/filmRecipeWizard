import { dialog, ipcMain } from 'electron';
import * as os from 'os';
import * as path from 'path';
import { DEFAULT_STORAGE_FOLDER, Recipe } from '../../shared/types';
import { StorageService } from '../storage-service';

export class StorageHandlers {
  constructor(private storageService: StorageService) {}

  setupHandlers(): void {
    // Load all recipes
    ipcMain.handle('load-recipes', async () => {
      try {
        const recipes = await this.storageService.loadRecipes();
        return {
          success: true,
          recipes: recipes.map(recipe => ({
            ...recipe,
            // Ensure no absolute paths are exposed in the recipe data
            recipeImageData: recipe.recipeImageData || undefined,
            targetImages: [], // Don't expose temp paths
            baseImages: [], // Don't expose temp paths
          })),
        };
      } catch (error) {
        console.error('[IPC] Error loading recipes:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Save a new process/recipe
    ipcMain.handle(
      'save-process',
      async (_event, data: {
        processId: string;
        baseImages: string[];
        targetImages: string[];
        prompt?: string;
        styleOptions?: any;
        results?: any[];
        status?: string;
      }) => {
        try {
          // Convert the data to Recipe format
          const recipe: Recipe = {
            id: data.processId,
            timestamp: new Date().toISOString(),
            name: `Recipe ${new Date().toLocaleDateString()}`,
            prompt: data.prompt,
            results: data.results || [],
            userOptions: data.styleOptions,
            status: (data.status as 'generating' | 'completed' | 'failed') || 'completed',
          };

          // Convert first base image to base64 if available
          if (data.baseImages.length > 0) {
            const base64Data = await this.storageService.convertImageToBase64(data.baseImages[0]);
            if (base64Data) {
              recipe.recipeImageData = base64Data;
            }
          }

          await this.storageService.addProcess(recipe);
          return { success: true };
        } catch (error) {
          console.error('[IPC] Error saving process:', error);
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      }
    );

    // Update an existing process
    ipcMain.handle(
      'update-process',
      async (_event, processId: string, updates: any) => {
        try {
          await this.storageService.updateProcess(processId, updates);
          return { success: true };
        } catch (error) {
          console.error('[IPC] Error updating process:', error);
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      }
    );

    // Delete a process
    ipcMain.handle('delete-process', async (_event, processId: string) => {
      try {
        await this.storageService.deleteProcess(processId);
        return { success: true };
      } catch (error) {
        console.error('[IPC] Error deleting process:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Get a specific process
    ipcMain.handle('get-process', async (_event, processId: string) => {
      try {
        const process = await this.storageService.getProcess(processId);
        if (!process) {
          return { success: false, error: 'Process not found' };
        }
        return { success: true, process };
      } catch (error) {
        console.error('[IPC] Error getting process:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Get image data URLs for a process
    ipcMain.handle('get-image-data-urls', async (_event, processId: string) => {
      try {
        const process = await this.storageService.getProcess(processId);
        if (!process) {
          return { success: false, error: 'Process not found' };
        }

        // Return the base64 image data that's stored in the process
        const baseImages: string[] = (process as any).recipeImageData 
          ? [(process as any).recipeImageData as string]
          : [];
        
        return {
          success: true,
          baseImages,
          targetImages: [], // Target images aren't persistently stored
        };
      } catch (error) {
        console.error('[IPC] Error getting image data URLs:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Set base image for a process
    ipcMain.handle('set-base-image', async (_event, processId: string, filePath: string) => {
      try {
        if (!processId || !filePath) throw new Error('Invalid arguments');
        
        // Convert image to base64 for storage
        const base64Data = await this.storageService.convertImageToBase64(filePath);
        if (!base64Data) throw new Error('Failed to convert image to base64');
        
        const updates: any = { recipeImageData: base64Data };
        await this.storageService.updateProcess(processId, updates);
        return { success: true };
      } catch (error) {
        console.error('[IPC] Error setting base image:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Add multiple base images
    ipcMain.handle('add-base-images', async (_event, processId: string, filePaths: string[]) => {
      try {
        if (!processId || !filePaths?.length) throw new Error('Invalid arguments');
        
        // For now, just use the first image (limit to 1 base image)
        const firstPath = filePaths[0];
        const base64Data = await this.storageService.convertImageToBase64(firstPath);
        if (!base64Data) throw new Error('Failed to convert image to base64');
        
        const updates: any = { recipeImageData: base64Data };
        await this.storageService.updateProcess(processId, updates);
        return { success: true };
      } catch (error) {
        console.error('[IPC] Error adding base images:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Remove a base/reference image by index
    ipcMain.handle('remove-base-image', async (_event, processId: string, index: number) => {
      try {
        if (!processId || typeof index !== 'number') throw new Error('Invalid arguments');
        const process = await this.storageService.getProcess(processId);
        if (!process) throw new Error('Process not found');
        const existing: string[] = (process as any).recipeImageData
          ? [(process as any).recipeImageData as string]
          : [];
        if (index < 0 || index >= existing.length) throw new Error('Index out of range');
        const next = existing.filter((_, i) => i !== index);
        const updates: any = { recipeImageData: next[0] || undefined };
        await this.storageService.updateProcess(processId, updates);
        return { success: true };
      } catch (error) {
        console.error('[IPC] Error removing base image:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Handle folder selection for storage location
    ipcMain.handle('select-storage-folder', async () => {
      try {
        const result = await dialog.showOpenDialog({
          title: 'Select Recipe Storage Folder',
          properties: ['openDirectory', 'createDirectory'],
          defaultPath: path.join(os.homedir(), DEFAULT_STORAGE_FOLDER),
        });

        if (!result.canceled && result.filePaths.length > 0) {
          return { success: true, path: result.filePaths[0] };
        }
        return { success: false, error: 'Selection canceled' };
      } catch (error) {
        console.error('[IPC] Error selecting storage folder:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Fast clear of all recipes
    ipcMain.handle('clear-recipes', async () => {
      try {
        await this.storageService.clearRecipes();
        return { success: true };
      } catch (error) {
        console.error('[IPC] Error clearing recipes:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
  }
}