import { BrowserWindow, ipcMain } from 'electron';
import { ImageProcessor } from '../image-processor';
import { StorageService } from '../storage-service';
import { generateLUTContent } from '../lut-generator';

export class ProcessingHandlers {
  constructor(
    private getMainWindow: () => BrowserWindow | null,
    private imageProcessor: ImageProcessor,
    private storageService?: StorageService
  ) {}

  setupHandlers(): void {
    // Generate JPEG preview for UI (handles RAW/HEIC/etc.)
    ipcMain.handle(
      'generate-preview',
      async (_event, args: { path?: string; dataUrl?: string }) => {
        try {
          const result = await this.imageProcessor.generatePreview(args);
          return result;
        } catch (error) {
          console.error('[IPC] Error generating preview:', error);
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      }
    );

    // Handle processing for a single target (one reference + one target)
    ipcMain.handle('process-images', async (_event, data) => {
      const mainWindow = this.getMainWindow();
      if (!mainWindow) return [];

      try {
        // Use the analyzeColorMatch method which is the main processing method
        const result = await this.imageProcessor.analyzeColorMatch(data);
        
        // Return as array to match expected interface
        return [result];
      } catch (error) {
        console.error('[IPC] Error processing images:', error);
        const errMsg = error instanceof Error ? error.message : 'Processing failed';
        // Emit progress with failure status
        try {
          mainWindow.webContents.send('processing-progress', 0, `Failed: ${errMsg}`);
        } catch {
          /* Ignore IPC send errors */
        }
        // Emit completion with failure result
        try {
          mainWindow.webContents.send('processing-complete', [
            { success: false, error: errMsg },
          ]);
        } catch {
          /* Ignore IPC send errors */
        }
        throw error;
      }
    });

    // Process with stored images (for re-processing existing recipes)
    ipcMain.handle(
      'process-with-stored-images',
      async (_event, data: { processId: string; prompt?: string; styleOptions?: any }) => {
        const mainWindow = this.getMainWindow();
        if (!mainWindow) return [];

        try {
          // This handler is for re-processing stored recipes
          // For now, return success but indicate that stored processing is not yet implemented
          return [{
            success: false,
            error: 'Re-processing stored images is not yet implemented'
          }];
        } catch (error) {
          console.error('[IPC] Error processing with stored images:', error);
          const errMsg = error instanceof Error ? error.message : 'Processing failed';
          // Emit progress with failure status
          try {
            const mainWindow = this.getMainWindow();
            mainWindow?.webContents.send('processing-progress', 0, `Failed: ${errMsg}`);
          } catch {
            /* Ignore IPC send errors */
          }
          // Emit completion with failure result
          try {
            const mainWindow = this.getMainWindow();
            mainWindow?.webContents.send('processing-complete', [
              { success: false, error: errMsg },
            ]);
          } catch {
            /* Ignore IPC send errors */
          }
          throw error;
        }
      }
    );

    // Generate LUT from adjustments
    ipcMain.handle('generate-lut', async (_event, data) => {
      try {
        if (!data.adjustments) {
          throw new Error('No adjustments data provided');
        }

        const lutContent = generateLUTContent(data.adjustments);
        if (!lutContent) {
          throw new Error('Failed to generate LUT content');
        }

        return { success: true, content: lutContent };
      } catch (error) {
        console.error('[IPC] Error generating LUT:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Get application version
    ipcMain.handle('get-app-version', async () => {
      try {
        const { app } = await import('electron');
        return { success: true, version: app.getVersion() };
      } catch (error) {
        console.error('[IPC] Error getting app version:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
  }
}