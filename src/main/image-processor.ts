import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import { AIColorAdjustments, OpenAIColorAnalyzer } from '../services/openai-color-analyzer';
import { SettingsService } from './settings-service';

export interface StyleMatchOptions {
  baseImagePath: string;
  targetImagePath: string;
  outputPath?: string;
  matchBrightness?: boolean;
  matchSaturation?: boolean;
  matchColorGrading?: boolean;
  aiAdjustments?: AIColorAdjustments;
}

export interface ProcessingResult {
  success: boolean;
  outputPath?: string;
  metadata?: {
    aiAdjustments?: AIColorAdjustments;
    adjustments?: AIColorAdjustments;
    confidence?: number;
    reasoning?: string;
    presetName?: string;
    groupFolder?: string;
  };
  error?: string;
}

export class ImageProcessor {
  private aiAnalyzer: OpenAIColorAnalyzer | null = null;
  private rawFormats = ['.dng', '.cr2', '.cr3', '.nef', '.arw', '.orf', '.rw2', '.raf', '.3fr', '.fff'];
  private settingsService = new SettingsService();

  constructor() {
    console.log('[PROCESSOR] ImageProcessor initialized with AI-only processing');
  }

  private async ensureAIAnalyzer(): Promise<OpenAIColorAnalyzer> {
    if (!this.aiAnalyzer) {
      const settings = await this.settingsService.loadSettings();
      this.aiAnalyzer = new OpenAIColorAnalyzer(settings.openaiKey);
    }
    return this.aiAnalyzer;
  }

  async matchStyle(data: StyleMatchOptions): Promise<ProcessingResult> {
    console.log('[PROCESSOR] Starting AI-powered style matching');
    const analyzer = await this.ensureAIAnalyzer();
    if (!analyzer.isAvailable()) {
      throw new Error(
        'OpenAI API key not configured. This app requires OpenAI for color matching. Please set OPENAI_API_KEY environment variable.'
      );
    }

    try {
      console.log('[PROCESSOR] Analyzing images with AI');
      const aiAdjustments = await analyzer.analyzeColorMatch(
        data.baseImagePath,
        data.targetImagePath
      );

      console.log('[PROCESSOR] AI analysis complete - confidence:', aiAdjustments.confidence);

      // No longer generating processed images - just return analysis
      return {
        success: true,
        outputPath: data.targetImagePath, // Return original path since we're not processing
        metadata: {
          aiAdjustments,
          adjustments: aiAdjustments,
          confidence: aiAdjustments.confidence,
          reasoning: aiAdjustments.reasoning,
        },
      };
    } catch (error) {
      console.error('[PROCESSOR] AI style matching failed:', error);
      throw error;
    }
  }

  async analyzeColorMatch(data: {
    baseImagePath: string;
    targetImagePath: string;
  }): Promise<ProcessingResult> {
    console.log('[PROCESSOR] Starting AI color match analysis');

    const analyzer = await this.ensureAIAnalyzer();
    if (!analyzer.isAvailable()) {
      throw new Error(
        'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable for AI analysis.'
      );
    }

    try {
      const aiAdjustments = await analyzer.analyzeColorMatch(
        data.baseImagePath,
        data.targetImagePath
      );

      return {
        success: true,
        outputPath: data.targetImagePath,
        metadata: {
          aiAdjustments: aiAdjustments,
          adjustments: aiAdjustments,
          confidence: aiAdjustments.confidence,
          reasoning: aiAdjustments.reasoning,
        },
      };
    } catch (error) {
      console.error('[PROCESSOR] AI color analysis failed:', error);
      throw error;
    }
  }

  async generatePreview(args: { path?: string; dataUrl?: string }): Promise<string> {
    const os = await import('os');
    const tmpDir = path.join(os.tmpdir(), 'image-match-previews');
    await fs.mkdir(tmpDir, { recursive: true });

    const outPath = path.join(tmpDir, `prev-${Date.now()}-${Math.floor(Math.random() * 1e6)}.jpg`);

    try {
      let img = sharp();
      if (args.path) {
        img = sharp(args.path);
      } else if (args.dataUrl) {
        const base64 = args.dataUrl.split(',')[1] || '';
        const buf = Buffer.from(base64, 'base64');
        img = sharp(buf);
      } else {
        throw new Error('No input provided for preview');
      }

      await img
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 92 })
        .toFile(outPath);

      return outPath;
    } catch (error) {
      console.error('[PROCESSOR] Failed to generate preview:', error);
      throw error;
    }
  }

  private async applyAIAdjustments(
    inputPath: string,
    outputPath: string,
    adjustments: AIColorAdjustments
  ): Promise<void> {
    console.log('[PROCESSOR] Applying AI adjustments with Sharp');
    
    const image = sharp(inputPath);
    let processedImage = image;

    // Apply basic adjustments that Sharp supports
    const modulateOptions: { brightness?: number; saturation?: number } = {};

    // Helper to ensure Sharp receives strictly positive values
    const positive = (v: number, min = 0.01) => (Number.isFinite(v) && v > 0 ? v : min);

    if (typeof adjustments.brightness === 'number' && Number.isFinite(adjustments.brightness)) {
      const b = 1 + adjustments.brightness / 100;
      if (b !== 1) modulateOptions.brightness = positive(b);
    }

    if (typeof adjustments.saturation === 'number' && Number.isFinite(adjustments.saturation)) {
      const s = 1 + adjustments.saturation / 100;
      if (s !== 1) modulateOptions.saturation = positive(s);
    }
    
    if (Object.keys(modulateOptions).length > 0) {
      const safeModulate: { brightness?: number; saturation?: number } = {};
      if (
        typeof modulateOptions.brightness === 'number' &&
        Number.isFinite(modulateOptions.brightness) &&
        modulateOptions.brightness > 0
      ) {
        safeModulate.brightness = modulateOptions.brightness;
      }
      if (
        typeof modulateOptions.saturation === 'number' &&
        Number.isFinite(modulateOptions.saturation) &&
        modulateOptions.saturation > 0
      ) {
        safeModulate.saturation = modulateOptions.saturation;
      }
      if (Object.keys(safeModulate).length > 0) {
        try {
          processedImage = processedImage.modulate(safeModulate);
        } catch (e) {
          console.warn('[PROCESSOR] Sharp.modulate failed with options:', safeModulate, e);
        }
      }
    }

    await processedImage.jpeg({ quality: 95 }).toFile(outputPath);
    console.log('[PROCESSOR] AI adjustments applied successfully');
  }

  private generateOutputPath(inputPath: string): string {
    const dir = path.dirname(inputPath);
    const ext = path.extname(inputPath);
    const name = path.basename(inputPath, ext);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(dir, `${name}_matched_${timestamp}.jpg`);
  }

  private isRawFormat(extension: string): boolean {
    return this.rawFormats.includes(extension.toLowerCase());
  }

  // Legacy method for compatibility
  async processImage(data: StyleMatchOptions): Promise<ProcessingResult> {
    return this.matchStyle(data);
  }

  // Legacy method for compatibility  
  async analyzeColors(_imagePath: string): Promise<any> {
    console.log('[PROCESSOR] analyzeColors called - this is a legacy method');
    return { histogram: {}, averageColor: {}, dominantColors: [] };
  }

  // Legacy method for compatibility
  async generateAdjustedPreview(args: { path: string; adjustments: AIColorAdjustments }): Promise<string> {
    return this.generatePreview({ path: args.path });
  }

  // Set OpenAI API key
  async setOpenAIKey(key: string): Promise<void> {
    console.log('[PROCESSOR] Setting OpenAI API key');
    await this.settingsService.saveSettings({ openaiKey: key });
    // Reset analyzer to use new key
    this.aiAnalyzer = null;
  }

  async generateLightroomPreset(data: any): Promise<ProcessingResult> {
    try {
      console.log('[PROCESSOR] Generating Lightroom preset with adjustments:', data.adjustments);

      // Create presets directory
      const presetsDir = path.join(process.cwd(), 'presets');
      await fs.mkdir(presetsDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const presetPath = path.join(presetsDir, `ImageMatch-${timestamp}.xmp`);

      // Generate XMP preset content
      const xmpContent = this.generateXMPContent(data.adjustments, data.include);
      await fs.writeFile(presetPath, xmpContent, 'utf8');

      console.log('[PROCESSOR] Lightroom preset saved to:', presetPath);

      return {
        success: true,
        outputPath: presetPath,
        metadata: {
          presetName: `ImageMatch-${timestamp}.xmp`,
          groupFolder: 'image-match',
          adjustments: data.adjustments,
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

  generateXMPContent(aiAdjustments: AIColorAdjustments, _include: any): string {
    // Generate XMP content for Lightroom based on AI adjustments
    const isBW = !!aiAdjustments.monochrome || aiAdjustments.treatment === 'black_and_white' ||
      (typeof aiAdjustments.camera_profile === 'string' && /monochrome/i.test(aiAdjustments.camera_profile || '')) ||
      (typeof aiAdjustments.saturation === 'number' && aiAdjustments.saturation <= -100);
    const cameraProfile = aiAdjustments.camera_profile || (isBW ? 'Adobe Monochrome' : 'Adobe Color');
    const profileName = cameraProfile;
    const treatmentTag = isBW ? '<crs:Treatment>Black &amp; White</crs:Treatment>\n      <crs:ConvertToGrayscale>True</crs:ConvertToGrayscale>' : '<crs:Treatment>Color</crs:Treatment>';
    const tag = (name: string, val?: number | string) =>
      (val === 0 || !!val) ? `      <crs:${name}>${val}</crs:${name}>\n` : '';

    const presetName = ((aiAdjustments as any).preset_name && String((aiAdjustments as any).preset_name).trim()) || `ImageMatch-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
    const groupName = 'image-match';
    const xmp = `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.6-c140 79.160451, 2017/05/06-01:08:21">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/">
      <crs:Name>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${presetName}</rdf:li>
        </rdf:Alt>
      </crs:Name>
      <crs:Group>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${groupName}</rdf:li>
        </rdf:Alt>
      </crs:Group>
      ${treatmentTag}
      ${tag('CameraProfile', cameraProfile)}
      ${tag('ProfileName', profileName)}
      ${tag('Profile', profileName)}
      <crs:Look>
        <rdf:Description crs:Name="${profileName}" />
      </crs:Look>

      ${tag('Temperature', aiAdjustments.temperature)}
      ${tag('Tint', aiAdjustments.tint)}
      ${tag('Exposure2012', aiAdjustments.exposure)}
      ${tag('Contrast2012', aiAdjustments.contrast)}
      ${tag('Highlights2012', aiAdjustments.highlights)}
      ${tag('Shadows2012', aiAdjustments.shadows)}
      ${tag('Whites2012', aiAdjustments.whites)}
      ${tag('Blacks2012', aiAdjustments.blacks)}
      ${tag('Clarity2012', aiAdjustments.clarity)}
      ${tag('Vibrance', aiAdjustments.vibrance)}
      ${tag('Saturation', isBW ? 0 : aiAdjustments.saturation)}
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`;
    return xmp;
  }
}
