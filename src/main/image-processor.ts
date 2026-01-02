import * as fs from 'fs/promises';
import * as path from 'path';
import { AIService } from '../services/ai-service';
import type { AIColorAdjustments } from '../services/types';
import { createErrorResponse, logError } from '../shared/error-utils';
import { ProcessingResult, StyleOptions } from '../shared/types';
import { generateCameraProfileXMP } from './camera-profile-generator';
import { generateLUTContent as generateLUTContentImpl } from './lut-generator';
import { generatePreviewFile } from './preview-generator';
import { exportLightroomProfile } from './profile-exporter';
import { SettingsService } from './settings-service';
import { generateXMPContent as generateXMPContentImpl } from './xmp-generator';

export interface StyleMatchOptions {
  baseImagePath?: string;
  targetImagePath: string;
  outputPath?: string;
  matchBrightness?: boolean;
  matchSaturation?: boolean;
  matchColorGrading?: boolean;
  aiAdjustments?: AIColorAdjustments;
  baseImageBase64?: string | string[];
  targetImageBase64?: string;
  prompt?: string;
  styleOptions?: StyleOptions;
}

export class ImageProcessor {
  private aiService: AIService | null = null;
  private settingsService = new SettingsService();

  constructor() { }


  private async ensureAIService(): Promise<AIService> {
    if (!this.aiService) {
      const settings = await this.settingsService.loadSettings();
      this.aiService = new AIService(settings.openaiKey || '', 'gpt-5.2-2025-12-11');
    }
    return this.aiService;
  }

  async matchStyle(data: StyleMatchOptions): Promise<ProcessingResult> {

    const aiService = await this.ensureAIService();

    try {
      const aiAdjustments = await aiService.analyzeColorMatch(
        data.baseImageBase64,
        undefined, // No target image
        data.prompt, // hint/prompt
        {
          styleOptions: data.styleOptions, // Pass style options to AI
        }
      );

      // No longer generating processed images - just return analysis
      return {
        success: true,
        outputPath: '', // No output path needed
        metadata: {
          aiAdjustments,
          confidence: aiAdjustments.confidence,
        },
      };
    } catch (error) {
      logError('PROCESSOR', 'AI style matching failed', error);
      throw error;
    }
  }


  async generatePreview(args: {
    path?: string;
    dataUrl?: string;
    processId?: string;
    subdir?: string;
  }): Promise<string> {
    try {
      return await generatePreviewFile(args);
    } catch (error) {
      logError('PROCESSOR', 'Failed to generate preview', error);
      throw error;
    }
  }

  // Set OpenAI API key
  async setOpenAIKey(key: string): Promise<void> {
    await this.settingsService.saveSettings({ openaiKey: key });
    // Reset AI service to use new key - force recreation on next use
    this.aiService = null;
  }

  async generateLightroomPreset(data: any): Promise<ProcessingResult> {
    try {
      // Create presets directory
      const presetsDir = path.join(process.cwd(), 'presets');
      await fs.mkdir(presetsDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const presetPath = path.join(presetsDir, `Film Recipe Wizard-${timestamp}.xmp`);

      // Generate XMP preset content
      const xmpContent = generateXMPContentImpl(data.adjustments, data.include);
      await fs.writeFile(presetPath, xmpContent, 'utf8');

      return {
        success: true,
        outputPath: presetPath,
        metadata: {
          presetName: `Film Recipe Wizard-${timestamp}.xmp`,
          groupFolder: 'film-recipe-wizard',
          aiAdjustments: data.adjustments,
        },
      };
    } catch (error) {
        logError('PROCESSOR', 'Preset generation failed', error);
        return createErrorResponse(error);
    }
  }

  async generateLightroomProfile(data: {
    sourceXmpPath: string;
    outputDir?: string;
  }): Promise<ProcessingResult> {
    try {
      const result = await exportLightroomProfile(data.sourceXmpPath, data.outputDir);
      if (!result.success) {
        return { success: false, error: result.error || 'Profile export failed' };
      }
      return {
        success: true,
        outputPath: result.outputPath,
        metadata: { presetName: result.metadata?.profileName, groupFolder: 'profiles' },
      };
    } catch (error) {
      logError('PROCESSOR', 'Profile export failed', error);
      return createErrorResponse(error);
    }
  }

  async generateCameraProfile(
    data: any
  ): Promise<{ success: boolean; xmpContent?: string; error?: string }> {
    try {
      const adjustments = data?.adjustments || {};
      const profileNameOverride = (data?.recipeName as string | undefined)?.toString().trim();

      // Generate a proper camera profile XMP (not a preset)
      // Camera profiles use Look preset type and focus on color space transformation
      const xmpContent = generateCameraProfileXMP(profileNameOverride || adjustments.preset_name || 'Camera Profile', adjustments);

      return {
        success: true,
        xmpContent,
      };
    } catch (error) {
      logError('PROCESSOR', 'Camera profile generation failed', error);
      return createErrorResponse(error);
    }
  }

  // Use centralized XMP generator implementation
  generateXMPContent(aiAdjustments: AIColorAdjustments, include: any): string {
    return generateXMPContentImpl(aiAdjustments, include);
  }

  generateLUTContent(
    aiAdjustments: AIColorAdjustments,
    size: number = 33,
    format: string = 'cube'
  ): string {
    return generateLUTContentImpl(aiAdjustments, size, format);
  }
}
