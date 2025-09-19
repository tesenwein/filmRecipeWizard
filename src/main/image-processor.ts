import * as fs from 'fs/promises';
import * as path from 'path';
import { AIStreamingService } from '../services/ai-streaming-service';
import type { AIColorAdjustments } from '../services/types';
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
  onStreamUpdate?: (update: { type: string; content: string; step?: string; progress?: number; toolName?: string; toolArgs?: any }) => void;
}

export class ImageProcessor {
  private aiStreamingService: AIStreamingService | null = null;
  private settingsService = new SettingsService();

  constructor() { }


  private async ensureAIStreamingService(): Promise<AIStreamingService> {
    if (!this.aiStreamingService) {
      console.log('[PROCESSOR] Creating new AI streaming service...');
      const settings = await this.settingsService.loadSettings();
      console.log('[PROCESSOR] Settings loaded, has API key:', !!settings.openaiKey);
      this.aiStreamingService = new AIStreamingService(settings.openaiKey || '', 'gpt-4o');
    }
    return this.aiStreamingService;
  }

  async matchStyle(data: StyleMatchOptions): Promise<ProcessingResult> {
    console.log('[PROCESSOR] Starting matchStyle with data:', {
      hasBaseImagePath: !!data.baseImagePath,
      hasTargetImagePath: !!data.targetImagePath,
      hasPrompt: !!data.prompt,
      hasBaseImageBase64: !!data.baseImageBase64,
      hasTargetImageBase64: !!data.targetImageBase64,
      hasStyleOptions: !!data.styleOptions,
    });

    const streamingService = await this.ensureAIStreamingService();
    console.log('[PROCESSOR] AI Streaming Service available');

    try {
      console.log('[PROCESSOR] Calling AI streaming service...');
      const aiAdjustments = await streamingService.analyzeColorMatchWithStreaming(
        data.baseImageBase64,
        data.targetImageBase64,
        data.prompt, // hint/prompt
        {
          onUpdate: (update) => {
            // Pass the structured streaming update
            if (data.onStreamUpdate) {
              data.onStreamUpdate(update);
            }
          },
          aiFunctions: data.styleOptions?.aiFunctions,
        }
      );
      console.log('[PROCESSOR] AI analyzer returned:', {
        hasAdjustments: !!aiAdjustments,
        presetName: aiAdjustments?.preset_name,
        confidence: aiAdjustments?.confidence,
      });

      // No longer generating processed images - just return analysis
      return {
        success: true,
        outputPath: data.targetImagePath, // Return original path since we're not processing
        metadata: {
          aiAdjustments,
          confidence: aiAdjustments.confidence,
        },
      };
    } catch (error) {
      console.error('[PROCESSOR] AI style matching failed:', error);
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
      console.error('[PROCESSOR] Failed to generate preview:', error);
      throw error;
    }
  }

  // Set OpenAI API key
  async setOpenAIKey(key: string): Promise<void> {
    await this.settingsService.saveSettings({ openaiKey: key });
    // Reset analyzer to use new key
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
      console.error('[PROCESSOR] Preset generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
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
      console.error('[PROCESSOR] Profile export failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async generateCameraProfile(
    data: any
  ): Promise<{ success: boolean; xmpContent?: string; error?: string }> {
    try {
      const adjustments = data?.adjustments || {};

      // Generate a proper camera profile XMP (not a preset)
      // Camera profiles use Look preset type and focus on color space transformation
      const xmpContent = generateCameraProfileXMP(adjustments.preset_name || 'Camera Profile', adjustments);

      return {
        success: true,
        xmpContent,
      };
    } catch (error) {
      console.error('[PROCESSOR] Camera profile generation failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Use centralized XMP generator implementation
  generateXMPContent(aiAdjustments: AIColorAdjustments, include: any, _aiFunctions?: any): string {
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
