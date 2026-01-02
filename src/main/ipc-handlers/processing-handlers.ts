import { BrowserWindow, dialog, ipcMain } from 'electron';
import * as fs from 'fs/promises';
import { createErrorResponse, logError } from '../../shared/error-utils';
import { ImageProcessor } from '../image-processor';
import { generateLUTContent } from '../lut-generator';
import { StorageService } from '../storage-service';

export class ProcessingHandlers {
  constructor(
    private getMainWindow: () => BrowserWindow | null,
    private imageProcessor: ImageProcessor,
    private storageService?: StorageService
  ) { }

  setupHandlers(): void {
    // Generate JPEG preview for UI (handles RAW/HEIC/etc.)
    ipcMain.handle(
      'generate-preview',
      async (_event, args: { path?: string; dataUrl?: string }) => {
        try {
          const result = await this.imageProcessor.generatePreview(args);
          return result;
        } catch (error) {
          logError('IPC', 'Error generating preview', error);
          return createErrorResponse(error);
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
          baseImageData?: string | string[];
          prompt?: string;
          styleOptions?: any;
        }
      ) => {
        const mainWindow = this.getMainWindow();
        if (!mainWindow || !this.storageService) return [];

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
          if (options.contrast !== undefined)
            optionsHintParts.push(`Contrast: ${pct(options.contrast)}`);
          if (options.vibrance !== undefined)
            optionsHintParts.push(`Vibrance: ${pct(options.vibrance)}`);
          if (options.saturationBias !== undefined)
            optionsHintParts.push(`Saturation Bias: ${pct(options.saturationBias)}`);
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
          
          // Add style categories
          const styleCategories = options.styleCategories || (options.vibe ? [options.vibe] : []);
          if (styleCategories.length > 0) {
            optionsHintParts.push(`Style Categories: ${styleCategories.join(', ')}`);
          }
          
          // Add soft parameters
          if (options.moodiness !== undefined)
            optionsHintParts.push(`Moodiness: ${pct(options.moodiness)} (0=neutral, 100=very moody/dramatic)`);
          if (options.warmth !== undefined)
            optionsHintParts.push(`Warmth: ${pct(options.warmth)} (0=cool, 100=warm)`);
          if (options.coolness !== undefined)
            optionsHintParts.push(`Coolness: ${pct(options.coolness)} (0=warm, 100=cool)`);
          if (options.drama !== undefined)
            optionsHintParts.push(`Drama: ${pct(options.drama)} (0=subtle, 100=high drama)`);
          if (options.softness !== undefined)
            optionsHintParts.push(`Softness: ${pct(options.softness)} (0=sharp/harsh, 100=very soft/dreamy)`);
          if (options.intensity !== undefined)
            optionsHintParts.push(`Intensity: ${pct(options.intensity)} (0=muted, 100=high intensity)`);
          if (options.vintage !== undefined)
            optionsHintParts.push(`Vintage: ${pct(options.vintage)} (0=modern, 100=very vintage)`);
          if (options.cinematic !== undefined)
            optionsHintParts.push(`Cinematic: ${pct(options.cinematic)} (0=documentary, 100=very cinematic)`);
          if (options.faded !== undefined)
            optionsHintParts.push(`Faded: ${pct(options.faded)} (0=vibrant, 100=very faded/washed out)`);
            
          const optionsHint =
            optionsHintParts.length > 0 ? `\nPreferences:\n- ${optionsHintParts.join('\n- ')}` : '';

          // Compose prompt from user text and preferences; create detailed prompts for artist-only cases
          let prompt = (basePrompt || '').trim();

          if (!prompt && optionsHintParts.length > 0) {
            // No user prompt provided, but we have style preferences - create a detailed prompt
            const hasArtist = options.artistStyle && typeof options.artistStyle.name === 'string';
            const hasFilm = options.filmStyle && typeof options.filmStyle.name === 'string';

            if (hasArtist && hasFilm) {
              prompt = `Create a color grading recipe combining ${options.artistStyle.name} style with ${options.filmStyle.name} film look.`;
            } else if (hasArtist) {
              prompt = `Create a color grading recipe inspired by ${options.artistStyle.name} style.`;
            } else if (hasFilm) {
              prompt = `Create a color grading recipe emulating ${options.filmStyle.name} film stock.`;
            }
          }

          // Fall back to neutral default only if no prompt was created
          prompt = (prompt + optionsHint).trim() ||
            'Apply natural, balanced color grading with clean contrast and faithful skin tones.';

          // Emit initial progress
          try {
            mainWindow?.webContents.send('processing-progress', 5, 'Starting AI analysis...');
          } catch {
            /* Ignore IPC send errors */
          }

          // Process using the image processor
          let result;

          const startTime = Date.now();
          try {
            result = await this.imageProcessor.matchStyle({
              baseImagePath: undefined,
              targetImagePath: '', // No target image needed
              baseImageBase64: baseImageData,
              targetImageBase64: undefined,
              aiAdjustments: undefined,
              prompt,
              styleOptions: options,
            });
          } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[IPC] Image processor failed after ${duration}ms:`, error);
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown processing error';
            result = {
              success: false,
              error: errorMessage,
              outputPath: '',
              metadata: null,
            };
          }

          try {
            mainWindow?.webContents.send('processing-progress', 100, 'Completed');
          } catch {
            /* Ignore IPC send errors */
          }

          // Persist result (without absolute paths)
          try {
            const firstBase = Array.isArray(baseImageData) ? baseImageData[0] : baseImageData;

            // Extract AI-generated recipe name and description from the result
            const aiGeneratedName = result.metadata?.aiAdjustments?.preset_name;
            const aiGeneratedDescription = result.metadata?.aiAdjustments?.description;
            // Only allow AI to set a name when no explicit name exists on the recipe
            let shouldUpdateName = result.success &&
              aiGeneratedName &&
              typeof aiGeneratedName === 'string' &&
              aiGeneratedName.trim().length > 0 &&
              aiGeneratedName !== 'Custom Recipe';
            try {
              const existing = await this.storageService.getProcess(data.processId);
              const hasUserName = existing && typeof (existing as any).name === 'string' && (existing as any).name.trim().length > 0;
              if (hasUserName) shouldUpdateName = false;
            } catch { /* ignore */ }
            const shouldUpdateDescription = result.success && 
              aiGeneratedDescription && 
              typeof aiGeneratedDescription === 'string' && 
              aiGeneratedDescription.trim().length > 0;

            // If we have adjustments, store them
            let effectiveAdjustments: any | undefined;
            try {
              let adj = result?.metadata?.aiAdjustments;
              if (result.success && adj) {
                effectiveAdjustments = { ...adj };
                // Filter out masks if includeMasks is false (default is false)
                const includeMasks = options?.includeMasks === true;
                if (!includeMasks && effectiveAdjustments.masks) {
                  effectiveAdjustments.masks = [];
                }
              }
            } catch (e) {
              console.warn('[IPC] Adjustments processing failed:', e);
            }

            await this.storageService.updateProcess(data.processId, {
              results: [
                {
                  success: !!result.success,
                  error: result.error,
                  metadata: effectiveAdjustments
                    ? { ...(result.metadata || {}), aiAdjustments: effectiveAdjustments }
                    : result.metadata,
                },
              ],
              status: result.success ? 'completed' : 'failed',
              ...(firstBase ? { recipeImageData: firstBase } : {}),
              ...(shouldUpdateName && aiGeneratedName ? { name: aiGeneratedName.trim() } : {}),
              ...(shouldUpdateDescription ? { description: aiGeneratedDescription.trim() } : {}),
            } as any);
            try {
              mainWindow?.webContents.send('process-updated', {
                processId: data.processId,
                updates: {
                  results: [
                    {
                      inputPath: '',
                      outputPath: result.outputPath,
                      success: !!result.success,
                      error: result.error,
                      metadata: effectiveAdjustments
                        ? { ...(result.metadata || {}), aiAdjustments: effectiveAdjustments }
                        : result.metadata,
                    },
                  ],
                  status: result.success ? 'completed' : 'failed',
                  ...(firstBase ? { recipeImageData: firstBase } : {}),
                  ...(shouldUpdateName && aiGeneratedName ? { name: aiGeneratedName.trim() } : {}),
                  ...(shouldUpdateDescription ? { description: aiGeneratedDescription.trim() } : {}),
                },
              });
            } catch {
              // Ignore IPC send errors
            }
          } catch (err) {
            console.error('[IPC] process-with-stored-images: failed to persist results', err);
          }

          // Emit completion event
          try {
            mainWindow?.webContents.send('processing-complete', [result]);
          } catch (error) {
            console.error('[IPC] Failed to send processing-complete event:', error);
          }

          return result;
        } catch (error) {
          console.error('[IPC] Error processing with stored images:', error);
          // Emit a final failure status so the UI shows immediate feedback
          const errMsg = error instanceof Error ? error.message : 'Unknown error';
          try {
            mainWindow?.webContents.send('processing-progress', 100, `Failed: ${errMsg}`);
          } catch {
            /* Ignore IPC send errors */
          }
          // Emit completion with failure result
          try {
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

    // Handle LUT generation and download
    ipcMain.handle('generate-lut', async (_event, data) => {
      try {
        // Use adjustments directly without strength scaling
        const adjustments = data.adjustments;

        // Generate LUT content
        const lutContent = generateLUTContent(adjustments, data.size, data.format);

        // Show save dialog
        const sanitizeName = (n: string) =>
          n
            .replace(/\b(image\s*match|imagematch)\b/gi, '') // Only remove specific technical terms
            .replace(/\s{2,}/g, ' ')
            .trim();
        const rawName =
          (data?.adjustments?.preset_name as string | undefined) ||
          `LUT-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
        const clean = sanitizeName(rawName);
        const baseName = clean
          .replace(/[^A-Za-z0-9 _-]+/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/\s/g, '-');
        const safeName = baseName ? `${baseName}-LUT-${data.size}` : `LUT-${data.size}`;

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
          return { success: true, filePath: result.filePath };
        } else {
          return { success: false, error: 'Save canceled' };
        }
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
