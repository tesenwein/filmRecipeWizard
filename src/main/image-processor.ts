import * as fs from 'fs/promises';
import * as path from 'path';
import { AIColorAdjustments, OpenAIColorAnalyzer } from '../services/openai-color-analyzer';
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
    usedSettings?: {
      preserveSkinTones?: boolean;
    };
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
      const settings = await this.settingsService.loadSettings();
      const aiAdjustments = await analyzer.analyzeColorMatch(
        data.baseImagePath,
        data.targetImagePath,
        data.prompt, // hint/prompt
        data.baseImageBase64,
        data.targetImageBase64,
        { preserveSkinTones: !!settings.preserveSkinTones, emphasize3DPop: !!settings.emphasize3DPop }
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
          usedSettings: {
            preserveSkinTones: !!settings.preserveSkinTones,
            emphasize3DPop: !!settings.emphasize3DPop,
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
  }): Promise<ProcessingResult> {
    console.log('[PROCESSOR] Starting AI color match analysis');

    const analyzer = await this.ensureAIAnalyzer();
    if (!analyzer.isAvailable()) {
      throw new Error(
        'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable for AI analysis.'
      );
    }

    try {
      const settings = await this.settingsService.loadSettings();
      const aiAdjustments = await analyzer.analyzeColorMatch(
        data.baseImagePath,
        data.targetImagePath,
        data.prompt,
        data.baseImageBase64,
        data.targetImageBase64,
        { preserveSkinTones: !!settings.preserveSkinTones, emphasize3DPop: !!settings.emphasize3DPop }
      );

      return {
        success: true,
        outputPath: data.targetImagePath,
        metadata: {
          aiAdjustments: aiAdjustments,
          adjustments: aiAdjustments,
          confidence: aiAdjustments.confidence,
          reasoning: aiAdjustments.reasoning,
          usedSettings: {
            preserveSkinTones: !!settings.preserveSkinTones,
            emphasize3DPop: !!settings.emphasize3DPop,
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
  async processImage(data: StyleMatchOptions): Promise<ProcessingResult> {
    return this.matchStyle(data);
  }

  // Legacy method for compatibility
  async analyzeColors(_imagePath: string): Promise<any> {
    console.log('[PROCESSOR] analyzeColors called - this is a legacy method');
    return { histogram: {}, averageColor: {}, dominantColors: [] };
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
      const presetPath = path.join(presetsDir, `FotoRecipeWizard-${timestamp}.xmp`);

      // Generate XMP preset content
      const xmpContent = generateXMPContentImpl(data.adjustments, data.include);
      await fs.writeFile(presetPath, xmpContent, 'utf8');

      console.log('[PROCESSOR] Lightroom preset saved to:', presetPath);

      return {
        success: true,
        outputPath: presetPath,
        metadata: {
          presetName: `FotoRecipeWizard-${timestamp}.xmp`,
          groupFolder: 'foto-recipe-wizard',
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

  async generateLightroomProfile(data: {
    sourceXmpPath: string;
    outputDir?: string;
  }): Promise<ProcessingResult> {
    try {
      console.log('[PROCESSOR] Exporting Lightroom profile from:', data.sourceXmpPath);
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
      console.log('[PROCESSOR] Generating camera profile from adjustments');

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

  /* moved to camera-profile-generator.ts */
  /* generateCameraProfileXMP(profileName: string, adjustments: any): string {
    // Check if this is a black and white conversion
    const isBW = !!adjustments.monochrome ||
                 adjustments.treatment === 'black_and_white' ||
                 (typeof adjustments.camera_profile === 'string' && /monochrome/i.test(adjustments.camera_profile || '')) ||
                 (typeof adjustments.saturation === 'number' && adjustments.saturation <= -100);

    // Extract color adjustments
    const exposure = adjustments.exposure || 0;
    const contrast = adjustments.contrast || 0;
    const highlights = adjustments.highlights || 0;
    const shadows = adjustments.shadows || 0;
    const whites = adjustments.whites || 0;
    const blacks = adjustments.blacks || 0;
    const vibrance = adjustments.vibrance || 0;
    const saturation = isBW ? -100 : (adjustments.saturation || 0);

    // Color grading
    const shadowsHue = adjustments.shadows_hue || 0;
    const shadowsSat = adjustments.shadows_sat || 0;
    const midtonesSat = adjustments.midtones_sat || 0;
    const highlightsHue = adjustments.highlights_hue || 0;
    const highlightsSat = adjustments.highlights_sat || 0;

    // Generate XMP for camera profile
    return `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
        crs:PresetType="Look"
        crs:Cluster=""
        crs:UUID="${this.generateUUID()}"
        crs:SupportsAmount="true"
        crs:SupportsColor="true"
        crs:SupportsMonochrome="true"
        crs:SupportsHighDynamicRange="true"
        crs:SupportsNormalDynamicRange="true"
        crs:SupportsSceneReferred="true"
        crs:SupportsOutputReferred="true"
        crs:CameraModelRestriction=""
        crs:Copyright=""
        crs:ContactInfo=""
        crs:Version="16.5"
        crs:ProcessVersion="15.4"
        crs:Exposure2012="${(exposure / 100).toFixed(2)}"
        crs:Contrast2012="${Math.round(contrast)}"
        crs:Highlights2012="${Math.round(highlights)}"
        crs:Shadows2012="${Math.round(shadows)}"
        crs:Whites2012="${Math.round(whites)}"
        crs:Blacks2012="${Math.round(blacks)}"
        crs:Vibrance="${Math.round(vibrance)}"
        crs:Saturation="${Math.round(saturation)}"
        crs:ConvertToGrayscale="${isBW ? 'true' : 'false'}"
        ${isBW ? 'crs:Treatment="Black &amp; White"' : 'crs:Treatment="Color"'}
        crs:SplitToningShadowHue="${Math.round(shadowsHue)}"
        crs:SplitToningShadowSaturation="${Math.round(shadowsSat)}"
        crs:SplitToningHighlightHue="${Math.round(highlightsHue)}"
        crs:SplitToningHighlightSaturation="${Math.round(highlightsSat)}"
        crs:SplitToningBalance="${Math.round(midtonesSat)}"
        ${isBW && adjustments.bw_red !== undefined ? `crs:GrayMixerRed="${Math.round(adjustments.bw_red)}"` : ''}
        ${isBW && adjustments.bw_orange !== undefined ? `crs:GrayMixerOrange="${Math.round(adjustments.bw_orange)}"` : ''}
        ${isBW && adjustments.bw_yellow !== undefined ? `crs:GrayMixerYellow="${Math.round(adjustments.bw_yellow)}"` : ''}
        ${isBW && adjustments.bw_green !== undefined ? `crs:GrayMixerGreen="${Math.round(adjustments.bw_green)}"` : ''}
        ${isBW && adjustments.bw_aqua !== undefined ? `crs:GrayMixerAqua="${Math.round(adjustments.bw_aqua)}"` : ''}
        ${isBW && adjustments.bw_blue !== undefined ? `crs:GrayMixerBlue="${Math.round(adjustments.bw_blue)}"` : ''}
        ${isBW && adjustments.bw_purple !== undefined ? `crs:GrayMixerPurple="${Math.round(adjustments.bw_purple)}"` : ''}
        ${isBW && adjustments.bw_magenta !== undefined ? `crs:GrayMixerMagenta="${Math.round(adjustments.bw_magenta)}"` : ''}
        crs:HasSettings="true">
      <crs:Name>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${profileName}</rdf:li>
        </rdf:Alt>
      </crs:Name>
      <crs:ShortName>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${profileName}</rdf:li>
        </rdf:Alt>
      </crs:ShortName>
      <crs:Group>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">Foto Recipe Wizard</rdf:li>
        </rdf:Alt>
      </crs:Group>
      <crs:Description>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">Camera profile generated from Foto Recipe Wizard</rdf:li>
        </rdf:Alt>
      </crs:Description>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`;
  } */

  /* moved to camera-profile-generator.ts */
  /* generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
      .replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      })
      .toUpperCase();
  } */

  generateXMPContent(aiAdjustments: AIColorAdjustments, include: any): string {
    // Generate XMP content for Lightroom based on AI adjustments
    const isBW =
      !!aiAdjustments.monochrome ||
      aiAdjustments.treatment === 'black_and_white' ||
      (typeof aiAdjustments.camera_profile === 'string' &&
        /monochrome/i.test(aiAdjustments.camera_profile || '')) ||
      (typeof aiAdjustments.saturation === 'number' && aiAdjustments.saturation <= -100);
    const cameraProfile =
      aiAdjustments.camera_profile || (isBW ? 'Adobe Monochrome' : 'Adobe Color');
    const profileName = cameraProfile;
    const treatmentTag = isBW
      ? '<crs:Treatment>Black &amp; White</crs:Treatment>\n      <crs:ConvertToGrayscale>True</crs:ConvertToGrayscale>'
      : '<crs:Treatment>Color</crs:Treatment>';
    const tag = (name: string, val?: number | string) =>
      val === 0 || val === '0' || !!val ? `      <crs:${name}>${val}</crs:${name}>\n` : '';

    // Clamp helpers to keep values within Lightroom-expected ranges
    const clamp = (v: any, min: number, max: number): number | undefined => {
      if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
      return Math.max(min, Math.min(max, v));
    };
    const round = (v: number | undefined) => (typeof v === 'number' ? Math.round(v) : undefined);
    const fixed2 = (v: number | undefined) => (typeof v === 'number' ? v.toFixed(2) : undefined);

    // Sanitize all inputs
    // Default WB to D65 and zero tint if omitted to avoid unintended warm casts
    const withDefault = (v: any, d: number) =>
      typeof v === 'number' && Number.isFinite(v) ? (v as number) : d;
    const temp = round(clamp(withDefault(aiAdjustments.temperature, 6500), 2000, 50000));
    const tint = round(clamp(withDefault(aiAdjustments.tint, 0), -150, 150));
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
        .replace(/\b(image\s*match|imagematch|match|target|base|ai|photo)\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    const fallback = `Preset-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
    const rawPresetName =
      ((aiAdjustments as any).preset_name && String((aiAdjustments as any).preset_name).trim()) ||
      fallback;
    const presetName = sanitizeName(rawPresetName) || fallback;
    const groupName = 'foto-recipe-wizard';
    // Inclusion flags with sane defaults (back-compat: include everything when not specified)
    const inc = {
      wbBasic: include?.wbBasic !== false,
      exposure: !!include?.exposure, // exposure is separate and defaults to off unless explicitly enabled
      hsl: include?.hsl !== false,
      colorGrading: include?.colorGrading !== false,
      curves: include?.curves !== false,
      // Enable Point Color by default unless explicitly disabled
      pointColor: include?.pointColor !== false,
      // Film Grain optional export flag (default ON for back-compat)
      grain: include?.grain !== false,
      // Masks/local adjustments export flag (default OFF)
      masks: !!include?.masks,
      // sharpenNoise and vignette currently not emitted in XMP (placeholders)
    } as const;

    try {
      console.log('[XMP] include flags:', inc);
    } catch {
      // Ignore logging errors
    }

    // Build conditional blocks
    const wbBasicBlock = inc.wbBasic
      ? [
          tag('Temperature', temp),
          tag('Tint', tint),
          tag('Contrast2012', contrast),
          tag('Highlights2012', highlights),
          tag('Shadows2012', shadows),
          tag('Whites2012', whites),
          tag('Blacks2012', blacks),
          tag('Clarity2012', clarity),
          tag('Vibrance', vibrance),
          tag('Saturation', isBW ? 0 : saturation),
        ].join('')
      : '';

    const shouldIncludeExposure =
      inc.exposure && typeof exposure === 'number' && Number.isFinite(exposure);
    try {
      console.log('[XMP] exposure:', { value: exposure, include: shouldIncludeExposure });
    } catch {
      // Ignore logging errors
    }
    const exposureBlock = shouldIncludeExposure ? tag('Exposure2012', fixed2(exposure)) : '';

    const parametricCurvesBlock = inc.curves
      ? [
          tag(
            'ParametricShadows',
            round(clamp((aiAdjustments as any).parametric_shadows, -100, 100))
          ),
          tag('ParametricDarks', round(clamp((aiAdjustments as any).parametric_darks, -100, 100))),
          tag(
            'ParametricLights',
            round(clamp((aiAdjustments as any).parametric_lights, -100, 100))
          ),
          tag(
            'ParametricHighlights',
            round(clamp((aiAdjustments as any).parametric_highlights, -100, 100))
          ),
          tag(
            'ParametricShadowSplit',
            round(clamp((aiAdjustments as any).parametric_shadow_split, 0, 100))
          ),
          tag(
            'ParametricMidtoneSplit',
            round(clamp((aiAdjustments as any).parametric_midtone_split, 0, 100))
          ),
          tag(
            'ParametricHighlightSplit',
            round(clamp((aiAdjustments as any).parametric_highlight_split, 0, 100))
          ),
        ].join('')
      : '';

    const toneCurvesBlock = inc.curves
      ? [
          (aiAdjustments as any).tone_curve
            ? `<crs:ToneCurvePV2012>\n        <rdf:Seq>\n${(
                ((aiAdjustments as any).tone_curve as any[]) || []
              )
                .map(
                  p =>
                    `          <rdf:li>${Math.max(
                      0,
                      Math.min(255, Math.round(p.input || 0))
                    )}, ${Math.max(0, Math.min(255, Math.round(p.output || 0)))}</rdf:li>`
                )
                .join('\n')}\n        </rdf:Seq>\n      </crs:ToneCurvePV2012>\n`
            : '',
          (aiAdjustments as any).tone_curve_red
            ? `<crs:ToneCurvePV2012Red>\n        <rdf:Seq>\n${(
                ((aiAdjustments as any).tone_curve_red as any[]) || []
              )
                .map(
                  p =>
                    `          <rdf:li>${Math.max(
                      0,
                      Math.min(255, Math.round(p.input || 0))
                    )}, ${Math.max(0, Math.min(255, Math.round(p.output || 0)))}</rdf:li>`
                )
                .join('\n')}\n        </rdf:Seq>\n      </crs:ToneCurvePV2012Red>\n`
            : '',
          (aiAdjustments as any).tone_curve_green
            ? `<crs:ToneCurvePV2012Green>\n        <rdf:Seq>\n${(
                ((aiAdjustments as any).tone_curve_green as any[]) || []
              )
                .map(
                  p =>
                    `          <rdf:li>${Math.max(
                      0,
                      Math.min(255, Math.round(p.input || 0))
                    )}, ${Math.max(0, Math.min(255, Math.round(p.output || 0)))}</rdf:li>`
                )
                .join('\n')}\n        </rdf:Seq>\n      </crs:ToneCurvePV2012Green>\n`
            : '',
          (aiAdjustments as any).tone_curve_blue
            ? `<crs:ToneCurvePV2012Blue>\n        <rdf:Seq>\n${(
                ((aiAdjustments as any).tone_curve_blue as any[]) || []
              )
                .map(
                  p =>
                    `          <rdf:li>${Math.max(
                      0,
                      Math.min(255, Math.round(p.input || 0))
                    )}, ${Math.max(0, Math.min(255, Math.round(p.output || 0)))}</rdf:li>`
                )
                .join('\n')}\n        </rdf:Seq>\n      </crs:ToneCurvePV2012Blue>\n`
            : '',
        ].join('')
      : '';

    const hslBlock = inc.hsl
      ? [
          tag('HueAdjustmentRed', round(clamp((aiAdjustments as any).hue_red, -100, 100))),
          tag('HueAdjustmentOrange', (aiAdjustments as any).hue_orange),
          tag('HueAdjustmentYellow', (aiAdjustments as any).hue_yellow),
          tag('HueAdjustmentGreen', (aiAdjustments as any).hue_green),
          tag('HueAdjustmentAqua', (aiAdjustments as any).hue_aqua),
          tag('HueAdjustmentBlue', (aiAdjustments as any).hue_blue),
          tag('HueAdjustmentPurple', (aiAdjustments as any).hue_purple),
          tag('HueAdjustmentMagenta', (aiAdjustments as any).hue_magenta),
          tag('SaturationAdjustmentRed', round(clamp((aiAdjustments as any).sat_red, -100, 100))),
          tag('SaturationAdjustmentOrange', (aiAdjustments as any).sat_orange),
          tag('SaturationAdjustmentYellow', (aiAdjustments as any).sat_yellow),
          tag('SaturationAdjustmentGreen', (aiAdjustments as any).sat_green),
          tag('SaturationAdjustmentAqua', (aiAdjustments as any).sat_aqua),
          tag('SaturationAdjustmentBlue', (aiAdjustments as any).sat_blue),
          tag('SaturationAdjustmentPurple', (aiAdjustments as any).sat_purple),
          tag('SaturationAdjustmentMagenta', (aiAdjustments as any).sat_magenta),
          tag('LuminanceAdjustmentRed', round(clamp((aiAdjustments as any).lum_red, -100, 100))),
          tag('LuminanceAdjustmentOrange', (aiAdjustments as any).lum_orange),
          tag('LuminanceAdjustmentYellow', (aiAdjustments as any).lum_yellow),
          tag('LuminanceAdjustmentGreen', (aiAdjustments as any).lum_green),
          tag('LuminanceAdjustmentAqua', (aiAdjustments as any).lum_aqua),
          tag('LuminanceAdjustmentBlue', (aiAdjustments as any).lum_blue),
          tag('LuminanceAdjustmentPurple', (aiAdjustments as any).lum_purple),
          tag('LuminanceAdjustmentMagenta', (aiAdjustments as any).lum_magenta),
        ].join('')
      : '';

    const colorGradingBlock = inc.colorGrading
      ? [
          tag(
            'ColorGradeShadowHue',
            round(clamp((aiAdjustments as any).color_grade_shadow_hue, 0, 360))
          ),
          tag(
            'ColorGradeShadowSat',
            round(clamp((aiAdjustments as any).color_grade_shadow_sat, 0, 100))
          ),
          tag(
            'ColorGradeShadowLum',
            round(clamp((aiAdjustments as any).color_grade_shadow_lum, -100, 100))
          ),
          tag(
            'ColorGradeMidtoneHue',
            round(clamp((aiAdjustments as any).color_grade_midtone_hue, 0, 360))
          ),
          tag(
            'ColorGradeMidtoneSat',
            round(clamp((aiAdjustments as any).color_grade_midtone_sat, 0, 100))
          ),
          tag(
            'ColorGradeMidtoneLum',
            round(clamp((aiAdjustments as any).color_grade_midtone_lum, -100, 100))
          ),
          tag(
            'ColorGradeHighlightHue',
            round(clamp((aiAdjustments as any).color_grade_highlight_hue, 0, 360))
          ),
          tag(
            'ColorGradeHighlightSat',
            round(clamp((aiAdjustments as any).color_grade_highlight_sat, 0, 100))
          ),
          tag(
            'ColorGradeHighlightLum',
            round(clamp((aiAdjustments as any).color_grade_highlight_lum, -100, 100))
          ),
          tag(
            'ColorGradeGlobalHue',
            round(clamp((aiAdjustments as any).color_grade_global_hue, 0, 360))
          ),
          tag(
            'ColorGradeGlobalSat',
            round(clamp((aiAdjustments as any).color_grade_global_sat, 0, 100))
          ),
          tag(
            'ColorGradeGlobalLum',
            round(clamp((aiAdjustments as any).color_grade_global_lum, -100, 100))
          ),
          tag(
            'ColorGradeBlending',
            round(clamp((aiAdjustments as any).color_grade_blending, 0, 100))
          ),
          tag(
            'ColorGradeBalance',
            round(clamp((aiAdjustments as any).color_grade_balance, -100, 100))
          ),
        ].join('')
      : '';

    const pointColorBlocks = inc.pointColor
      ? [
          Array.isArray((aiAdjustments as any).point_colors) &&
          (aiAdjustments as any).point_colors.length > 0
            ? `<crs:PointColors>\n    <rdf:Seq>\n${(
                (aiAdjustments as any).point_colors as number[][]
              )
                .map(
                  arr =>
                    `     <rdf:li>${arr
                      .map(n =>
                        Number.isFinite(n)
                          ? (Math.round((n as number) * 1000000) / 1000000).toFixed(6)
                          : '0.000000'
                      )
                      .join(', ')}</rdf:li>`
                )
                .join('\n')}\n    </rdf:Seq>\n   </crs:PointColors>\n`
            : '',
          Array.isArray((aiAdjustments as any).color_variance) &&
          (aiAdjustments as any).color_variance.length > 0
            ? `<crs:ColorVariance>\n    <rdf:Seq>\n${(
                (aiAdjustments as any).color_variance as number[]
              )
                .map(
                  n =>
                    `     <rdf:li>${
                      Number.isFinite(n)
                        ? (Math.round((n as number) * 1000000) / 1000000).toFixed(6)
                        : '0.000000'
                    }</rdf:li>`
                )
                .join('\n')}\n    </rdf:Seq>\n   </crs:ColorVariance>\n`
            : '',
        ].join('')
      : '';

    // Optional Masks block (local adjustments) from AI
    const masksBlock = (() => {
      if (!inc.masks) return '';
      const masks = (aiAdjustments as any)?.masks as any[] | undefined;
      if (!Array.isArray(masks) || masks.length === 0) return '';
      console.log(`[XMP] Exporting ${masks.length} mask(s) to XMP:`, masks.map(m => m.name).join(', '));
      const num = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
      const fmt = (v: any) =>
        typeof v === 'number' && Number.isFinite(v)
          ? (Math.round(v * 1000000) / 1000000).toFixed(6)
          : undefined;
      const corrAttrs = (adj: any) => {
        const map: Record<string, any> = {
          LocalExposure2012: num(adj?.local_exposure),
          LocalContrast2012: num(adj?.local_contrast),
          LocalHighlights2012: num(adj?.local_highlights),
          LocalShadows2012: num(adj?.local_shadows),
          LocalWhites2012: num(adj?.local_whites),
          LocalBlacks2012: num(adj?.local_blacks),
          LocalClarity2012: num(adj?.local_clarity),
          LocalDehaze: num(adj?.local_dehaze),
          LocalTemperature: num(adj?.local_temperature),
          LocalTint: num(adj?.local_tint),
          LocalTexture: num(adj?.local_texture),
          LocalSaturation: num(adj?.local_saturation),
        };
        return Object.entries(map)
          .filter(([, v]) => typeof v === 'number')
          .map(([k, v]) => ` crs:${k}="${fmt(v)}"`)
          .join('');
      };
      const items = masks
        .map((m, i) => {
          const name = (m?.name && String(m.name).trim()) || `Mask ${i + 1}`;
          const cAttrs = corrAttrs(m?.adjustments || {});
          let maskGeom = '';
          if (m?.type === 'subject') {
            // Subject/People mask - MaskSubType="1"
            maskGeom = `<rdf:li crs:What="Mask/Image" crs:MaskActive="true" crs:MaskName="${name}" crs:MaskBlendMode="0" crs:MaskInverted="${
              m?.inverted ? 'true' : 'false'
            }" crs:MaskValue="1" crs:MaskVersion="1" crs:MaskSubType="1" crs:ReferencePoint="${
              fmt(m?.referenceX) || '0.500000'
            } ${fmt(m?.referenceY) || '0.500000'}" crs:ErrorReason="0"/>`;
          } else if (m?.type === 'background') {
            // Background mask - MaskSubType="0" with SubCategoryID
            const subCategoryId = (typeof m?.subCategoryId === 'number' && Number.isFinite(m.subCategoryId)) ? m.subCategoryId : 22;
            console.log(`[XMP] Background mask subCategoryId: ${subCategoryId} (original: ${m?.subCategoryId})`);
            maskGeom = `<rdf:li crs:What="Mask/Image" crs:MaskActive="true" crs:MaskName="${name}" crs:MaskBlendMode="0" crs:MaskInverted="${
              m?.inverted ? 'true' : 'false'
            }" crs:MaskValue="1" crs:MaskVersion="1" crs:MaskSubType="0" crs:MaskSubCategoryID="${subCategoryId}" crs:ReferencePoint="${
              fmt(m?.referenceX) || '0.500000'
            } ${fmt(m?.referenceY) || '0.500000'}" crs:ErrorReason="0"/>`;
          } else if (m?.type === 'sky') {
            // Sky mask - similar to background but different category
            maskGeom = `<rdf:li crs:What="Mask/Image" crs:MaskActive="true" crs:MaskName="${name}" crs:MaskBlendMode="0" crs:MaskInverted="${
              m?.inverted ? 'true' : 'false'
            }" crs:MaskValue="1" crs:MaskVersion="1" crs:MaskSubType="0" crs:MaskSubCategoryID="2" crs:ReferencePoint="${
              fmt(m?.referenceX) || '0.500000'
            } ${fmt(m?.referenceY) || '0.500000'}" crs:ErrorReason="0"/>`;
          } else if (m?.type === 'radial') {
            maskGeom = `<rdf:li crs:What="Mask/CircularGradient" crs:MaskActive="true" crs:MaskName="${name}" crs:MaskBlendMode="0" crs:MaskInverted="${
              m?.inverted ? 'true' : 'false'
            }" crs:MaskValue="1" crs:Top="${fmt(m?.top) || '0.15'}" crs:Left="${
              fmt(m?.left) || '0.15'
            }" crs:Bottom="${fmt(m?.bottom) || '0.85'}" crs:Right="${
              fmt(m?.right) || '0.85'
            }" crs:Angle="${num(m?.angle) ?? 0}" crs:Midpoint="${
              num(m?.midpoint) ?? 50
            }" crs:Roundness="${num(m?.roundness) ?? 0}" crs:Feather="${
              num(m?.feather) ?? 50
            }" crs:Flipped="${m?.flipped ? 'true' : 'true'}" crs:Version="2"/>`;
          } else if (m?.type === 'linear') {
            maskGeom = `<rdf:li crs:What="Mask/Gradient" crs:MaskActive="true" crs:MaskName="${name}" crs:MaskBlendMode="0" crs:MaskInverted="${
              m?.inverted ? 'true' : 'false'
            }" crs:MaskValue="1" crs:ZeroX="${fmt(m?.zeroX) || '0.50'}" crs:ZeroY="${
              fmt(m?.zeroY) || '0.00'
            }" crs:FullX="${fmt(m?.fullX) || '0.50'}" crs:FullY="${fmt(m?.fullY) || '0.40'}"/>`;
          }
          return `
          <rdf:li>
            <rdf:Description crs:What="Correction" crs:CorrectionAmount="1" crs:CorrectionActive="true" crs:CorrectionName="${name}"${cAttrs}>
              <crs:CorrectionMasks>
                <rdf:Seq>
                  ${maskGeom}
                </rdf:Seq>
              </crs:CorrectionMasks>
            </rdf:Description>
          </rdf:li>`;
        })
        .join('\n');
      return `
      <crs:MaskGroupBasedCorrections>
        <rdf:Seq>
          ${items}
        </rdf:Seq>
      </crs:MaskGroupBasedCorrections>`;
    })();

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

      ${wbBasicBlock}
      ${exposureBlock}

      <!-- Parametric Tone Regions (optional) -->
      ${parametricCurvesBlock}

      <!-- PV2012 Tone Curves (optional) -->
      ${toneCurvesBlock}

      <!-- HSL Adjustments (optional) -->
      ${hslBlock}

      <!-- Color Grading (Modern) -->
      ${colorGradingBlock}

      <!-- Point Color (if provided) -->
      ${pointColorBlocks}

      <!-- Film Grain (optional) -->
      ${
        inc.grain
          ? [
              tag('GrainAmount', round(clamp((aiAdjustments as any).grain_amount, 0, 100))),
              tag('GrainSize', round(clamp((aiAdjustments as any).grain_size, 0, 100))),
              tag('GrainFrequency', round(clamp((aiAdjustments as any).grain_frequency, 0, 100))),
            ].join('')
          : ''
      }

      <!-- Masks (optional) -->
      ${masksBlock}
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`;
    return xmp;
  }

  generateLUTContent(
    aiAdjustments: AIColorAdjustments,
    size: number = 33,
    format: string = 'cube'
  ): string {
    return generateLUTContentImpl(aiAdjustments, size, format);
  }

  private generateCubeLUT(adjustments: any, size: number): string {
    let lut = `# Created by FotoRecipeWizard
# LUT size: ${size}
# Description: AI-generated color grading

LUT_3D_SIZE ${size}

`;

    // Generate 3D LUT entries
    for (let r = 0; r < size; r++) {
      for (let g = 0; g < size; g++) {
        for (let b = 0; b < size; b++) {
          // Normalize input values to [0,1]
          const inputR = r / (size - 1);
          const inputG = g / (size - 1);
          const inputB = b / (size - 1);

          // Apply color transformations
          const [outputR, outputG, outputB] = this.applyColorTransform(
            inputR,
            inputG,
            inputB,
            adjustments
          );

          // Write LUT entry
          lut += `${outputR.toFixed(6)} ${outputG.toFixed(6)} ${outputB.toFixed(6)}\n`;
        }
      }
    }

    return lut;
  }

  private generate3DLLUT(adjustments: any, size: number): string {
    let lut = `3DMESH
Mesh ${size} ${size} ${size}

`;

    // Generate 3D LUT entries for Autodesk format
    for (let r = 0; r < size; r++) {
      for (let g = 0; g < size; g++) {
        for (let b = 0; b < size; b++) {
          const inputR = r / (size - 1);
          const inputG = g / (size - 1);
          const inputB = b / (size - 1);

          const [outputR, outputG, outputB] = this.applyColorTransform(
            inputR,
            inputG,
            inputB,
            adjustments
          );

          lut += `${(outputR * 1023).toFixed(0)} ${(outputG * 1023).toFixed(0)} ${(
            outputB * 1023
          ).toFixed(0)}\n`;
        }
      }
    }

    return lut;
  }

  private generateDaVinciLUT(adjustments: any, size: number): string {
    let lut = `# Created by FotoRecipeWizard
# DaVinci Resolve LUT
# Size: ${size}x${size}x${size}

`;

    // Generate entries in DaVinci format
    for (let r = 0; r < size; r++) {
      for (let g = 0; g < size; g++) {
        for (let b = 0; b < size; b++) {
          const inputR = r / (size - 1);
          const inputG = g / (size - 1);
          const inputB = b / (size - 1);

          const [outputR, outputG, outputB] = this.applyColorTransform(
            inputR,
            inputG,
            inputB,
            adjustments
          );

          lut += `${outputR.toFixed(6)} ${outputG.toFixed(6)} ${outputB.toFixed(6)}\n`;
        }
      }
    }

    return lut;
  }

  private applyColorTransform(
    r: number,
    g: number,
    b: number,
    adjustments: any
  ): [number, number, number] {
    let newR = r;
    let newG = g;
    let newB = b;

    // Apply white balance (temperature and tint) first
    if (adjustments.temperature !== 5000 || adjustments.tint !== 0) {
      // Convert temperature to color temperature multipliers
      // Simplified approximation - cooler temps increase blue, warmer increase red/yellow
      // Clamp normalization to [-1, 1] to avoid extreme color casts
      const tempNormalized = Math.max(-1, Math.min(1, (adjustments.temperature - 5000) / 2000));
      const tintNormalized = Math.max(-1, Math.min(1, adjustments.tint / 150));

      // Apply temperature correction (simplified)
      if (tempNormalized < 0) {
        // Cooler - reduce red, increase blue
        newR *= 1 + tempNormalized * 0.2;
        newB *= 1 - tempNormalized * 0.1;
      } else {
        // Warmer - increase red/yellow, reduce blue
        newR *= 1 + tempNormalized * 0.1;
        newG *= 1 + tempNormalized * 0.05;
        newB *= 1 - tempNormalized * 0.1;
      }

      // Apply tint correction (green-magenta)
      if (tintNormalized > 0) {
        // More magenta
        newR *= 1 + tintNormalized * 0.05;
        newB *= 1 + tintNormalized * 0.05;
        newG *= 1 - tintNormalized * 0.05;
      } else {
        // More green
        newG *= 1 - tintNormalized * 0.05;
      }
    }

    // Apply exposure adjustment
    if (adjustments.exposure !== 0) {
      const exposureFactor = Math.pow(2, adjustments.exposure);
      newR *= exposureFactor;
      newG *= exposureFactor;
      newB *= exposureFactor;
    }

    // Apply contrast adjustment (fixed power curve)
    if (adjustments.contrast !== 0) {
      const contrast =
        adjustments.contrast > 0 ? 1 + adjustments.contrast : 1 / (1 - adjustments.contrast);
      newR = Math.pow(Math.max(0, newR), contrast);
      newG = Math.pow(Math.max(0, newG), contrast);
      newB = Math.pow(Math.max(0, newB), contrast);
    }

    // Apply highlight/shadow adjustments (improved)
    const luminance = 0.299 * newR + 0.587 * newG + 0.114 * newB;

    if (adjustments.highlights !== 0 && luminance > 0.5) {
      const highlightMask = Math.pow((luminance - 0.5) * 2, 2); // Smooth curve for highlights
      const factor = 1 + adjustments.highlights * highlightMask * 0.5;
      newR *= factor;
      newG *= factor;
      newB *= factor;
    }

    if (adjustments.shadows !== 0 && luminance < 0.5) {
      const shadowMask = Math.pow((0.5 - luminance) * 2, 2); // Smooth curve for shadows
      const factor = 1 + adjustments.shadows * shadowMask * 0.5;
      newR *= factor;
      newG *= factor;
      newB *= factor;
    }

    // Apply saturation
    if (adjustments.saturation !== 0) {
      const satFactor = 1 + adjustments.saturation;
      const gray = 0.299 * newR + 0.587 * newG + 0.114 * newB;
      newR = gray + (newR - gray) * satFactor;
      newG = gray + (newG - gray) * satFactor;
      newB = gray + (newB - gray) * satFactor;
    }

    // Apply vibrance (fixed calculation)
    if (adjustments.vibrance !== 0) {
      const gray = 0.299 * newR + 0.587 * newG + 0.114 * newB;
      const maxChannel = Math.max(newR, newG, newB);
      const minChannel = Math.min(newR, newG, newB);
      const currentSaturation = maxChannel > 0 ? (maxChannel - minChannel) / maxChannel : 0;

      // Vibrance affects less saturated colors more
      const vibranceEffect = (1 - currentSaturation) * adjustments.vibrance * 0.5;
      const vibFactor = 1 + vibranceEffect;

      newR = gray + (newR - gray) * vibFactor;
      newG = gray + (newG - gray) * vibFactor;
      newB = gray + (newB - gray) * vibFactor;
    }

    // Clamp values to valid range
    newR = Math.max(0, Math.min(1, newR));
    newG = Math.max(0, Math.min(1, newG));
    newB = Math.max(0, Math.min(1, newB));

    return [newR, newG, newB];
  }
}
