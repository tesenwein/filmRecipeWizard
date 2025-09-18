import { BrowserWindow, dialog, ipcMain, shell } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

export class FileHandlers {
  constructor(private getMainWindow: () => BrowserWindow | null) {}

  setupHandlers(): void {
    // File selection handler
    ipcMain.handle('select-files', async (_event, options) => {
      const mainWindow = this.getMainWindow();
      if (!mainWindow) return [];

      try {
        const result = await dialog.showOpenDialog(mainWindow, {
          title: options.title,
          filters: options.filters,
          properties: options.properties as any,
        });

        if (result.canceled) return [];
        return result.filePaths;
      } catch (error) {
        console.error('[IPC] Error selecting files:', error);
        throw error;
      }
    });

    // Read file content handler
    ipcMain.handle('read-file', async (_event, filePath: string) => {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        return content;
      } catch (error) {
        console.error('[IPC] Error reading file:', error);
        throw error;
      }
    });

    // Open path in system file manager
    ipcMain.handle('open-path', async (_event, path) => {
      try {
        shell.showItemInFolder(path);
        return { success: true };
      } catch (error) {
        console.error('[IPC] Error opening path:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Handle dropped files - save to temp and return paths
    ipcMain.handle('process-dropped-files', async (_event, files: { name: string; data: string }[]) => {
      const { app } = await import('electron');
      try {
        const tempDir = app.getPath('temp');
        const paths: string[] = [];

        for (const file of files) {
          // Create temp file path with timestamp to avoid conflicts
          const timestamp = Date.now() + Math.random().toString(36).substring(7);
          const tempPath = path.join(tempDir, `dropped_${timestamp}_${file.name}`);
          // Decode base64 and save to temp file
          const buffer = Buffer.from(file.data.split(',')[1] || file.data, 'base64');
          await fs.writeFile(tempPath, buffer);
          paths.push(tempPath);
        }

        return paths;
      } catch (error) {
        console.error('[IPC] Error processing dropped files:', error);
        throw error;
      }
    });

    // Handle opening external URLs
    ipcMain.handle('open-external', async (_event, url: string) => {
      try {
        await shell.openExternal(url);
        return { success: true };
      } catch (error) {
        console.error('[IPC] Error opening external URL:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
  }
}