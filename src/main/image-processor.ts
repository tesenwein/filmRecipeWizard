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
      (val === 0 || val === '0' || !!val) ? `      <crs:${name}>${val}</crs:${name}>\n` : '';

    // Clamp helpers to keep values within Lightroom-expected ranges
    const clamp = (v: any, min: number, max: number): number | undefined => {
      if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
      return Math.max(min, Math.min(max, v));
    };
    const round = (v: number | undefined) => (typeof v === 'number' ? Math.round(v) : undefined);
    const fixed2 = (v: number | undefined) => (typeof v === 'number' ? v.toFixed(2) : undefined);

    // Sanitize all inputs
    const temp = round(clamp(aiAdjustments.temperature as any, 2000, 50000));
    const tint = round(clamp(aiAdjustments.tint as any, -150, 150));
    const exposure = clamp(aiAdjustments.exposure as any, -5, 5);
    const contrast = round(clamp(aiAdjustments.contrast as any, -100, 100));
    const highlights = round(clamp(aiAdjustments.highlights as any, -100, 100));
    const shadows = round(clamp(aiAdjustments.shadows as any, -100, 100));
    const whites = round(clamp(aiAdjustments.whites as any, -100, 100));
    const blacks = round(clamp(aiAdjustments.blacks as any, -100, 100));
    const clarity = round(clamp(aiAdjustments.clarity as any, -100, 100));
    const vibrance = round(clamp(aiAdjustments.vibrance as any, -100, 100));
    const saturation = round(clamp(aiAdjustments.saturation as any, -100, 100));

    const sanitizeName = (n: string) =>
      n
        .replace(/\b(image\s*match|imagematch|match|target|base|ai)\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    const fallback = `Preset-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
    const rawPresetName = ((aiAdjustments as any).preset_name && String((aiAdjustments as any).preset_name).trim()) || fallback;
    const presetName = sanitizeName(rawPresetName) || fallback;
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

      ${tag('Temperature', temp)}
      ${tag('Tint', tint)}
      ${tag('Exposure2012', fixed2(exposure))}
      ${tag('Contrast2012', contrast)}
      ${tag('Highlights2012', highlights)}
      ${tag('Shadows2012', shadows)}
      ${tag('Whites2012', whites)}
      ${tag('Blacks2012', blacks)}
      ${tag('Clarity2012', clarity)}
      ${tag('Vibrance', vibrance)}
      ${tag('Saturation', isBW ? 0 : saturation)}

      <!-- Parametric Tone Regions (optional) -->
      ${tag('ParametricShadows', round(clamp((aiAdjustments as any).parametric_shadows, -100, 100)))}
      ${tag('ParametricDarks', round(clamp((aiAdjustments as any).parametric_darks, -100, 100)))}
      ${tag('ParametricLights', round(clamp((aiAdjustments as any).parametric_lights, -100, 100)))}
      ${tag('ParametricHighlights', round(clamp((aiAdjustments as any).parametric_highlights, -100, 100)))}
      ${tag('ParametricShadowSplit', round(clamp((aiAdjustments as any).parametric_shadow_split, 0, 100)))}
      ${tag('ParametricMidtoneSplit', round(clamp((aiAdjustments as any).parametric_midtone_split, 0, 100)))}
      ${tag('ParametricHighlightSplit', round(clamp((aiAdjustments as any).parametric_highlight_split, 0, 100)))}

      <!-- PV2012 Tone Curves (optional) -->
      ${(aiAdjustments as any).tone_curve ? `<crs:ToneCurvePV2012>\n        <rdf:Seq>\n${(((aiAdjustments as any).tone_curve as any[]) || []).map(p => `          <rdf:li>${Math.max(0, Math.min(255, Math.round(p.input || 0)))}, ${Math.max(0, Math.min(255, Math.round(p.output || 0)))}</rdf:li>`).join('\n')}\n        </rdf:Seq>\n      </crs:ToneCurvePV2012>\n` : ''}
      ${(aiAdjustments as any).tone_curve_red ? `<crs:ToneCurvePV2012Red>\n        <rdf:Seq>\n${(((aiAdjustments as any).tone_curve_red as any[]) || []).map(p => `          <rdf:li>${Math.max(0, Math.min(255, Math.round(p.input || 0)))}, ${Math.max(0, Math.min(255, Math.round(p.output || 0)))}</rdf:li>`).join('\n')}\n        </rdf:Seq>\n      </crs:ToneCurvePV2012Red>\n` : ''}
      ${(aiAdjustments as any).tone_curve_green ? `<crs:ToneCurvePV2012Green>\n        <rdf:Seq>\n${(((aiAdjustments as any).tone_curve_green as any[]) || []).map(p => `          <rdf:li>${Math.max(0, Math.min(255, Math.round(p.input || 0)))}, ${Math.max(0, Math.min(255, Math.round(p.output || 0)))}</rdf:li>`).join('\n')}\n        </rdf:Seq>\n      </crs:ToneCurvePV2012Green>\n` : ''}
      ${(aiAdjustments as any).tone_curve_blue ? `<crs:ToneCurvePV2012Blue>\n        <rdf:Seq>\n${(((aiAdjustments as any).tone_curve_blue as any[]) || []).map(p => `          <rdf:li>${Math.max(0, Math.min(255, Math.round(p.input || 0)))}, ${Math.max(0, Math.min(255, Math.round(p.output || 0)))}</rdf:li>`).join('\n')}\n        </rdf:Seq>\n      </crs:ToneCurvePV2012Blue>\n` : ''}

      <!-- HSL Adjustments (optional) -->
      ${tag('HueAdjustmentRed', round(clamp((aiAdjustments as any).hue_red, -100, 100)))}
      ${tag('HueAdjustmentOrange', (aiAdjustments as any).hue_orange)}
      ${tag('HueAdjustmentYellow', (aiAdjustments as any).hue_yellow)}
      ${tag('HueAdjustmentGreen', (aiAdjustments as any).hue_green)}
      ${tag('HueAdjustmentAqua', (aiAdjustments as any).hue_aqua)}
      ${tag('HueAdjustmentBlue', (aiAdjustments as any).hue_blue)}
      ${tag('HueAdjustmentPurple', (aiAdjustments as any).hue_purple)}
      ${tag('HueAdjustmentMagenta', (aiAdjustments as any).hue_magenta)}
      ${tag('SaturationAdjustmentRed', round(clamp((aiAdjustments as any).sat_red, -100, 100)))}
      ${tag('SaturationAdjustmentOrange', (aiAdjustments as any).sat_orange)}
      ${tag('SaturationAdjustmentYellow', (aiAdjustments as any).sat_yellow)}
      ${tag('SaturationAdjustmentGreen', (aiAdjustments as any).sat_green)}
      ${tag('SaturationAdjustmentAqua', (aiAdjustments as any).sat_aqua)}
      ${tag('SaturationAdjustmentBlue', (aiAdjustments as any).sat_blue)}
      ${tag('SaturationAdjustmentPurple', (aiAdjustments as any).sat_purple)}
      ${tag('SaturationAdjustmentMagenta', (aiAdjustments as any).sat_magenta)}
      ${tag('LuminanceAdjustmentRed', round(clamp((aiAdjustments as any).lum_red, -100, 100)))}
      ${tag('LuminanceAdjustmentOrange', (aiAdjustments as any).lum_orange)}
      ${tag('LuminanceAdjustmentYellow', (aiAdjustments as any).lum_yellow)}
      ${tag('LuminanceAdjustmentGreen', (aiAdjustments as any).lum_green)}
      ${tag('LuminanceAdjustmentAqua', (aiAdjustments as any).lum_aqua)}
      ${tag('LuminanceAdjustmentBlue', (aiAdjustments as any).lum_blue)}
      ${tag('LuminanceAdjustmentPurple', (aiAdjustments as any).lum_purple)}
      ${tag('LuminanceAdjustmentMagenta', (aiAdjustments as any).lum_magenta)}

      <!-- Color Grading (Modern) -->
      ${tag('ColorGradeShadowHue', round(clamp((aiAdjustments as any).color_grade_shadow_hue, 0, 360)))}
      ${tag('ColorGradeShadowSat', round(clamp((aiAdjustments as any).color_grade_shadow_sat, 0, 100)))}
      ${tag('ColorGradeShadowLum', round(clamp((aiAdjustments as any).color_grade_shadow_lum, -100, 100)))}
      ${tag('ColorGradeMidtoneHue', round(clamp((aiAdjustments as any).color_grade_midtone_hue, 0, 360)))}
      ${tag('ColorGradeMidtoneSat', round(clamp((aiAdjustments as any).color_grade_midtone_sat, 0, 100)))}
      ${tag('ColorGradeMidtoneLum', round(clamp((aiAdjustments as any).color_grade_midtone_lum, -100, 100)))}
      ${tag('ColorGradeHighlightHue', round(clamp((aiAdjustments as any).color_grade_highlight_hue, 0, 360)))}
      ${tag('ColorGradeHighlightSat', round(clamp((aiAdjustments as any).color_grade_highlight_sat, 0, 100)))}
      ${tag('ColorGradeHighlightLum', round(clamp((aiAdjustments as any).color_grade_highlight_lum, -100, 100)))}
      ${tag('ColorGradeGlobalHue', round(clamp((aiAdjustments as any).color_grade_global_hue, 0, 360)))}
      ${tag('ColorGradeGlobalSat', round(clamp((aiAdjustments as any).color_grade_global_sat, 0, 100)))}
      ${tag('ColorGradeGlobalLum', round(clamp((aiAdjustments as any).color_grade_global_lum, -100, 100)))}
      ${tag('ColorGradeBlending', round(clamp((aiAdjustments as any).color_grade_blending, 0, 100)))}

      <!-- Point Color (if provided) -->
      ${Array.isArray((aiAdjustments as any).point_colors) && (aiAdjustments as any).point_colors.length > 0
        ? `<crs:PointColors>\n    <rdf:Seq>\n${((aiAdjustments as any).point_colors as number[][])
          .map(arr => `     <rdf:li>${arr.map(n => (Number.isFinite(n) ? (Math.round((n as number) * 1000000) / 1000000).toFixed(6) : '0.000000')).join(', ')}</rdf:li>`) 
          .join('\n')}\n    </rdf:Seq>\n   </crs:PointColors>\n`
        : ''}
      ${Array.isArray((aiAdjustments as any).color_variance) && (aiAdjustments as any).color_variance.length > 0
        ? `<crs:ColorVariance>\n    <rdf:Seq>\n${((aiAdjustments as any).color_variance as number[])
          .map(n => `     <rdf:li>${Number.isFinite(n) ? (Math.round((n as number) * 1000000) / 1000000).toFixed(6) : '0.000000'}</rdf:li>`) 
          .join('\n')}\n    </rdf:Seq>\n   </crs:ColorVariance>\n`
        : ''}
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`;
    return xmp;
  }
}
