import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  MenuItemConstructorOptions,
  shell,
} from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ProcessHistory, AppSettings } from '../shared/types';
import { ImageProcessor } from './image-processor';
import { SettingsService } from './settings-service';
import { StorageService } from './storage-service';
import { generateXMPContent } from './xmp-generator';
import { generateLUTContent } from './lut-generator';

class FotoRecipeWizardApp {
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
      height: 900,
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





    // Handle XMP download - generate XMP and show save dialog
    ipcMain.handle('download-xmp', async (_event, data) => {
      console.log('[IPC] download-xmp called with data', {
        include: data?.include,
        hasAdjustments: !!data?.adjustments,
      });
      try {
        // Generate XMP content
        const xmpContent = generateXMPContent(data.adjustments, data.include);

        // Show save dialog
        const { dialog } = require('electron');
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
    ipcMain.handle(
      'generate-preview',
      async (_event, args: { path?: string; dataUrl?: string }) => {
        try {
          const previewPath = await this.imageProcessor.generatePreview(args);
          return { success: true, previewPath };
        } catch (error) {
          console.error('[IPC] Error generating preview:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }
    );



    // Handle processing with stored base64 data from recipe
    ipcMain.handle(
      'process-with-stored-images',
      async (
        _event,
        data: {
          processId: string;
          targetIndex?: number;
          baseImageData?: string | string[];
          targetImageData?: string[];
          prompt?: string;
          styleOptions?: any;
        }
      ) => {
        console.log('[IPC] process-with-stored-images called with:', {
          processId: data.processId,
          targetIndex: data.targetIndex,
        });

        try {
          // Prefer inline base64 if provided by caller, otherwise load from storage
          const stored = await this.storageService.getProcess(data.processId);
          if (!stored) throw new Error('Process not found');

          // Only use base image data provided for this run; do not pull stored references
          const baseImageData = ((): string | string[] | undefined => {
            if (Array.isArray(data.baseImageData)) return data.baseImageData.slice(0, 3);
            if (typeof data.baseImageData === 'string') return data.baseImageData;
            return undefined;
          })();
          const basePrompt = data.prompt ?? stored.prompt;
          // Build an additional hint from userOptions if present
          // Use passed styleOptions if provided, otherwise fall back to stored userOptions
          const options = data.styleOptions || (stored as any)?.userOptions || {};
          const optionsHintParts: string[] = [];
          if (typeof options.vibe === 'string' && options.vibe.trim().length > 0) {
            optionsHintParts.push(`Vibe: ${options.vibe.trim()}`);
          }
          const pct = (v?: number) => (typeof v === 'number' ? `${Math.round(v)}/100` : undefined);
          if (options.warmth !== undefined) {
            const w = Math.max(0, Math.min(100, Number(options.warmth)));
            const warmthBias = Math.round(w - 50); // -50 (cool) .. +50 (warm)
            optionsHintParts.push(
              `White Balance Warmth Bias: ${warmthBias} (negative=cool, positive=warm)`
            );
          }
          if (options.tint !== undefined) {
            const t = Math.max(-50, Math.min(50, Number(options.tint)));
            optionsHintParts.push(`Tint Bias: ${t} (negative=green, positive=magenta)`);
          }
          if (options.contrast !== undefined)
            optionsHintParts.push(`Contrast: ${pct(options.contrast)}`);
          if (options.vibrance !== undefined)
            optionsHintParts.push(`Vibrance: ${pct(options.vibrance)}`);
          if (options.moodiness !== undefined)
            optionsHintParts.push(`Moodiness: ${pct(options.moodiness)}`);
          if (options.saturationBias !== undefined)
            optionsHintParts.push(`Saturation Bias: ${pct(options.saturationBias)}`);
          if (options.filmGrain !== undefined)
            optionsHintParts.push(`Film Grain: ${options.filmGrain ? 'On' : 'Off'}`);
          if (options.artistStyle && typeof options.artistStyle.name === 'string') {
            const name = String(options.artistStyle.name).trim();
            const category = String(options.artistStyle.category || '').trim();
            const blurb = String(options.artistStyle.blurb || '').trim();
            optionsHintParts.push(
              `Artist Style: ${name}${category ? ` (${category})` : ''}` +
                (blurb ? `\nNotes: ${blurb}` : '')
            );
          }
          if (options.filmStyle && typeof options.filmStyle.name === 'string') {
            const name = String(options.filmStyle.name).trim();
            const category = String(options.filmStyle.category || '').trim();
            const blurb = String(options.filmStyle.blurb || '').trim();
            optionsHintParts.push(
              `Film Stock: ${name}${category ? ` (${category})` : ''}` +
                (blurb ? `\nTraits: ${blurb}` : '')
            );
          }
          const optionsHint =
            optionsHintParts.length > 0 ? `\nPreferences:\n- ${optionsHintParts.join('\n- ')}` : '';
          // Compose prompt from user text and preferences; fall back to a neutral default
          const prompt =
            ((basePrompt || '') + optionsHint).trim() ||
            'Apply natural, balanced color grading with clean contrast and faithful skin tones.';

          // Determine which target image to use (for processing, not storage)
          const targetIndex = data.targetIndex || 0;
          const providedTargets = data.targetImageData || [];
          const targetImageData = providedTargets[targetIndex];

          if (!targetImageData) {
            console.error('[IPC] Missing targetImageData', {
              inlineProvidedCount: Array.isArray(data.targetImageData)
                ? data.targetImageData.length
                : 0,
              targetIndex,
            });
            throw new Error(`No target image data found at index ${targetIndex}`);
          }

          // Emit initial progress
          try {
            this.mainWindow?.webContents.send('processing-progress', 5, 'Starting analysis...');
          } catch {
            /* Ignore IPC send errors */
          }

          // No strict validation: prompt/reference optional; defaults applied in analyzer

          // Create temporary files for processing
          const baseImageTempPath = undefined as unknown as string; // not required when passing base64 directly
          const targetImageTempPath = await this.storageService.base64ToTempFile(
            targetImageData,
            'target.jpg'
          );

          // Process using the image processor
          const result = await this.imageProcessor.matchStyle({
            baseImagePath: baseImageTempPath,
            targetImagePath: targetImageTempPath,
            baseImageBase64: baseImageData,
            targetImageBase64: targetImageData,
            aiAdjustments: undefined,
            prompt,
            styleOptions: options,
          });

          try {
            this.mainWindow?.webContents.send('processing-progress', 100, 'Completed');
          } catch {
            /* Ignore IPC send errors */
          }

          // Persist result
          try {
            const firstBase = Array.isArray(baseImageData) ? baseImageData[0] : baseImageData;
            await this.storageService.updateProcess(data.processId, {
              results: [
                {
                  inputPath: '',
                  outputPath: result.outputPath,
                  success: !!result.success,
                  error: result.error,
                  metadata: result.metadata,
                },
              ],
              ...(firstBase ? { recipeImageData: firstBase } : {}),
            } as any);
          } catch (err) {
            console.error('[IPC] process-with-stored-images: failed to persist results', err);
          }

          // Emit completion event in same shape as legacy API
          try {
            this.mainWindow?.webContents.send('processing-complete', [result]);
          } catch {
            /* Ignore IPC send errors */
          }

          console.log('[IPC] process-with-stored-images completed:', { success: result.success });
          return result;
        } catch (error) {
          console.error('[IPC] Error processing with stored images:', error);
          // Emit a final failure status so the UI shows immediate feedback
          const errMsg = error instanceof Error ? error.message : 'Unknown error';
          try {
            this.mainWindow?.webContents.send('processing-progress', 100, `Failed: ${errMsg}`);
          } catch {
            /* Ignore IPC send errors */
          }
          // Emit completion with failure result
          try {
            this.mainWindow?.webContents.send('processing-complete', [
              { success: false, error: errMsg },
            ]);
          } catch {
            /* Ignore IPC send errors */
          }
          throw error;
        }
      }
    );

    // New React frontend IPC handlers
    ipcMain.handle('select-files', async (_event, options) => {
      if (!this.mainWindow) return [];

      try {
        const result = await dialog.showOpenDialog(this.mainWindow, {
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
        const targetPath =
          Array.isArray(data.targetImagePaths) && data.targetImagePaths.length > 0
            ? data.targetImagePaths[0]
            : undefined;
        if (!targetPath) throw new Error('No target image provided');
        const prompt =
          typeof data?.hint === 'string' && data.hint.trim().length > 0
            ? data.hint.trim()
            : typeof data?.prompt === 'string' && data.prompt.trim().length > 0
            ? data.prompt.trim()
            : undefined;

        this.mainWindow.webContents.send('processing-progress', 5, 'Analyzing...');

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
            const persistedResults = [
              {
                inputPath: targetPath,
                outputPath: result.outputPath,
                success: !!result.success,
                error: result.error,
                metadata: result.metadata,
              },
            ];
            // Derive preset/recipe name from AI adjustments if provided
            let name: string | undefined;
            try {
              name = result?.metadata?.aiAdjustments?.preset_name;
            } catch {
              // Ignore preset name extraction errors
            }
            await this.storageService.updateProcess(data.processId, {
              results: persistedResults as any,
              ...(name ? { name } : {}),
            });
            console.log('[IPC] process-images: results persisted to process', {
              id: data.processId,
              count: 1,
            });
          } else {
            console.warn(
              '[IPC] process-images: no processId provided; results not persisted automatically'
            );
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

    ipcMain.handle(
      'save-process',
      async (_event, processData: Omit<ProcessHistory, 'id' | 'timestamp'> & any) => {
        try {
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
          let targetImageDataEphemeral: string[] = [];
          const targetImages: string[] | undefined = Array.isArray((processData as any).targetImages)
            ? (processData as any).targetImages
            : undefined;
          if (targetImages && targetImages.length > 0) {
            for (const t of targetImages.slice(0, 3)) {
              try {
                const b64 = await this.storageService.convertImageToBase64(t);
                targetImageDataEphemeral.push(b64);
                continue;
              } catch {
                // Fallback only for targets: generate a JPEG preview and base64 it
              }
              try {
                const previewPath = await this.imageProcessor.generatePreview({
                  path: t,
                  processId,
                  subdir: 'target',
                } as any);
                const buf = await fs.readFile(previewPath);
                targetImageDataEphemeral.push(buf.toString('base64'));
              } catch {
                console.warn('[IPC] save-process: failed to prepare target image');
              }
            }
          }

          const process: ProcessHistory = {
            id: processId,
            timestamp: new Date().toISOString(),
            name: (processData as any)?.name,
            prompt: (processData as any)?.prompt,
            userOptions: (processData as any)?.userOptions,
            results: Array.isArray(processData.results) ? processData.results : [],
            recipeImageData,
          } as ProcessHistory;

          await this.storageService.addProcess(process);
          console.log('[IPC] save-process completed:', {
            id: process.id,
            hasRecipeImage: !!recipeImageData,
            targetCount: targetImageDataEphemeral.length,
          });
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

    ipcMain.handle(
      'update-process',
      async (_event, processId: string, updates: Partial<ProcessHistory>) => {
        try {
          await this.storageService.updateProcess(processId, updates);
          console.log('[IPC] update-process completed:', { id: processId });
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

        const result: { baseImageUrls: string[]; targetImageUrls: string[] } = {
          baseImageUrls: [],
          targetImageUrls: [],
        };

        if ((process as any).recipeImageData) {
          result.baseImageUrls = [
            this.storageService.getImageDataUrl((process as any).recipeImageData as string),
          ];
        }

        // Do not persist target images anymore; no target previews returned
        result.targetImageUrls = [];

        console.log('[IPC] get-image-data-urls completed:', {
          processId,
          baseCount: result.baseImageUrls.length,
          targetImageCount: result.targetImageUrls.length,
        });
        return { success: true, ...result };
      } catch (error) {
        console.error('[IPC] Error getting image data URLs:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Set or replace the base image of an existing process (converts to base64 and persists)
    ipcMain.handle('set-base-image', async (_event, processId: string, filePath: string) => {
      try {
        if (!processId || !filePath) throw new Error('Invalid arguments');
        let baseImageData: string | undefined;
        try {
          baseImageData = await this.storageService.convertImageToBase64(filePath);
        } catch (convErr) {
          // Fallback: generate a JPEG preview then base64 it
          try {
            const previewPath = await this.imageProcessor.generatePreview({
              path: filePath,
              processId,
              subdir: 'base',
            } as any);
            const buf = await fs.readFile(previewPath);
            baseImageData = buf.toString('base64');
          } catch {
            throw convErr instanceof Error ? convErr : new Error('Failed to convert image');
          }
        }
        await this.storageService.updateProcess(processId, { recipeImageData: baseImageData } as any);
        return { success: true };
      } catch (error) {
        console.error('[IPC] Error setting base image:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Add multiple base/reference images (appends and limits to 3)
    ipcMain.handle('add-base-images', async (_event, processId: string, filePaths: string[]) => {
      try {
        if (!processId || !Array.isArray(filePaths)) throw new Error('Invalid arguments');
        const process = await this.storageService.getProcess(processId);
        if (!process) throw new Error('Process not found');
        const existing: string[] = [];
        const converted: string[] = [];
        for (const fp of filePaths.slice(0, 3)) {
          try {
            const b64 = await this.storageService.convertImageToBase64(fp);
            converted.push(b64);
          } catch (e) {
            console.warn('[IPC] add-base-images: convert failed for', fp, e);
          }
        }
        const merged = [...existing, ...converted].slice(0, 3);
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

    // Settings IPC handlers
    ipcMain.handle('get-settings', async () => {
      try {
        const settings = await this.settingsService.loadSettings();
        // Do not log sensitive data
        return {
          success: true,
          settings: { ...settings, openaiKey: settings.openaiKey ? '***' : undefined },
        };
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
        return {
          success: true,
          settings: { ...saved, openaiKey: saved.openaiKey ? '***' : undefined },
        };
      } catch (error) {
        console.error('[IPC] Error saving settings:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Export a recipe (process) to a ZIP file
    ipcMain.handle('export-recipe', async (_event, processId: string) => {
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
            { name: 'Foto Recipe Wizard Zip', extensions: ['zip'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });
        if (saveRes.canceled || !saveRes.filePath) {
          return { success: false, error: 'Export canceled' };
        }

        // Build ZIP contents
        const AdmZip = require('adm-zip');
        const zip = new AdmZip();

        // Write manifest with embedded base64 images and results
        const manifest = {
          schema: 'foto-recipe-wizard@1',
          exportedAt: new Date().toISOString(),
          process: process,
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
            const xmp = generateXMPContent(adj as any, include);
            const name = (adj as any)?.preset_name as string | undefined;
            const safePreset = (name || `Preset-${idx + 1}`)
              .replace(/[^A-Za-z0-9 _-]+/g, '')
              .replace(/\s+/g, ' ')
              .trim()
              .replace(/\s/g, '-');
            zip.addFile(
              `presets/${safePreset || `Preset-${idx + 1}`}.xmp`,
              Buffer.from(xmp, 'utf8')
            );
          });
        } catch (e) {
          console.warn('[IPC] export-recipe: failed to add XMP presets:', e);
        }

        // Write out the zip
        zip.writeZip(saveRes.filePath);
        console.log('[IPC] export-recipe completed:', { filePath: saveRes.filePath });
        return { success: true, filePath: saveRes.filePath };
      } catch (error) {
        console.error('[IPC] Error exporting recipe:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Import a recipe ZIP and add to history
    ipcMain.handle('import-recipe', async () => {
      try {
        const openRes = await dialog.showOpenDialog({
          title: 'Import Recipe (ZIP)',
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
        const entry = zip.getEntry('recipe.json');
        if (!entry) throw new Error('Invalid recipe file: recipe.json not found');
        const json = entry.getData().toString('utf8');
        const parsed = JSON.parse(json);
        const process = parsed?.process;
        if (!process || !Array.isArray(process.results)) {
          throw new Error('Invalid recipe manifest');
        }

        // Normalize and assign a new id/timestamp to avoid collisions
        const newId = this.storageService.generateProcessId();
        const imported = {
          id: newId,
          timestamp: new Date().toISOString(),
          name: process.name,
          prompt: process.prompt,
          userOptions: process.userOptions,
          results: process.results,
          // Note: baseImageData and targetImageData are no longer stored
        } as any;

        await this.storageService.addProcess(imported);
        console.log('[IPC] import-recipe completed:', { id: newId });
        return { success: true, count: 1 };
      } catch (error) {
        console.error('[IPC] Error importing recipe:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Handle LUT generation and download
    ipcMain.handle('generate-lut', async (_event, data) => {
      console.log('[IPC] generate-lut called with data', {
        size: data?.size,
        format: data?.format,
        strength: data?.strength,
        hasAdjustments: !!data?.adjustments,
      });
      try {
        // Apply strength multiplier to adjustments if provided
        let adjustments = data.adjustments;
        console.log('[IPC] Original adjustments:', adjustments);
        console.log('[IPC] Strength parameter:', data.strength);

        if (data.strength !== undefined && data.strength !== 1.0) {
          // Create a copy of adjustments with strength applied
          adjustments = { ...data.adjustments };
          console.log('[IPC] Applying strength:', data.strength);

          // Apply strength to numeric adjustment values
          const numericFields = [
            'exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks',
            'vibrance', 'saturation', 'clarity', 'temperature', 'tint',
            // HSL hue/sat/lum (Lightroom scale -100..100)
            'hue_red','hue_orange','hue_yellow','hue_green','hue_aqua','hue_blue','hue_purple','hue_magenta',
            'sat_red','sat_orange','sat_yellow','sat_green','sat_aqua','sat_blue','sat_purple','sat_magenta',
            'lum_red','lum_orange','lum_yellow','lum_green','lum_aqua','lum_blue','lum_purple','lum_magenta',
            // Color grading saturations and luminances (0..100 or -100..100)
            'color_grade_shadow_sat','color_grade_shadow_lum',
            'color_grade_midtone_sat','color_grade_midtone_lum',
            'color_grade_highlight_sat','color_grade_highlight_lum',
            'color_grade_global_sat','color_grade_global_lum',
            // Balance is an amount (-100..100) we scale toward 0
            'color_grade_balance'
          ];

          // Hues in color grading are angles (0..360) and should NOT be scaled; leave as-is

          for (const field of numericFields) {
            if (typeof adjustments[field] === 'number') {
              if (field === 'temperature') {
                // Temperature: apply strength to deviation from 6500K
                const neutral = 6500;
                const deviation = adjustments[field] - neutral;
                adjustments[field] = neutral + (deviation * data.strength);
              } else if (field.startsWith('hue_')) {
                // HSL hue shifts: scale toward 0
                adjustments[field] = adjustments[field] * data.strength;
              } else {
                // Other fields: apply strength directly
                adjustments[field] = adjustments[field] * data.strength;
              }
            }
          }
          console.log('[IPC] Adjustments after strength applied:', adjustments);
        } else {
          console.log('[IPC] No strength adjustment applied');
        }

        // Generate LUT content
        const lutContent = generateLUTContent(adjustments, data.size, data.format);

        // Show save dialog
        const sanitizeName = (n: string) =>
          n
            .replace(/\b(image\s*match|imagematch|match|target|base|ai|photo)\b/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        const rawName =
          (data?.adjustments?.preset_name as string | undefined) ||
          `LUT-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
        const clean =
          sanitizeName(rawName) ||
          `LUT-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
        const baseName = clean
          .replace(/[^A-Za-z0-9 _-]+/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/\s/g, '-');
        const strengthSuffix = data.strength !== undefined && data.strength !== 1.0
          ? `-${Math.round(data.strength * 100)}pct`
          : '';
        const safeName = `${baseName}-LUT-${data.size}${strengthSuffix}`;

        const result = await dialog.showSaveDialog({
          title: 'Save LUT File',
          defaultPath: `${safeName}.${data.format}`,
          filters: [
            { name: 'LUT Files', extensions: [data.format] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (!result.canceled && result.filePath) {
          // Write the file
          await fs.writeFile(result.filePath, lutContent, 'utf8');
          console.log('[IPC] generate-lut completed:', { filePath: result.filePath });
          return { success: true, filePath: result.filePath };
        } else {
          return { success: false, error: 'Save canceled' };
        }
      } catch (error) {
        console.error('[IPC] Error generating LUT:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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

// Create and start the application
new FotoRecipeWizardApp();
