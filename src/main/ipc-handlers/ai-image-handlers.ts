import { ipcMain } from 'electron';
import { AIImageGenerationService, RecipeImageGenerationOptions } from '../../services/ai-image-generation-service';
import { logError } from '../../shared/error-utils';
import { SettingsService } from '../settings-service';
import { StorageService } from '../storage-service';

export class AIImageHandlers {
  private settingsService = new SettingsService();
  private storageService = new StorageService();
  private aiImageService: AIImageGenerationService | null = null;

  setupHandlers(): void {
    // Generate AI image for recipe
    ipcMain.handle('generate-ai-recipe-image', async (_event, options: RecipeImageGenerationOptions) => {
      try {
        // Get settings to access OpenAI API key
        const settings = await this.settingsService.loadSettings();
        
        if (!settings.openaiKey) {
          return {
            success: false,
            error: 'OpenAI API key not configured. Please set it in settings.',
          };
        }

        // Initialize AI image service if not already done
        if (!this.aiImageService) {
          this.aiImageService = new AIImageGenerationService(settings.openaiKey);
        }

        // Generate the image
        const result = await this.aiImageService.generateRecipeImage(options);
        
        return result;
      } catch (error) {
        logError('AI_IMAGE', 'Failed to generate AI recipe image', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    });

    // Save base64 data to temporary file
    ipcMain.handle('save-base64-to-temp-file', async (_event, base64Data: string, filename: string) => {
      try {
        const tempFilePath = await this.storageService.base64ToTempFile(base64Data, filename);
        return tempFilePath;
      } catch (error) {
        logError('AI_IMAGE', 'Failed to save base64 to temp file', error);
        return null;
      }
    });

    // Update API key for AI image service
    ipcMain.handle('update-ai-image-api-key', async (_event, apiKey: string) => {
      try {
        this.aiImageService = new AIImageGenerationService(apiKey);
        return { success: true };
      } catch (error) {
        logError('AI_IMAGE', 'Failed to update AI image service API key', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update API key',
        };
      }
    });
  }
}