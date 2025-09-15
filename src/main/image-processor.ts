import * as fs from 'fs/promises';
import * as path from 'path';
import { AIColorAdjustments, OpenAIColorAnalyzer } from '../services/openai-color-analyzer';
import { ProcessingResult, StyleOptions } from '../shared/types';
import { generateLUTContent as generateLUTContentImpl } from './lut-generator';
import { exportLightroomProfile } from './profile-exporter';
import { SettingsService } from './settings-service';
import { generateXMPContent as generateXMPContentImpl } from './xmp-generator';
import { generateCameraProfileXMP } from './camera-profile-generator';
import { generatePreviewFile } from './preview-generator';

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
  private aiAnalyzer: OpenAIColorAnalyzer | null = null;
  private settingsService = new SettingsService();

  constructor() {
  }

  private async ensureAIAnalyzer(): Promise<OpenAIColorAnalyzer> {
    if (!this.aiAnalyzer) {
      const settings = await this.settingsService.loadSettings();
      this.aiAnalyzer = new OpenAIColorAnalyzer(settings.openaiKey);
    }
    return this.aiAnalyzer;
  }

  async matchStyle(data: StyleMatchOptions): Promise<ProcessingResult> {
    const analyzer = await this.ensureAIAnalyzer();
    if (!analyzer.isAvailable()) {
      throw new Error(
        'OpenAI API key not configured. This app requires OpenAI for color matching. Please set OPENAI_API_KEY environment variable.'
      );
    }

    try {
      const aiAdjustments = await analyzer.analyzeColorMatch(
        data.baseImagePath,
        data.targetImagePath,
        data.prompt, // hint/prompt
        data.baseImageBase64,
        data.targetImageBase64,
        {
          preserveSkinTones: !!data.styleOptions?.preserveSkinTones,
          lightroomProfile: data.styleOptions?.lightroomProfile
        }
      );


      // No longer generating processed images - just return analysis
      return {
        success: true,
        outputPath: data.targetImagePath, // Return original path since we're not processing
        metadata: {
          aiAdjustments,
          confidence: aiAdjustments.confidence,
          reasoning: aiAdjustments.reasoning,
          usedSettings: {
            preserveSkinTones: !!data.styleOptions?.preserveSkinTones,
          },
        },
      };
    } catch (error) {
      console.error('[PROCESSOR] AI style matching failed:', error);
      throw error;
    }
  }

  async analyzeColorMatch(data: {
    baseImagePath?: string;
    targetImagePath: string;
    baseImageBase64?: string;
    targetImageBase64?: string;
    prompt?: string;
    styleOptions?: StyleOptions;
  }): Promise<ProcessingResult> {

    const analyzer = await this.ensureAIAnalyzer();
    if (!analyzer.isAvailable()) {
      throw new Error(
        'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable for AI analysis.'
      );
    }

    try {
      const aiAdjustments = await analyzer.analyzeColorMatch(
        data.baseImagePath,
        data.targetImagePath,
        data.prompt,
        data.baseImageBase64,
        data.targetImageBase64,
        {
          preserveSkinTones: !!data.styleOptions?.preserveSkinTones,
          lightroomProfile: data.styleOptions?.lightroomProfile
        }
      );

      return {
        success: true,
        outputPath: data.targetImagePath,
        metadata: {
          aiAdjustments,
          confidence: aiAdjustments.confidence,
          reasoning: aiAdjustments.reasoning,
          usedSettings: {
            preserveSkinTones: !!data.styleOptions?.preserveSkinTones,
          },
        },
      };
    } catch (error) {
      console.error('[PROCESSOR] AI color analysis failed:', error);
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


  // Legacy method for compatibility
  async generateAdjustedPreview(args: {
    path: string;
    adjustments: AIColorAdjustments;
  }): Promise<string> {
    return this.generatePreview({ path: args.path });
  }

  // Set OpenAI API key
  async setOpenAIKey(key: string): Promise<void> {
    await this.settingsService.saveSettings({ openaiKey: key });
    // Reset analyzer to use new key
    this.aiAnalyzer = null;
  }

  async generateLightroomPreset(data: any): Promise<ProcessingResult> {
    try {

      // Create presets directory
      const presetsDir = path.join(process.cwd(), 'presets');
      await fs.mkdir(presetsDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const presetPath = path.join(presetsDir, `Foto Recipe Wizard-${timestamp}.xmp`);

      // Generate XMP preset content
      const xmpContent = generateXMPContentImpl(data.adjustments, data.include);
      await fs.writeFile(presetPath, xmpContent, 'utf8');


      return {
        success: true,
        outputPath: presetPath,
        metadata: {
          presetName: `Foto Recipe Wizard-${timestamp}.xmp`,
          groupFolder: 'foto-recipe-wizard',
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
      // Get AI-generated name directly from adjustments (same as preset export)
      const profileName = adjustments.preset_name || 'Camera Profile';

      // Generate a simple camera profile XMP
      // Camera profiles use lookup tables and tone curves for color grading
      const xmpContent = generateCameraProfileXMP(profileName, adjustments);

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
