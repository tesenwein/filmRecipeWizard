import { BrowserWindow, dialog, ipcMain } from 'electron';
import * as fs from 'fs/promises';
import { ImageProcessor } from '../image-processor';
import { generateLUTContent } from '../lut-generator';
import { StorageService } from '../storage-service';
import { generateXMPContent } from '../xmp-generator';

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
          console.error('[IPC] Error generating preview:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }
    );

    // Handle processing for a single target (one reference + one target)
    ipcMain.handle('process-images', async (_event, data) => {
      const mainWindow = this.getMainWindow();
      if (!mainWindow) return [];

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

        mainWindow.webContents.send('processing-progress', 5, 'Analyzing...');

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
            onStreamUpdate: (update: { type: string; content: string; step?: string; progress?: number; toolName?: string; toolArgs?: any }) => {
              try {
                // Send structured streaming update
                mainWindow.webContents.send('streaming-update', update);
              } catch {
                /* ignore */
              }
            },
          });
          mainWindow.webContents.send('processing-progress', 100, 'Completed');
        } catch (error) {
          console.error('[IPC] Error processing image:', error);
          const errMsg = error instanceof Error ? error.message : 'Unknown error';
          try {
            mainWindow.webContents.send('processing-progress', 100, `Failed: ${errMsg}`);
          } catch {
            // Ignore IPC send errors
          }
          result = { success: false, error: errMsg };
        }

        const results = [result];

        try {
          if (data?.processId && this.storageService) {
            await this.storageService.updateProcess(data.processId, {
              results: [result],
              status: result.success ? 'completed' : 'failed',
            } as any);
            try {
              mainWindow?.webContents.send('process-updated', {
                processId: data.processId,
                updates: {
                  results: [result],
                  status: result.success ? 'completed' : 'failed',
                },
              });
            } catch {
              // Ignore IPC send errors
            }
          }
        } catch (err) {
          console.error('[IPC] process-images: failed to persist results', err);
        }

        mainWindow.webContents.send('processing-complete', results);
        return results;
      } catch (error) {
        console.error('[IPC] Error in processing:', error);
        throw error;
      }
    });

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
          // Temperature hints: Kelvin selection only
          if (typeof options.temperatureK === 'number') {
            const k = Math.max(2000, Math.min(50000, Number(options.temperatureK)));
            optionsHintParts.push(`Target White Balance Temperature: ${k} K`);
          }
          if (options.aiFunctions?.temperatureTint) {
            if (options.tint !== undefined) {
              const t = Math.max(-50, Math.min(50, Number(options.tint)));
              optionsHintParts.push(`Tint Bias: ${t} (negative=green, positive=magenta)`);
            }
          }
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
          const optionsHint =
            optionsHintParts.length > 0 ? `\nPreferences:\n- ${optionsHintParts.join('\n- ')}` : '';

          // Compose prompt from user text and preferences; create detailed prompts for artist-only cases
          let prompt = (basePrompt || '').trim();

          if (!prompt && optionsHintParts.length > 0) {
            // No user prompt provided, but we have style preferences - create a detailed prompt
            const hasArtist = options.artistStyle && typeof options.artistStyle.name === 'string';
            const hasFilm = options.filmStyle && typeof options.filmStyle.name === 'string';

            if (hasArtist && hasFilm) {
              prompt = `Create a comprehensive color grading recipe that combines the distinctive visual style of ${options.artistStyle.name} with the characteristic look of ${options.filmStyle.name} film stock. Apply sophisticated adjustments including color grading, tone curves, HSL modifications, and local adjustments to achieve the desired aesthetic. Focus on the unique color palette, contrast characteristics, and mood that define this artistic combination.`;
            } else if (hasArtist) {
              prompt = `Create a comprehensive color grading recipe inspired by the distinctive visual style of ${options.artistStyle.name}. Apply sophisticated adjustments including color grading, tone curves, HSL modifications, and local adjustments to achieve the characteristic look, mood, and color palette associated with this artist's work. Consider their typical use of contrast, saturation, color temperature, and overall aesthetic approach.`;
            } else if (hasFilm) {
              prompt = `Create a comprehensive color grading recipe that emulates the characteristic look of ${options.filmStyle.name} film stock. Apply sophisticated adjustments including color grading, tone curves, HSL modifications, and local adjustments to achieve the film's distinctive color palette, contrast characteristics, grain structure, and overall aesthetic.`;
            }
          }

          // Fall back to neutral default only if no prompt was created
          prompt = (prompt + optionsHint).trim() ||
            'Apply natural, balanced color grading with clean contrast and faithful skin tones.';

          // Determine which target image to use (for processing, not storage)
          const targetIndex = data.targetIndex || 0;
          const providedTargets = data.targetImageData || [];
          const targetImageData = providedTargets[targetIndex];

          // If no target image is provided, we'll still do AI analysis using just the base image
          if (!targetImageData) {
            console.log('[IPC] No target image provided, doing AI analysis with base image only');
          }

          // Emit initial progress
          try {
            mainWindow?.webContents.send('processing-progress', 5, 'Starting AI analysis...');
          } catch {
            /* Ignore IPC send errors */
          }

          // Create temporary files for processing (baseImagePath not needed when using base64)
          const targetImageTempPath = targetImageData
            ? await this.storageService.base64ToTempFile(targetImageData, 'target.jpg')
            : undefined;

          // Process using the image processor
          let result;
          console.log('[IPC] Starting image processor with:', {
            hasBaseImage: !!baseImageData,
            hasTargetImage: !!targetImageData,
            hasPrompt: !!prompt,
            hasStyleOptions: !!options,
          });

          const startTime = Date.now();
          try {
            result = await this.imageProcessor.matchStyle({
              baseImagePath: undefined,
              targetImagePath: targetImageTempPath || '', // Use empty string if no target image
              baseImageBase64: baseImageData,
              targetImageBase64: targetImageData,
              aiAdjustments: undefined,
              prompt,
              styleOptions: options,
              onStreamUpdate: (update: { type: string; content: string; step?: string; progress?: number; toolName?: string; toolArgs?: any }) => {
                // Send structured streaming updates to the renderer
                try {
                  mainWindow?.webContents.send('streaming-update', update);
                  mainWindow?.webContents.send('processing-progress', update.progress || 50, update.content);
                } catch {
                  /* Ignore IPC send errors */
                }
              },
            });
            const duration = Date.now() - startTime;
            console.log(`[IPC] Image processor completed in ${duration}ms:`, {
              success: result.success,
              hasMetadata: !!result.metadata,
              hasError: !!result.error,
            });
          } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[IPC] Image processor failed after ${duration}ms:`, error);
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown processing error';
            result = {
              success: false,
              error: errorMessage,
              outputPath: targetImageTempPath || '',
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
            const shouldUpdateName = result.success && 
              aiGeneratedName && 
              typeof aiGeneratedName === 'string' && 
              aiGeneratedName.trim().length > 0 &&
              aiGeneratedName !== 'Custom Recipe';
            const shouldUpdateDescription = result.success && 
              aiGeneratedDescription && 
              typeof aiGeneratedDescription === 'string' && 
              aiGeneratedDescription.trim().length > 0;

            // If we have adjustments, merge with any stored overrides, auto-generate XMP, and store it
            let xmpContent: string | undefined;
            let effectiveAdjustments: any | undefined;
            try {
              let adj = result?.metadata?.aiAdjustments;
              if (result.success && adj) {
                try {
                  const currentProcess = await this.storageService.getProcess(data.processId);
                  const overrides = (currentProcess as any)?.aiAdjustmentOverrides;
                  if (overrides && typeof overrides === 'object') {
                    adj = { ...adj, ...overrides };
                  }
                } catch { /* ignore overlay failures */ }
                effectiveAdjustments = adj;
                const include = {
                  wbBasic: true,
                  hsl: true,
                  colorGrading: true,
                  curves: true,
                  pointColor: true,
                  grain: true,
                  vignette: true,
                  masks: true,
                  exposure: false,
                  sharpenNoise: false,
                  strength: 1.0,
                  recipeName: aiGeneratedName || 'Custom Recipe',
                } as any;
                xmpContent = generateXMPContent(adj as any, include);
              }
            } catch (e) {
              console.warn('[IPC] Auto XMP generation failed:', e);
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
              ...(shouldUpdateName ? { name: aiGeneratedName.trim() } : {}),
              ...(shouldUpdateDescription ? { description: aiGeneratedDescription.trim() } : {}),
              ...(xmpContent ? { xmpPreset: xmpContent, xmpCreatedAt: new Date().toISOString() } : {}),
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
                  ...(shouldUpdateName ? { name: aiGeneratedName.trim() } : {}),
                  ...(shouldUpdateDescription ? { description: aiGeneratedDescription.trim() } : {}),
                  ...(xmpContent ? { xmpPreset: xmpContent, xmpCreatedAt: new Date().toISOString() } : {}),
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
            console.log('[IPC] Sending processing-complete event with result:', result.success);
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
        // Apply strength multiplier to adjustments if provided
        let adjustments = data.adjustments;

        if (data.strength !== undefined && data.strength !== 1.0) {
          // Create a copy of adjustments with strength applied
          adjustments = { ...data.adjustments };
          // Apply strength to numeric adjustment values
          const numericFields = [
            'exposure',
            'contrast',
            'highlights',
            'shadows',
            'whites',
            'blacks',
            'vibrance',
            'saturation',
            'clarity',
            'temperature',
            'tint',
            // HSL hue/sat/lum (Lightroom scale -100..100)
            'hue_red',
            'hue_orange',
            'hue_yellow',
            'hue_green',
            'hue_aqua',
            'hue_blue',
            'hue_purple',
            'hue_magenta',
            'sat_red',
            'sat_orange',
            'sat_yellow',
            'sat_green',
            'sat_aqua',
            'sat_blue',
            'sat_purple',
            'sat_magenta',
            'lum_red',
            'lum_orange',
            'lum_yellow',
            'lum_green',
            'lum_aqua',
            'lum_blue',
            'lum_purple',
            'lum_magenta',
            // Color grading saturations and luminances (0..100 or -100..100)
            'color_grade_shadow_sat',
            'color_grade_shadow_lum',
            'color_grade_midtone_sat',
            'color_grade_midtone_lum',
            'color_grade_highlight_sat',
            'color_grade_highlight_lum',
            'color_grade_global_sat',
            'color_grade_global_lum',
            // Balance is an amount (-100..100) we scale toward 0
            'color_grade_balance',
          ];

          // Hues in color grading are angles (0..360) and should NOT be scaled; leave as-is

          for (const field of numericFields) {
            if (typeof adjustments[field] === 'number') {
              if (field === 'temperature') {
                // Temperature: apply strength to deviation from 6500K
                const neutral = 6500;
                const deviation = adjustments[field] - neutral;
                adjustments[field] = neutral + deviation * data.strength;
              } else if (field.startsWith('hue_')) {
                // HSL hue shifts: scale toward 0
                adjustments[field] = adjustments[field] * data.strength;
              } else {
                // Other fields: apply strength directly
                adjustments[field] = adjustments[field] * data.strength;
              }
            }
          }
        }

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
        const strengthSuffix =
          data.strength !== undefined && data.strength !== 1.0
            ? `-${Math.round(data.strength * 100)}pct`
            : '';
        const safeName = baseName ? `${baseName}-LUT-${data.size}${strengthSuffix}` : `LUT-${data.size}${strengthSuffix}`;

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
