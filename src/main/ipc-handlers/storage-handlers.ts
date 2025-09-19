import { dialog, ipcMain, BrowserWindow } from 'electron';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { AppSettings, DEFAULT_STORAGE_FOLDER, ProcessHistory } from '../../shared/types';
import { ImageProcessor } from '../image-processor';
import { SettingsService } from '../settings-service';
import { StorageService } from '../storage-service';

// Constants
const MAX_TARGET_IMAGES = 3;
const MAX_BASE_IMAGES = 3;

// Type guards and interfaces
interface ProcessDataInput {
  name?: string;
  prompt?: string;
  userOptions?: any;
  results?: any[];
  baseImages?: string[];
  targetImages?: string[];
}

interface ProcessWithAny extends ProcessHistory {
  [key: string]: any;
}

export class StorageHandlers {
  constructor(
    private storageService: StorageService,
    private settingsService?: SettingsService,
    private imageProcessor?: ImageProcessor
  ) { }

  // Helper method to validate process ID format
  private isValidProcessId(processId: string): boolean {
    return typeof processId === 'string' && processId.length > 0 && processId.trim().length > 0;
  }


  // Convert images to base64 with fallback
  private async convertImagesToBase64(filePaths: string[], processId: string, subdir: string): Promise<string[]> {
    const converted: string[] = [];

    for (const filePath of filePaths.slice(0, MAX_TARGET_IMAGES)) {
      try {
        const b64 = await this.storageService.convertImageToBase64(filePath);
        converted.push(b64);
      } catch (error) {
        // Fallback: generate preview and convert to base64
        try {
          if (this.imageProcessor) {
            const previewPath = await this.imageProcessor.generatePreview({
              path: filePath,
              processId,
              subdir,
            } as any);
            const buf = await fs.readFile(previewPath);
            converted.push(buf.toString('base64'));
          } else {
            console.warn(`[IPC] Failed to convert image ${filePath}: No image processor available`);
          }
        } catch (fallbackError) {
          console.warn(`[IPC] Failed to convert image ${filePath}:`, fallbackError);
        }
      }
    }

    return converted;
  }

  // Validate process data input
  private validateProcessData(processData: any): { isValid: boolean; error?: string } {
    if (!processData || typeof processData !== 'object') {
      return { isValid: false, error: 'Invalid process data: must be an object' };
    }

    if (processData.results && !Array.isArray(processData.results)) {
      return { isValid: false, error: 'Invalid process data: results must be an array' };
    }

    return { isValid: true };
  }

  setupHandlers(): void {
    // Load all recipes
    ipcMain.handle('load-recipes', async () => {
      try {
        const [recipes, settings] = await Promise.all([
          this.storageService.loadRecipes(),
          this.settingsService
            ? this.settingsService.loadSettings()
            : Promise.resolve({} as AppSettings),
        ]);
        const author = settings.userProfile;
        let mutated = false;
        const normalized = recipes.map(r => {
          let out: ProcessHistory = r as ProcessHistory;

          // Attach author if missing
          if (!out.author && author) {
            mutated = true;
            out = { ...out, author } as ProcessHistory;
          }

          return out;
        });
        if (mutated && this.settingsService) {
          try {
            await this.storageService.saveRecipes(normalized);
          } catch {
            // Ignore save errors
          }
        }
        return { success: true, recipes: normalized };
      } catch (error) {
        console.error('[IPC] Error loading recipes:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Save a new process/recipe
    ipcMain.handle(
      'save-process',
      async (_event, processData: Omit<ProcessHistory, 'id' | 'timestamp'> & any) => {
        try {
          // Validate input data
          const validation = this.validateProcessData(processData);
          if (!validation.isValid) {
            return { success: false, error: validation.error };
          }

          const processId = this.storageService.generateProcessId();

          // If a reference image (base) was provided, convert the first one to base64 (no fallback)
          let recipeImageData: string | undefined;
          const baseImages: string[] | undefined = Array.isArray((processData as any).baseImages)
            ? (processData as any).baseImages
            : undefined;
          const firstBase = baseImages && baseImages.length > 0 ? baseImages[0] : undefined;
          if (firstBase) {
            try {
              recipeImageData = await this.storageService.convertImageToBase64(firstBase);
            } catch {
              console.warn('[IPC] save-process: convertImageToBase64 failed for recipe image');
            }
          }

          // Prepare target images as base64 for immediate processing only (do not persist)
          const targetImages: string[] | undefined = Array.isArray(
            (processData as ProcessDataInput).targetImages
          )
            ? (processData as ProcessDataInput).targetImages
            : undefined;

          const targetImageDataEphemeral = targetImages && targetImages.length > 0
            ? await this.convertImagesToBase64(targetImages, processId, 'target')
            : [];

          // Load author profile from settings, if available
          let authorProfile: AppSettings['userProfile'] | undefined = undefined;
          try {
            if (this.settingsService) {
              const settings = await this.settingsService.loadSettings();
              authorProfile = settings.userProfile;
            }
          } catch {
            // Ignore settings load errors
          }

          const processDataTyped = processData as ProcessDataInput;
          const process: ProcessHistory = {
            id: processId,
            timestamp: new Date().toISOString(),
            name: processDataTyped?.name,
            prompt: processDataTyped?.prompt,
            userOptions: processDataTyped?.userOptions,
            results: Array.isArray(processDataTyped.results) ? processDataTyped.results : [],
            recipeImageData,
            status: 'generating',
            author: authorProfile,
          } as ProcessHistory;

          await this.storageService.addProcess(process);
          return { success: true, process, targetImageData: targetImageDataEphemeral };
        } catch (error) {
          console.error('[IPC] Error saving process:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }
    );

    // Update an existing process
    ipcMain.handle(
      'update-process',
      async (_event, processId: string, updates: Partial<ProcessHistory>) => {
        try {
          if (!this.isValidProcessId(processId)) {
            return { success: false, error: 'Invalid process ID format' };
          }

          if (!updates || typeof updates !== 'object') {
            return { success: false, error: 'Invalid updates: must be an object' };
          }

          await this.storageService.updateProcess(processId, updates);
          // Notify renderer that a process has been updated (useful for background updates)
          try {
            const payload = { processId, updates };
            for (const win of BrowserWindow.getAllWindows()) {
              try { win.webContents.send('process-updated', payload); } catch { }
            }
          } catch {
            // Ignore IPC send errors
          }
          return { success: true };
        } catch (error) {
          console.error('[IPC] Error updating process:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }
    );

    // Delete a process
    ipcMain.handle('delete-process', async (_event, processId: string) => {
      try {
        if (!this.isValidProcessId(processId)) {
          return { success: false, error: 'Invalid process ID format' };
        }

        await this.storageService.deleteProcess(processId);
        return { success: true };
      } catch (error) {
        console.error('[IPC] Error deleting process:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Delete multiple processes
    ipcMain.handle('delete-multiple-processes', async (_event, processIds: string[]) => {
      try {
        if (!Array.isArray(processIds)) {
          return { success: false, error: 'Process IDs must be an array' };
        }

        // Validate all process IDs
        const invalidIds = processIds.filter(id => !this.isValidProcessId(id));
        if (invalidIds.length > 0) {
          return { success: false, error: `Invalid process ID format: ${invalidIds.join(', ')}` };
        }

        await this.storageService.deleteMultipleProcesses(processIds);
        return { success: true };
      } catch (error) {
        console.error('[IPC] Error deleting multiple processes:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Duplicate a process
    ipcMain.handle('duplicate-process', async (_event, processId: string) => {
      try {
        if (!this.isValidProcessId(processId)) {
          return { success: false, error: 'Invalid process ID' };
        }

        const originalProcess = await this.storageService.getProcess(processId);
        if (!originalProcess) {
          return { success: false, error: 'Process not found' };
        }

        // Create a duplicate with new ID and timestamp
        const newId = this.storageService.generateProcessId();
        const duplicatedProcess: ProcessHistory = {
          ...originalProcess,
          id: newId,
          timestamp: new Date().toISOString(),
          name: originalProcess.name ? `${originalProcess.name} (Copy)` : undefined,
        };

        await this.storageService.addProcess(duplicatedProcess);
        return { success: true, process: duplicatedProcess };
      } catch (error) {
        console.error('[IPC] Error duplicating process:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Get a specific process
    ipcMain.handle('get-process', async (_event, processId: string) => {
      try {
        if (!this.isValidProcessId(processId)) {
          return { success: false, error: 'Invalid process ID format' };
        }

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

    // Get image data URLs for UI display from stored base64 data
    ipcMain.handle('get-image-data-urls', async (_event, processId: string) => {
      try {
        if (!this.isValidProcessId(processId)) {
          return { success: false, error: 'Invalid process ID format' };
        }

        const process = await this.storageService.getProcess(processId);
        if (!process) {
          // Process not found - return empty result instead of throwing error
          console.warn(`[IPC] Process not found for ID: ${processId}`);
          return {
            success: true,
            baseImageUrls: [],
            targetImageUrls: []
          };
        }

        const result: { baseImageUrls: string[]; targetImageUrls: string[] } = {
          baseImageUrls: [],
          targetImageUrls: [],
        };

        if (process.recipeImageData) {
          try {
            result.baseImageUrls = [
              this.storageService.getImageDataUrl(process.recipeImageData),
            ];
          } catch (imageError) {
            console.warn(`[IPC] Error processing image data for process ${processId}:`, imageError);
            result.baseImageUrls = [];
          }
        }

        // Do not persist target images anymore; no target previews returned
        result.targetImageUrls = [];

        return { success: true, ...result };
      } catch (error) {
        console.error('[IPC] Error getting image data URLs:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Set or replace the base image of an existing process (converts to base64 and persists)
    ipcMain.handle('set-base-image', async (_event, processId: string, filePath: string) => {
      try {
        if (!this.isValidProcessId(processId)) {
          return { success: false, error: 'Invalid process ID format' };
        }

        if (!filePath || typeof filePath !== 'string') {
          return { success: false, error: 'Invalid file path' };
        }
        let baseImageData: string | undefined;
        try {
          baseImageData = await this.storageService.convertImageToBase64(filePath);
        } catch (convErr) {
          // Fallback: generate a JPEG preview then base64 it
          try {
            if (this.imageProcessor) {
              const previewPath = await this.imageProcessor.generatePreview({
                path: filePath,
                processId,
                subdir: 'base',
              } as any);
              const buf = await fs.readFile(previewPath);
              baseImageData = buf.toString('base64');
            } else {
              throw convErr instanceof Error ? convErr : new Error('Failed to convert image');
            }
          } catch {
            throw convErr instanceof Error ? convErr : new Error('Failed to convert image');
          }
        }
        await this.storageService.updateProcess(processId, {
          recipeImageData: baseImageData,
        } as any);
        return { success: true };
      } catch (error) {
        console.error('[IPC] Error setting base image:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Add multiple base/reference images (appends and limits to 3)
    ipcMain.handle('add-base-images', async (_event, processId: string, filePaths: string[]) => {
      try {
        if (!this.isValidProcessId(processId)) {
          return { success: false, error: 'Invalid process ID format' };
        }

        if (!Array.isArray(filePaths)) {
          return { success: false, error: 'File paths must be an array' };
        }
        const process = await this.storageService.getProcess(processId);
        if (!process) {
          console.warn(`[IPC] Process not found for ID: ${processId}`);
          return { success: false, error: 'Process not found' };
        }
        const converted = await this.convertImagesToBase64(filePaths, processId, 'base');
        const merged = converted.slice(0, MAX_BASE_IMAGES);
        await this.storageService.updateProcess(processId, { recipeImageData: merged[0] } as any);
        return { success: true, count: merged.length };
      } catch (error) {
        console.error('[IPC] Error adding base images:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Remove a base/reference image by index
    ipcMain.handle('remove-base-image', async (_event, processId: string, index: number) => {
      try {
        if (!this.isValidProcessId(processId)) {
          return { success: false, error: 'Invalid process ID format' };
        }

        if (typeof index !== 'number' || index < 0) {
          return { success: false, error: 'Invalid index: must be a non-negative number' };
        }
        const process = await this.storageService.getProcess(processId);
        if (!process) {
          console.warn(`[IPC] Process not found for ID: ${processId}`);
          return { success: false, error: 'Process not found' };
        }
        const existing: string[] = process.recipeImageData
          ? [process.recipeImageData]
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

    // Clear only pending/generating recipes
    ipcMain.handle('clear-pending-recipes', async () => {
      try {
        await this.storageService.clearPendingRecipes();
        return { success: true };
      } catch (error) {
        console.error('[IPC] Error clearing pending recipes:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
  }
}
