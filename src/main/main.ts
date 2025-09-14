import { app, BrowserWindow, dialog, ipcMain, Menu, MenuItemConstructorOptions, shell } from 'electron';
import * as path from 'path';
import { ImageProcessor } from './image-processor';
import { StorageService } from './storage-service';
import { SettingsService, AppSettings } from './settings-service';
import { ProcessHistory } from '../shared/types';

class ImageMatchApp {
  private mainWindow: BrowserWindow | null = null;
  private imageProcessor: ImageProcessor;
  private storageService: StorageService;
  private settingsService: SettingsService;

  constructor() {
    this.imageProcessor = new ImageProcessor();
    this.storageService = new StorageService();
    this.settingsService = new SettingsService();
    this.setupApp();
    this.setupIPC();
  }

  private setupApp(): void {
    app.whenReady().then(() => {
      this.createWindow();
      this.createMenu();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      show: false,
    });

    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private createMenu(): void {
    const template: MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Exit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit(),
          },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Window',
        submenu: [{ role: 'minimize' }, { role: 'close' }],
      },
    ];

    if (process.platform === 'darwin') {
      template.unshift({
        label: app.getName(),
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' },
        ],
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }


  private setupIPC(): void {
    // Handle image processing requests
    ipcMain.handle('process-image', async (_event, data) => {
      console.log('[IPC] process-image called with:', { baseImagePath: data?.baseImagePath, targetImagePath: data?.targetImagePath, options: { ...data, baseImagePath: '...', targetImagePath: '...' } });
      try {
        const result = await this.imageProcessor.processImage(data);
        console.log('[IPC] process-image completed:', { success: result.success, outputPath: result.outputPath });
        return result;
      } catch (error) {
        console.error('[IPC] Error processing image:', error);
        throw error;
      }
    });

    // Handle color analysis requests
    ipcMain.handle('analyze-colors', async (_event, imagePath) => {
      console.log('[IPC] analyze-colors called with:', imagePath);
      try {
        const result = await this.imageProcessor.analyzeColors(imagePath);
        console.log('[IPC] analyze-colors completed successfully');
        return result;
      } catch (error) {
        console.error('[IPC] Error analyzing colors:', error);
        throw error;
      }
    });

    // Handle style matching requests
    ipcMain.handle('match-style', async (_event, data) => {
      console.log('[IPC] match-style called with:', { baseImagePath: data?.baseImagePath, targetImagePath: data?.targetImagePath, options: { ...data, baseImagePath: '...', targetImagePath: '...' } });
      try {
        const result = await this.imageProcessor.matchStyle(data);
        console.log('[IPC] match-style completed:', { success: result.success, outputPath: result.outputPath });
        return result;
      } catch (error) {
        console.error('[IPC] Error matching style:', error);
        throw error;
      }
    });

    // Handle preset generation
    ipcMain.handle('generate-preset', async (_event, data) => {
      console.log('[IPC] generate-preset called with data');
      try {
        const result = await this.imageProcessor.generateLightroomPreset(data);
        console.log('[IPC] generate-preset completed:', { success: result.success, outputPath: result.outputPath });
        return result;
      } catch (error) {
        console.error('[IPC] Error generating preset:', error);
        throw error;
      }
    });

    // Handle XMP download - generate XMP and show save dialog
    ipcMain.handle('download-xmp', async (_event, data) => {
      console.log('[IPC] download-xmp called with data', {
        include: data?.include,
        hasAdjustments: !!data?.adjustments,
      });
      try {
        // Generate XMP content
        const xmpContent = this.imageProcessor.generateXMPContent(data.adjustments, data.include);
        
        // Show save dialog
        const { dialog } = require('electron');
        // Derive a friendly filename from AI if present
        const sanitizeName = (n: string) =>
          n
            .replace(/\b(image\s*match|imagematch|match|target|base|ai)\b/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        const rawName = (data?.adjustments?.preset_name as string | undefined) || `Preset-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
        const clean = sanitizeName(rawName) || `Preset-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
        const safeName = clean.replace(/[^A-Za-z0-9 _-]+/g, '').replace(/\s+/g, ' ').trim().replace(/\s/g, '-');
        const result = await dialog.showSaveDialog({
          title: 'Save XMP Preset',
          defaultPath: `${safeName}.xmp`,
          filters: [
            { name: 'XMP Presets', extensions: ['xmp'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });
        
        if (!result.canceled && result.filePath) {
          // Write the file
          const fs = require('fs').promises;
          await fs.writeFile(result.filePath, xmpContent, 'utf8');
          console.log('[IPC] download-xmp completed:', { filePath: result.filePath });
          return { success: true, filePath: result.filePath };
        } else {
          return { success: false, error: 'Save canceled' };
        }
      } catch (error) {
        console.error('[IPC] Error downloading XMP:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Generate JPEG preview for UI (handles RAW/HEIC/etc.)
    ipcMain.handle('generate-preview', async (_event, args: { path?: string; dataUrl?: string }) => {
      try {
        const previewPath = await this.imageProcessor.generatePreview(args);
        return { success: true, previewPath };
      } catch (error) {
        console.error('[IPC] Error generating preview:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Generate adjusted preview with AI changes applied
    ipcMain.handle('generate-adjusted-preview', async (_event, args: { path: string; adjustments: any }) => {
      console.log('[IPC] generate-adjusted-preview called');
      try {
        const previewPath = await this.imageProcessor.generateAdjustedPreview(args);
        return { success: true, previewPath };
      } catch (error) {
        console.error('[IPC] Error generating adjusted preview:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Handle AI color match analysis
    ipcMain.handle('analyze-color-match', async (_event, data) => {
      console.log('[IPC] analyze-color-match called with:', { baseImagePath: data?.baseImagePath, targetImagePath: data?.targetImagePath });
      try {
        const result = await this.imageProcessor.analyzeColorMatch(data);
        console.log('[IPC] analyze-color-match completed:', { success: result.success });
        return result;
      } catch (error) {
        console.error('[IPC] Error analyzing color match:', error);
        throw error;
      }
    });

    // Handle processing with stored base64 data from project
    ipcMain.handle('process-with-stored-images', async (
      _event,
      data: { processId: string; targetIndex?: number; baseImageData?: string; targetImageData?: string[]; prompt?: string }
    ) => {
      console.log('[IPC] process-with-stored-images called with:', {
        processId: data.processId,
        targetIndex: data.targetIndex,
      });

      try {
        // Prefer inline base64 if provided by caller, otherwise load from storage
        const stored = await this.storageService.getProcess(data.processId);
        if (!stored) throw new Error('Process not found');

        const baseImageData = data.baseImageData || stored.baseImageData;
        const prompt = data.prompt ?? stored.prompt;

        // Determine which target image to use
        const targetIndex = data.targetIndex || 0;
        const providedTargets = data.targetImageData || stored.targetImageData || [];
        const targetImageData = providedTargets[targetIndex];

        if (!targetImageData) {
          console.error('[IPC] Missing targetImageData', {
            inlineProvidedCount: Array.isArray(data.targetImageData) ? data.targetImageData.length : 0,
            storedCount: Array.isArray(stored.targetImageData) ? stored.targetImageData.length : 0,
            targetIndex,
          });
          throw new Error(`No target image data found at index ${targetIndex}`);
        }

        // Emit initial progress
        try { this.mainWindow?.webContents.send('processing-progress', 5, 'Starting analysis...'); } catch {}

        // Validate inputs: either a base image or a prompt is required
        if (!baseImageData && (!prompt || String(prompt).trim().length === 0)) {
          const msg = 'Please provide a reference image or a prompt before processing.';
          try { this.mainWindow?.webContents.send('processing-progress', 100, `Failed: ${msg}`); } catch {}
          return { success: false, error: msg } as any;
        }

        // Create temporary files for processing
        const baseImageTempPath = baseImageData
          ? await this.storageService.base64ToTempFile(baseImageData, 'base.jpg')
          : undefined as unknown as string; // optional
        const targetImageTempPath = await this.storageService.base64ToTempFile(targetImageData, 'target.jpg');

        // Process using the image processor
        const result = await this.imageProcessor.matchStyle({
          baseImagePath: baseImageTempPath,
          targetImagePath: targetImageTempPath,
          baseImageBase64: baseImageData,
          targetImageBase64: targetImageData,
          aiAdjustments: undefined,
          prompt,
        });

        try { this.mainWindow?.webContents.send('processing-progress', 100, 'Completed'); } catch {}

        // Persist result
        try {
          await this.storageService.updateProcess(data.processId, {
            results: [{
              inputPath: '',
              outputPath: result.outputPath,
              success: !!result.success,
              error: result.error,
              metadata: result.metadata,
            }]
          } as any);
        } catch (err) {
          console.error('[IPC] process-with-stored-images: failed to persist results', err);
        }

        // Emit completion event in same shape as legacy API
        try { this.mainWindow?.webContents.send('processing-complete', [result]); } catch {}

        console.log('[IPC] process-with-stored-images completed:', { success: result.success });
        return result;

      } catch (error) {
        console.error('[IPC] Error processing with stored images:', error);
        // Emit a final failure status so the UI shows immediate feedback
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        try { this.mainWindow?.webContents.send('processing-progress', 100, `Failed: ${errMsg}`); } catch {}
        // Emit completion with failure result
        try { this.mainWindow?.webContents.send('processing-complete', [{ success: false, error: errMsg }]); } catch {}
        throw error;
      }
    });

    // New React frontend IPC handlers
    ipcMain.handle('select-files', async (_event, options) => {
      if (!this.mainWindow) return [];

      try {
        const result = await dialog.showOpenDialog(this.mainWindow, {
          title: options.title,
          filters: options.filters,
          properties: options.properties as any
        });

        if (result.canceled) return [];
        return result.filePaths;
      } catch (error) {
        console.error('[IPC] Error selecting files:', error);
        throw error;
      }
    });

    ipcMain.handle('open-path', async (_event, path) => {
      try {
        shell.showItemInFolder(path);
        return { success: true };
      } catch (error) {
        console.error('[IPC] Error opening path:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Handle processing for a single target (one reference + one target)
    ipcMain.handle('process-images', async (_event, data) => {
      console.log('[IPC] process-images (single) called with:', {
        baseImagePath: data?.baseImagePath,
        targetImageCount: data?.targetImagePaths?.length,
        hint: data?.hint,
        processId: data?.processId,
      });

      if (!this.mainWindow) return [];

      try {
        const targetPath = Array.isArray(data.targetImagePaths) && data.targetImagePaths.length > 0
          ? data.targetImagePaths[0]
          : undefined;
        if (!targetPath) throw new Error('No target image provided');
        const prompt = (typeof data?.hint === 'string' && data.hint.trim().length > 0)
          ? data.hint.trim()
          : (typeof data?.prompt === 'string' && data.prompt.trim().length > 0)
            ? data.prompt.trim()
            : undefined;

        this.mainWindow.webContents.send('processing-progress', 5, 'Starting analysis...');

        let result: any;
        try {
          result = await this.imageProcessor.matchStyle({
            baseImagePath: data.baseImagePath,
            targetImagePath: targetPath,
            matchColors: true,
            matchBrightness: true,
            matchContrast: true,
            matchSaturation: true,
            prompt,
            ...data.options,
          });
          this.mainWindow.webContents.send('processing-progress', 100, 'Completed');
        } catch (error) {
          console.error('[IPC] Error processing image:', error);
          const errMsg = error instanceof Error ? error.message : 'Unknown error';
          // Emit a final failure status so the UI shows immediate feedback
          try {
            this.mainWindow.webContents.send('processing-progress', 100, `Failed: ${errMsg}`);
          } catch {
            // Ignore IPC send errors
          }
          result = { success: false, error: errMsg };
        }

        const results = [result];

        try {
          if (data?.processId) {
            const persistedResults = [{
              inputPath: targetPath,
              outputPath: result.outputPath,
              success: !!result.success,
              error: result.error,
              metadata: result.metadata,
            }];
            // Derive preset/project name from AI adjustments if provided
            let name: string | undefined;
            try {
              name = result?.metadata?.aiAdjustments?.preset_name;
            } catch {
              // Ignore preset name extraction errors
            }
            await this.storageService.updateProcess(data.processId, { results: persistedResults as any, ...(name ? { name } : {}) });
            console.log('[IPC] process-images: results persisted to process', { id: data.processId, count: 1 });
          } else {
            console.warn('[IPC] process-images: no processId provided; results not persisted automatically');
          }
        } catch (err) {
          console.error('[IPC] process-images: failed to persist results', err);
        }

        this.mainWindow.webContents.send('processing-complete', results);
        return results;
      } catch (error) {
        console.error('[IPC] Error in processing:', error);
        throw error;
      }
    });

    // Storage service IPC handlers
    ipcMain.handle('load-history', async () => {
      try {
        const history = await this.storageService.loadHistory();
        console.log('[IPC] load-history completed:', { count: history.length });
        return { success: true, history };
      } catch (error) {
        console.error('[IPC] Error loading history:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('save-process', async (_event, processData: Omit<ProcessHistory, 'id' | 'timestamp'>) => {
      try {
        const processId = this.storageService.generateProcessId();

        // Convert images to base64 data
        let baseImageData: string | undefined;
        let targetImageData: string[] = [];

        try {
          // Convert base image to base64
          if (processData.baseImage) {
            baseImageData = await this.storageService.convertImageToBase64(processData.baseImage);
            console.log('[IPC] Converted base image to base64', {
              sizeKB: baseImageData ? Math.round(baseImageData.length / 1024) : 0,
            });
          } else {
            console.warn('[IPC] save-process called without baseImage path');
          }

          // Convert target images to base64
          for (let i = 0; i < (processData.targetImages?.length || 0); i++) {
            const targetImage = processData.targetImages![i];
            if (targetImage) {
              const base64Data = await this.storageService.convertImageToBase64(targetImage);
              targetImageData[i] = base64Data;
              console.log(`[IPC] Converted target image ${i} to base64`, {
                sizeKB: Math.round(base64Data.length / 1024),
              });
            }
          }
        } catch (conversionError) {
          console.error('[IPC] Error converting images to base64:', conversionError);
          throw new Error(`Failed to convert images: ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}`);
        }

        const process: ProcessHistory = {
          id: processId,
          timestamp: new Date().toISOString(),
          name: (processData as any)?.name,
          prompt: (processData as any)?.prompt,
          results: Array.isArray(processData.results) ? processData.results : [],
          baseImageData,
          targetImageData,
        } as ProcessHistory;

        // Validate that required images were converted (base image optional when prompt is used)
        if (!Array.isArray(process.targetImageData) || process.targetImageData.length === 0) {
          throw new Error('Target image conversion failed. No target images converted.');
        }

        await this.storageService.addProcess(process);
        console.log('[IPC] save-process completed:', {
          id: process.id,
          baseSet: !!process.baseImageData,
          targetCount: process.targetImageData?.length || 0,
        });
        return { success: true, process };
      } catch (error) {
        console.error('[IPC] Error saving process:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('update-process', async (_event, processId: string, updates: Partial<ProcessHistory>) => {
      try {
        await this.storageService.updateProcess(processId, updates);
        console.log('[IPC] update-process completed:', { id: processId });
        return { success: true };
      } catch (error) {
        console.error('[IPC] Error updating process:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('delete-process', async (_event, processId: string) => {
      try {
        await this.storageService.deleteProcess(processId);
        console.log('[IPC] delete-process completed:', { id: processId });
        return { success: true };
      } catch (error) {
        console.error('[IPC] Error deleting process:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Fetch a single process by id
    ipcMain.handle('get-process', async (_event, processId: string) => {
      try {
        const process = await this.storageService.getProcess(processId);
        return { success: true, process };
      } catch (error) {
        console.error('[IPC] Error getting process:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Get image data URLs for UI display from stored base64 data
    ipcMain.handle('get-image-data-urls', async (_event, processId: string) => {
      try {
        const process = await this.storageService.getProcess(processId);
        if (!process) {
          throw new Error('Process not found');
        }

        const result: { baseImageUrl?: string; targetImageUrls: string[] } = {
          targetImageUrls: []
        };

        if (process.baseImageData) {
          result.baseImageUrl = this.storageService.getImageDataUrl(process.baseImageData);
        }

        if (process.targetImageData) {
          result.targetImageUrls = process.targetImageData.map(data =>
            this.storageService.getImageDataUrl(data)
          );
        }

        console.log('[IPC] get-image-data-urls completed:', {
          processId,
          hasBaseImage: !!result.baseImageUrl,
          targetImageCount: result.targetImageUrls.length
        });
        return { success: true, ...result };
      } catch (error) {
        console.error('[IPC] Error getting image data URLs:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Settings IPC handlers
    ipcMain.handle('get-settings', async () => {
      try {
        const settings = await this.settingsService.loadSettings();
        // Do not log sensitive data
        return { success: true, settings: { ...settings, openaiKey: settings.openaiKey ? '***' : undefined } };
      } catch (error) {
        console.error('[IPC] Error loading settings:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('save-settings', async (_event, partial: Partial<AppSettings>) => {
      try {
        const saved = await this.settingsService.saveSettings(partial);
        if (partial.openaiKey !== undefined) {
          // Update processor with new key (re-init AI analyzer lazily)
          await this.imageProcessor.setOpenAIKey(partial.openaiKey);
        }
        return { success: true, settings: { ...saved, openaiKey: saved.openaiKey ? '***' : undefined } };
      } catch (error) {
        console.error('[IPC] Error saving settings:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
  }
}

// Create and start the application
new ImageMatchApp();
