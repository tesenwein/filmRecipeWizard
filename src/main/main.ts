import { app, BrowserWindow, dialog, ipcMain, Menu, MenuItemConstructorOptions, shell } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ImageProcessor } from './image-processor';
import { generateXMPContent } from './xmp-generator';
import { StorageService } from './storage-service';
import { SettingsService, AppSettings } from './settings-service';
import { ProcessHistory } from '../shared/types';

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

    // Handle Lightroom camera profile export - generate profile from adjustments
    ipcMain.handle('export-profile', async (_event, data) => {
      console.log('[IPC] export-profile called with adjustments');
      try {
        // Generate camera profile XMP from adjustments
        const result = await this.imageProcessor.generateCameraProfile(data);

        if (!result.success || !result.xmpContent) {
          return { success: false, error: result.error || 'Failed to generate camera profile' };
        }

        // Use exact same naming logic as preset export
        const sanitizeName = (n: string) =>
          n
            .replace(/\b(image\s*match|imagematch|match|target|base|ai|photo)\b/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        // Get AI-generated name directly from adjustments and add -Profile suffix
        const rawName = (data?.adjustments?.preset_name as string | undefined) || `Preset-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
        const clean = sanitizeName(rawName) || `Preset-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
        const baseName = clean.replace(/[^A-Za-z0-9 _-]+/g, '').replace(/\s+/g, ' ').trim().replace(/\s/g, '-');
        const safeName = `${baseName}-Profile`;

        // Show save dialog
        const dialogOptions = {
          title: 'Save Camera Profile',
          defaultPath: `${safeName}.xmp`,
          filters: [
            { name: 'XMP Profiles', extensions: ['xmp'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        };

        const saveResult = this.mainWindow
          ? await dialog.showSaveDialog(this.mainWindow, dialogOptions)
          : await dialog.showSaveDialog(dialogOptions);

        if (saveResult.canceled || !saveResult.filePath) {
          return { success: false, error: 'Save canceled' };
        }

        // Write the profile to chosen location
        await fs.writeFile(saveResult.filePath, result.xmpContent, 'utf8');
        console.log('[IPC] Camera profile saved to:', saveResult.filePath);

        return { success: true, filePath: saveResult.filePath };
      } catch (error) {
        console.error('[IPC] Error exporting camera profile:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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
        const xmpContent = generateXMPContent(data.adjustments, data.include);
        
        // Show save dialog
        const { dialog } = require('electron');
        // Derive a friendly filename from AI if present
        const sanitizeName = (n: string) =>
          n
            .replace(/\b(image\s*match|imagematch|match|target|base|ai|photo)\b/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        const rawName = (data?.adjustments?.preset_name as string | undefined) || `Preset-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
        const clean = sanitizeName(rawName) || `Preset-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
        const baseName = clean.replace(/[^A-Za-z0-9 _-]+/g, '').replace(/\s+/g, ' ').trim().replace(/\s/g, '-');
        const safeName = `${baseName}-Preset`;
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

    // Generate 3D LUT from AI adjustments
    ipcMain.handle('generate-lut', async (_event, data) => {
      console.log('[IPC] generate-lut called with data', {
        size: data?.size,
        format: data?.format,
        hasAdjustments: !!data?.adjustments,
      });
      try {
        // Generate LUT content
        const lutContent = this.imageProcessor.generateLUTContent(data.adjustments, data.size || 33, data.format || 'cube');

        // Show save dialog
        const { dialog } = require('electron');
        // Derive a friendly filename from AI if present
        const sanitizeName = (n: string) =>
          n
            .replace(/\b(image\s*match|imagematch|match|target|base|ai|photo)\b/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        const rawName = (data?.adjustments?.preset_name as string | undefined) || `LUT-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
        const clean = sanitizeName(rawName) || `LUT-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
        const safeName = clean.replace(/[^A-Za-z0-9 _-]+/g, '').replace(/\s+/g, ' ').trim().replace(/\s/g, '-');
        const ext = data.format === '3dl' ? '3dl' : data.format === 'lut' ? 'lut' : 'cube';
        const result = await dialog.showSaveDialog({
          title: `Save ${data.size}³ ${ext.toUpperCase()} LUT`,
          defaultPath: `${safeName}_${data.size}.${ext}`,
          filters: [
            { name: `${ext.toUpperCase()} Files`, extensions: [ext] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });

        if (!result.canceled && result.filePath) {
          // Write the file
          const fs = require('fs').promises;
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

    // Handle processing with stored base64 data from recipe
    ipcMain.handle('process-with-stored-images', async (
      _event,
      data: { processId: string; targetIndex?: number; baseImageData?: string | string[]; targetImageData?: string[]; prompt?: string }
    ) => {
      console.log('[IPC] process-with-stored-images called with:', {
        processId: data.processId,
        targetIndex: data.targetIndex,
      });

      try {
        // Prefer inline base64 if provided by caller, otherwise load from storage
        const stored = await this.storageService.getProcess(data.processId);
        if (!stored) throw new Error('Process not found');

        const baseImageData = ((): string | string[] | undefined => {
          if (Array.isArray(data.baseImageData)) return data.baseImageData.slice(0, 3);
          if (typeof data.baseImageData === 'string') return data.baseImageData;
          const fromStoredArray = (stored as any).baseImagesData as string[] | undefined;
          if (Array.isArray(fromStoredArray) && fromStoredArray.length) return fromStoredArray.slice(0, 3);
          if (typeof stored.baseImageData === 'string') return stored.baseImageData;
          return undefined;
        })();
        const basePrompt = data.prompt ?? stored.prompt;
        // Build an additional hint from userOptions if present
        const options = (stored as any)?.userOptions || {};
        const optionsHintParts: string[] = [];
        if (typeof options.vibe === 'string' && options.vibe.trim().length > 0) {
          optionsHintParts.push(`Vibe: ${options.vibe.trim()}`);
        }
        const pct = (v?: number) => (typeof v === 'number' ? `${Math.round(v)}/100` : undefined);
        if (options.warmth !== undefined) {
          const w = Math.max(0, Math.min(100, Number(options.warmth)));
          const warmthBias = Math.round(w - 50); // -50 (cool) .. +50 (warm)
          optionsHintParts.push(`White Balance Warmth Bias: ${warmthBias} (negative=cool, positive=warm)`);
        }
        if (options.tint !== undefined) {
          const t = Math.max(-50, Math.min(50, Number(options.tint)));
          optionsHintParts.push(`Tint Bias: ${t} (negative=green, positive=magenta)`);
        }
        if (options.contrast !== undefined) optionsHintParts.push(`Contrast: ${pct(options.contrast)}`);
        if (options.vibrance !== undefined) optionsHintParts.push(`Vibrance: ${pct(options.vibrance)}`);
        if (options.moodiness !== undefined) optionsHintParts.push(`Moodiness: ${pct(options.moodiness)}`);
        if (options.saturationBias !== undefined)
          optionsHintParts.push(`Saturation Bias: ${pct(options.saturationBias)}`);
        if (options.filmGrain !== undefined) optionsHintParts.push(`Film Grain: ${options.filmGrain ? 'On' : 'Off'}`);
        if (options.artistStyle && typeof options.artistStyle.name === 'string') {
          const name = String(options.artistStyle.name).trim();
          const category = String(options.artistStyle.category || '').trim();
          const blurb = String(options.artistStyle.blurb || '').trim();
          optionsHintParts.push(
            `Artist Style: ${name}${category ? ` (${category})` : ''}` + (blurb ? `\nNotes: ${blurb}` : '')
          );
        }
        if (options.filmStyle && typeof options.filmStyle.name === 'string') {
          const name = String(options.filmStyle.name).trim();
          const category = String(options.filmStyle.category || '').trim();
          const blurb = String(options.filmStyle.blurb || '').trim();
          optionsHintParts.push(
            `Film Stock: ${name}${category ? ` (${category})` : ''}` + (blurb ? `\nTraits: ${blurb}` : '')
          );
        }
        const optionsHint = optionsHintParts.length > 0
          ? `\nPreferences:\n- ${optionsHintParts.join('\n- ')}`
          : '';
        // Compose prompt from user text and preferences; fall back to a neutral default
        const prompt = ((basePrompt || '') + optionsHint).trim() || 'Apply natural, balanced color grading with clean contrast and faithful skin tones.';

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
        try { this.mainWindow?.webContents.send('processing-progress', 5, 'Starting analysis...'); } catch { /* Ignore IPC send errors */ }

        // No strict validation: prompt/reference optional; defaults applied in analyzer

        // Create temporary files for processing
        const baseImageTempPath = undefined as unknown as string; // not required when passing base64 directly
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

        try { this.mainWindow?.webContents.send('processing-progress', 100, 'Completed'); } catch { /* Ignore IPC send errors */ }

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
        try { this.mainWindow?.webContents.send('processing-complete', [result]); } catch { /* Ignore IPC send errors */ }

        console.log('[IPC] process-with-stored-images completed:', { success: result.success });
        return result;

      } catch (error) {
        console.error('[IPC] Error processing with stored images:', error);
        // Emit a final failure status so the UI shows immediate feedback
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        try { this.mainWindow?.webContents.send('processing-progress', 100, `Failed: ${errMsg}`); } catch { /* Ignore IPC send errors */ }
        // Emit completion with failure result
        try { this.mainWindow?.webContents.send('processing-complete', [{ success: false, error: errMsg }]); } catch { /* Ignore IPC send errors */ }
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
            // Derive preset/recipe name from AI adjustments if provided
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
        let baseImagesData: string[] = [];
        let targetImageData: string[] = [];

        try {
          // Convert base/reference images to base64 (supports multiple)
          const refPaths: string[] = Array.isArray((processData as any).baseImages)
            ? ((processData as any).baseImages as string[]).slice(0, 3)
            : (processData.baseImage ? [processData.baseImage] : []);
          for (let i = 0; i < refPaths.length; i++) {
            const p = refPaths[i];
            if (!p) continue;
            const b64 = await this.storageService.convertImageToBase64(p);
            if (i === 0) baseImageData = b64; // keep legacy field for backward-compat
            baseImagesData.push(b64);
          }
          if (!refPaths.length) {
            console.warn('[IPC] save-process called without baseImages/baseImage path');
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
          userOptions: (processData as any)?.userOptions,
          results: Array.isArray(processData.results) ? processData.results : [],
          baseImageData,
          baseImagesData: baseImagesData.length ? baseImagesData : undefined,
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

        const result: { baseImageUrls: string[]; targetImageUrls: string[] } = {
          baseImageUrls: [],
          targetImageUrls: [],
        };

        if (Array.isArray((process as any).baseImagesData) && (process as any).baseImagesData.length) {
          result.baseImageUrls = (process as any).baseImagesData
            .slice(0, 3)
            .map((b64: string) => this.storageService.getImageDataUrl(b64));
        } else if (process.baseImageData) {
          result.baseImageUrls = [this.storageService.getImageDataUrl(process.baseImageData)];
        }

        if (process.targetImageData) {
          result.targetImageUrls = process.targetImageData.map(data =>
            this.storageService.getImageDataUrl(data)
          );
        }

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
            const previewPath = await this.imageProcessor.generatePreview({ path: filePath, processId, subdir: 'base' } as any);
            const buf = await fs.readFile(previewPath);
            baseImageData = buf.toString('base64');
          } catch {
            throw convErr instanceof Error ? convErr : new Error('Failed to convert image');
          }
        }
        await this.storageService.updateProcess(processId, { baseImageData } as any);
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
        const existing: string[] = Array.isArray((process as any).baseImagesData)
          ? (process as any).baseImagesData
          : process.baseImageData
          ? [process.baseImageData]
          : [];
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
        await this.storageService.updateProcess(processId, { baseImagesData: merged } as any);
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
        const existing: string[] = Array.isArray((process as any).baseImagesData)
          ? (process as any).baseImagesData
          : process.baseImageData
          ? [process.baseImageData]
          : [];
        if (index < 0 || index >= existing.length) throw new Error('Index out of range');
        const next = existing.filter((_, i) => i !== index);
        const updates: any = { baseImagesData: next.length ? next : undefined };
        // Keep legacy baseImageData aligned to first reference when present
        updates.baseImageData = next[0] || undefined;
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

    // Export a recipe (process) to a ZIP file
    ipcMain.handle('export-recipe', async (_event, processId: string) => {
      try {
        if (!processId) throw new Error('No processId provided');
        const process = await this.storageService.getProcess(processId);
        if (!process) throw new Error('Recipe not found');

        // Suggest a friendly default filename
        const aiName = (process as any)?.results?.[0]?.metadata?.aiAdjustments?.preset_name as string | undefined;
        const rawName = (process.name || aiName || `Recipe-${process.id || 'export'}`).toString();
        const safeName = rawName.replace(/[^A-Za-z0-9 _-]+/g, '').replace(/\s+/g, ' ').trim().replace(/\s/g, '-');

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

        // Also export images as files for convenience
        if (process.baseImageData) {
          const buf = Buffer.from(process.baseImageData, 'base64');
          zip.addFile('images/base.jpg', buf);
        }
        if (Array.isArray(process.targetImageData)) {
          process.targetImageData.forEach((b64, idx) => {
            try {
              const buf = Buffer.from(b64, 'base64');
              zip.addFile(`images/target-${idx + 1}.jpg`, buf);
            } catch {
              // Ignore individual failures
            }
          });
        }

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
            zip.addFile(`presets/${safePreset || `Preset-${idx + 1}`}.xmp`, Buffer.from(xmp, 'utf8'));
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
          properties: ['openFile']
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
          baseImageData: process.baseImageData,
          targetImageData: process.targetImageData,
        } as any;

        await this.storageService.addProcess(imported);
        console.log('[IPC] import-recipe completed:', { id: newId });
        return { success: true, count: 1 };
      } catch (error) {
        console.error('[IPC] Error importing recipe:', error);
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
