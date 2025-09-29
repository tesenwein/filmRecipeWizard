import { dialog, ipcMain } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createErrorResponse, logError } from '../shared/error-utils';
import { AppSettings } from '../shared/types';
import { generateCaptureOneBasicStyle, generateCaptureOneStyle } from './capture-one-generator';
import { ImageProcessor } from './image-processor';
import { generateXMPContent } from './xmp-generator';

export type ExportType = 
  | 'lightroom-preset' 
  | 'lightroom-profile' 
  | 'capture-one-style' 
  | 'capture-one-basic-style';

export type ExportAction = 'download' | 'save-to-folder';

export interface ExportRequest {
  type: ExportType;
  action: ExportAction;
  adjustments: any;
  include?: any;
  recipeName?: string;
}

export interface ExportResponse {
  success: boolean;
  filePath?: string;
  outputPath?: string;
  error?: string;
}

export class UnifiedExportHandler {
  private exportConfigs = {
    'lightroom-preset': {
      settingsPath: 'lightroomProfilePath' as keyof AppSettings,
      fileExtension: 'xmp',
      generateContent: (adjustments: any, include?: any) => generateXMPContent(adjustments, include),
      defaultFilename: (recipeName?: string) => `${recipeName || 'Custom-Preset'}.xmp`,
      displayName: 'Lightroom Preset',
    },
    'lightroom-profile': {
      settingsPath: 'lightroomProfilePath' as keyof AppSettings,
      fileExtension: 'xmp',
      generateContent: async (adjustments: any, include?: any, recipeName?: string, imageProcessor?: ImageProcessor) => {
        if (!imageProcessor) throw new Error('ImageProcessor required for profile generation');
        const result = await imageProcessor.generateCameraProfile({ adjustments, recipeName });
        if (!result.success || !result.xmpContent) {
          throw new Error(result.error || 'Failed to generate profile');
        }
        return result.xmpContent;
      },
      defaultFilename: (recipeName?: string) => `${recipeName || 'Custom-Profile'}-Profile.xmp`,
      displayName: 'Lightroom Profile',
    },
    'capture-one-style': {
      settingsPath: 'captureOneStylesPath' as keyof AppSettings,
      fileExtension: 'costyle',
      generateContent: (adjustments: any, include?: any) => {
        const config = {
          basic: true,
          hsl: true,
          colorGrading: true,
          grain: true,
          vignette: true,
          masks: true,
          ...include,
        };
        return generateCaptureOneStyle(adjustments, config);
      },
      defaultFilename: (recipeName?: string) => `${recipeName || 'Custom-Style'}.costyle`,
      displayName: 'Capture One Style',
    },
    'capture-one-basic-style': {
      settingsPath: 'captureOneStylesPath' as keyof AppSettings,
      fileExtension: 'costyle',
      generateContent: (adjustments: any, include?: any) => {
        const config = {
          basic: true,
          hsl: false,
          colorGrading: false,
          grain: false,
          vignette: false,
          masks: false,
          ...include,
        };
        return generateCaptureOneBasicStyle(adjustments, config);
      },
      defaultFilename: (recipeName?: string) => `${recipeName || 'Custom-Style'}-Basic.costyle`,
      displayName: 'Basic Capture One Style',
    },
  };

  constructor(
    private imageProcessor: ImageProcessor,
    private settingsService: any
  ) {}

  async handleExport(request: ExportRequest): Promise<ExportResponse> {
    const config = this.exportConfigs[request.type];
    if (!config) {
      return { success: false, error: `Unknown export type: ${request.type}` };
    }

    try {
      // Generate content
      const content = await config.generateContent(
        request.adjustments, 
        request.include, 
        request.recipeName, 
        this.imageProcessor
      );

      if (request.action === 'download') {
        return await this.handleDownload(config, content, request.recipeName);
      } else {
        return await this.handleSaveToFolder(config, content, request.recipeName);
      }
    } catch (error) {
      logError('UnifiedExportHandler', `Error handling ${request.action} for ${request.type}`, error);
      return createErrorResponse(error);
    }
  }

  private async handleDownload(
    config: any, 
    content: string, 
    recipeName?: string
  ): Promise<ExportResponse> {
    try {
      const filename = config.defaultFilename(recipeName);
      const saveRes = await dialog.showSaveDialog({
        title: `Save ${config.displayName}`,
        defaultPath: filename,
        filters: [
          { name: config.displayName, extensions: [config.fileExtension] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (saveRes.canceled || !saveRes.filePath) {
        return { success: false, error: 'Export canceled' };
      }

      await fs.writeFile(saveRes.filePath, content, { encoding: 'utf8' });
      return { success: true, filePath: saveRes.filePath };
    } catch (error) {
      logError('UnifiedExportHandler', `Error downloading ${config.displayName}`, error);
      return createErrorResponse(error);
    }
  }

  private async handleSaveToFolder(
    config: any, 
    content: string, 
    recipeName?: string
  ): Promise<ExportResponse> {
    try {
      const settings = await this.settingsService.loadSettings();
      const settingsPath = settings[config.settingsPath] as string;
      
      if (!settingsPath) {
        return { 
          success: false, 
          error: `${config.displayName} path not configured. Please set it in Settings.` 
        };
      }

      // Create safe filename
      const safeName = this.createSafeFilename(recipeName || 'Custom Recipe');
      const filename = config.defaultFilename(safeName);

      // Ensure directory exists
      await fs.mkdir(settingsPath, { recursive: true });

      // Write file
      const filePath = path.join(settingsPath, filename);
      await fs.writeFile(filePath, content, { encoding: 'utf8', flag: 'w' });

      return { success: true, outputPath: filePath };
    } catch (error) {
      logError('UnifiedExportHandler', `Error saving ${config.displayName} to folder`, error);
      return createErrorResponse(error);
    }
  }

  private createSafeFilename(name: string): string {
    return name
      .replace(/[^A-Za-z0-9 _-]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\s/g, '-');
  }

  setupHandlers(): void {
    // Unified export handler
    ipcMain.handle('unified-export', async (_event, request: ExportRequest): Promise<ExportResponse> => {
      return await this.handleExport(request);
    });
  }
}
