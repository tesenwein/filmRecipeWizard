import { dialog } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createErrorResponse, logError } from '../shared/error-utils';
import { AppSettings } from '../shared/types';
import { generateCaptureOneBasicStyle, generateCaptureOneStyle } from './capture-one-generator';
import { ImageProcessor } from './image-processor';
import { generateXMPContent } from './xmp-generator';

export interface ExportConfig {
  type: 'lightroom-preset' | 'lightroom-profile' | 'capture-one-style' | 'capture-one-basic-style';
  settingsPath: keyof AppSettings;
  fileExtension: string;
  generateContent: (adjustments: any, include?: any, recipeName?: string, imageProcessor?: ImageProcessor) => string | Promise<string>;
  defaultFilename: (recipeName?: string) => string;
}

export class ExportManager {
  private exportConfigs: Record<string, ExportConfig> = {
    'lightroom-preset': {
      type: 'lightroom-preset',
      settingsPath: 'lightroomProfilePath',
      fileExtension: 'xmp',
      generateContent: (adjustments: any, include?: any, recipeName?: string) => generateXMPContent(adjustments, include),
      defaultFilename: (recipeName) => `${recipeName || 'Custom-Preset'}.xmp`,
    },
    'lightroom-profile': {
      type: 'lightroom-profile',
      settingsPath: 'lightroomProfilePath',
      fileExtension: 'xmp',
      generateContent: async (adjustments: any, include?: any, recipeName?: string, imageProcessor?: ImageProcessor) => {
        if (!imageProcessor) throw new Error('ImageProcessor required for profile generation');
        const result = await imageProcessor.generateCameraProfile({ adjustments, recipeName });
        return result.xmpContent || '';
      },
      defaultFilename: (recipeName) => `${recipeName || 'Custom-Profile'}-Profile.xmp`,
    },
    'capture-one-style': {
      type: 'capture-one-style',
      settingsPath: 'captureOneStylesPath',
      fileExtension: 'costyle',
      generateContent: (adjustments: any, include?: any, recipeName?: string) => {
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
      defaultFilename: (recipeName) => `${recipeName || 'Custom-Style'}.costyle`,
    },
    'capture-one-basic-style': {
      type: 'capture-one-basic-style',
      settingsPath: 'captureOneStylesPath',
      fileExtension: 'costyle',
      generateContent: (adjustments: any, include?: any, recipeName?: string) => {
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
      defaultFilename: (recipeName) => `${recipeName || 'Custom-Style'}-Basic.costyle`,
    },
  };

  constructor(private imageProcessor: ImageProcessor) {}

  async exportToFolder(
    exportType: string,
    data: { adjustments: any; recipeName?: string },
    settings: AppSettings
  ): Promise<{ success: boolean; outputPath?: string; error?: string }> {
    const config = this.exportConfigs[exportType];
    if (!config) {
      return { success: false, error: `Unknown export type: ${exportType}` };
    }

    const settingsPath = settings[config.settingsPath] as string;
    if (!settingsPath) {
      return { 
        success: false, 
        error: `${this.getDisplayName(exportType)} path not configured. Please set it in Settings.` 
      };
    }

    try {
      // Generate content
      const content = await config.generateContent(data.adjustments, {}, data.recipeName, this.imageProcessor);

      // Create safe filename
      const safeName = this.createSafeFilename(data.recipeName || 'Custom Recipe');
      const filename = config.defaultFilename(safeName);

      // Ensure directory exists
      await fs.mkdir(settingsPath, { recursive: true });

      // Write file
      const filePath = path.join(settingsPath, filename);
      await fs.writeFile(filePath, content, { encoding: 'utf8', flag: 'w' });

      return { success: true, outputPath: filePath };
    } catch (error) {
      logError('ExportManager', `Error exporting ${exportType} to folder`, error);
      return createErrorResponse(error);
    }
  }

  async downloadFile(
    exportType: string,
    data: { adjustments: any; include?: any; recipeName?: string }
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const config = this.exportConfigs[exportType];
    if (!config) {
      return { success: false, error: `Unknown export type: ${exportType}` };
    }

    try {
      // Generate content
      const content = await config.generateContent(data.adjustments, data.include, data.recipeName, this.imageProcessor);

      // Show save dialog
      const filename = config.defaultFilename(data.recipeName);
      const saveRes = await dialog.showSaveDialog({
        title: `Save ${this.getDisplayName(exportType)}`,
        defaultPath: filename,
        filters: [
          { name: this.getDisplayName(exportType), extensions: [config.fileExtension] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (saveRes.canceled || !saveRes.filePath) {
        return { success: false, error: 'Export canceled' };
      }

      // Write file
      await fs.writeFile(saveRes.filePath, content, { encoding: 'utf8' });
      return { success: true, filePath: saveRes.filePath };
    } catch (error) {
      logError('ExportManager', `Error downloading ${exportType}`, error);
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

  private getDisplayName(exportType: string): string {
    const names: Record<string, string> = {
      'lightroom-preset': 'Lightroom Preset',
      'lightroom-profile': 'Lightroom Profile',
      'capture-one-style': 'Capture One Style',
      'capture-one-basic-style': 'Basic Capture One Style',
    };
    return names[exportType] || exportType;
  }
}
