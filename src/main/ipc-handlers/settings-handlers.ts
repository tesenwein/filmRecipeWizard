import { ipcMain } from 'electron';
import { createErrorResponse, logError } from '../../shared/error-utils';
import { AppSettings } from '../../shared/types';
import { ImageProcessor } from '../image-processor';
import { SettingsService } from '../settings-service';
import { StorageService } from '../storage-service';

export class SettingsHandlers {
  constructor(
    private settingsService: SettingsService,
    private imageProcessor: ImageProcessor,
    private storageService: StorageService
  ) {}

  setupHandlers(): void {
    // Get settings
    ipcMain.handle('get-settings', async () => {
      try {
        const settings = await this.settingsService.loadSettings();
        // Do not log sensitive data
        return {
          success: true,
          settings: { ...settings, openaiKey: settings.openaiKey ? '***' : undefined },
        };
      } catch (error) {
        logError('IPC', 'Error loading settings', error);
        return createErrorResponse(error);
      }
    });

    // Save settings
    ipcMain.handle('save-settings', async (_event, partial: Partial<AppSettings>) => {
      try {
        const saved = await this.settingsService.saveSettings(partial);
        if (partial.openaiKey !== undefined) {
          // Update processor with new key (re-init AI analyzer lazily)
          await this.imageProcessor.setOpenAIKey(partial.openaiKey);
        }
        if (partial.storageLocation !== undefined) {
          // Update storage location
          await this.storageService.setStorageLocation(partial.storageLocation);
        }
        return {
          success: true,
          settings: { ...saved, openaiKey: saved.openaiKey ? '***' : undefined },
        };
      } catch (error) {
        logError('IPC', 'Error saving settings', error);
        return createErrorResponse(error);
      }
    });

    // Update settings
    ipcMain.handle('update-settings', async (_event, partial: Partial<AppSettings>) => {
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
        logError('IPC', 'Error updating settings', error);
        return createErrorResponse(error);
      }
    });
  }
}