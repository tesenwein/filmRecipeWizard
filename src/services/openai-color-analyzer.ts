import OpenAI from 'openai';
import * as path from 'path';
import sharp from 'sharp';
import { buildUserContentForAnalysis } from './prompt';
import type { AIColorAdjustments } from './types';
export type { AIColorAdjustments } from './types';

export class OpenAIColorAnalyzer {
  private openai: OpenAI | null = null;
  private initialized = false;
  private model: string = 'gpt-5';

  constructor(apiKey?: string) {
    // OpenAI API key from settings or environment variable
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (key) {
      this.openai = new OpenAI({
        apiKey: key,
      });
      this.initialized = true;
      console.log('[AI] OpenAI Color Analyzer initialized');
    } else {
      console.warn('[AI] OpenAI API key not provided');
    }
  }

  async analyzeColorMatch(
    baseImagePath: string | undefined,
    targetImagePath: string,
    hint?: string,
    baseImageBase64?: string | string[],
    targetImageBase64?: string,
    options?: { preserveSkinTones?: boolean; emphasize3DPop?: boolean }
  ): Promise<AIColorAdjustments> {
    if (!this.initialized || !this.openai) {
      throw new Error(
        'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.'
      );
    }

    console.log('[AI] Starting AI-powered color analysis');

    // Use provided base64 data first; otherwise, convert from file path if available
    const baseImageB64 = baseImageBase64
      ? baseImageBase64
      : baseImagePath
      ? await this.convertToBase64Jpeg(baseImagePath)
      : undefined;
    const targetImageB64 = targetImageBase64 || (await this.convertToBase64Jpeg(targetImagePath));

    let completion;
    try {
      console.log(`[AI] Calling OpenAI API with model: ${this.model}`);

      // Build content via helper (use auto-recognition masks for humans)
      if (options?.emphasize3DPop) {
        console.log(
          '[AI] Emphasize 3D Pop enabled - allow subtle Subject/Background separation if beneficial'
        );
      }
      const userContent: any[] = buildUserContentForAnalysis(
        baseImageB64 as any,
        targetImageB64,
        hint,
        {
          preserveSkinTones: options?.preserveSkinTones,
          emphasize3DPop: options?.emphasize3DPop,
        }
      );

      // Debug: Log the complete prompt content being sent
      console.log('[AI] === PROMPT DEBUG START ===');
      console.log('[AI] Model:', this.model);
      console.log('[AI] User content parts:', userContent.length);
      userContent.forEach((content, index) => {
        if (content.type === 'text') {
          console.log(`[AI] Text part ${index + 1}:`, content.text);
        } else if (content.type === 'image_url') {
          console.log(
            `[AI] Image part ${index + 1}: Base64 image (${content.image_url.url.length} chars)`
          );
        }
      });
      console.log('[AI] === PROMPT DEBUG END ===');

      const toolChoice = 'auto';

      completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: userContent,
          },
        ],
        tools: [
          // Back-compat: single-call function that returns the full object (including masks)
          {
            type: 'function',
            function: {
              name: 'generate_color_adjustments',
              description:
                'Generate precise Lightroom/Camera Raw adjustments to match target image to base image style',
              parameters: {
                type: 'object',
                properties: {
                  preset_name: {
                    type: 'string',
                    description: 'Short, friendly preset name to use for XMP and recipe title',
                  },
                  treatment: {
                    type: 'string',
                    description:
                      "Overall treatment for the target image ('color' or 'black_and_white')",
                    enum: ['color', 'black_and_white'],
                  },
                  camera_profile: {
                    type: 'string',
                    description:
                      "Preferred camera profile (e.g., 'Adobe Color', 'Adobe Monochrome')",
                  },
                  monochrome: {
                    type: 'boolean',
                    description: 'If true, produce a black & white (monochrome) result',
                  },
                  point_colors: {
                    type: 'array',
                    description:
                      'Optional Lightroom Point Colors raw parameter arrays (advanced users)',
                    items: {
                      type: 'array',
                      items: { type: 'number' },
                    },
                  },
                  color_variance: {
                    type: 'array',
                    description: 'Optional Lightroom Point Colors variance array (advanced users)',
                    items: { type: 'number' },
                  },
                  exposure: {
                    type: 'number',
                    description: 'Exposure adjustment in stops (-5.0 to +5.0)',
                    minimum: -5.0,
                    maximum: 5.0,
                  },
                  temperature: {
                    type: 'number',
                    description: 'White balance temperature in Kelvin (2000 to 50000)',
                    minimum: 2000,
                    maximum: 50000,
                  },
                  tint: {
                    type: 'number',
                    description:
                      'White balance tint (-150 to +150, negative=green, positive=magenta)',
                    minimum: -150,
                    maximum: 150,
                  },
                  highlights: {
                    type: 'number',
                    description: 'Highlights recovery (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  shadows: {
                    type: 'number',
                    description: 'Shadows lift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  whites: {
                    type: 'number',
                    description: 'Whites adjustment (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  blacks: {
                    type: 'number',
                    description: 'Blacks adjustment (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  brightness: {
                    type: 'number',
                    description: 'Legacy brightness adjustment (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  contrast: {
                    type: 'number',
                    description: 'Contrast adjustment (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  clarity: {
                    type: 'number',
                    description: 'Clarity/structure adjustment (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  vibrance: {
                    type: 'number',
                    description: 'Vibrance adjustment (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  saturation: {
                    type: 'number',
                    description: 'Saturation adjustment (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  hue_red: {
                    type: 'number',
                    description: 'Red hue shift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  hue_orange: {
                    type: 'number',
                    description: 'Orange hue shift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  hue_yellow: {
                    type: 'number',
                    description: 'Yellow hue shift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  hue_green: {
                    type: 'number',
                    description: 'Green hue shift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  hue_aqua: {
                    type: 'number',
                    description: 'Aqua hue shift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  hue_blue: {
                    type: 'number',
                    description: 'Blue hue shift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  hue_purple: {
                    type: 'number',
                    description: 'Purple hue shift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  hue_magenta: {
                    type: 'number',
                    description: 'Magenta hue shift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  // HSL per-color controls
                  sat_red: {
                    type: 'number',
                    description: 'Red saturation shift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  sat_orange: {
                    type: 'number',
                    description: 'Orange saturation shift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  sat_yellow: {
                    type: 'number',
                    description: 'Yellow saturation shift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  sat_green: {
                    type: 'number',
                    description: 'Green saturation shift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  sat_aqua: {
                    type: 'number',
                    description: 'Aqua saturation shift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  sat_blue: {
                    type: 'number',
                    description: 'Blue saturation shift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  sat_purple: {
                    type: 'number',
                    description: 'Purple saturation shift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  sat_magenta: {
                    type: 'number',
                    description: 'Magenta saturation shift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  lum_red: {
                    type: 'number',
                    description: 'Red luminance shift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  lum_orange: {
                    type: 'number',
                    description: 'Orange luminance shift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  lum_yellow: {
                    type: 'number',
                    description: 'Yellow luminance shift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  lum_green: {
                    type: 'number',
                    description: 'Green luminance shift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  lum_aqua: {
                    type: 'number',
                    description: 'Aqua luminance shift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  lum_blue: {
                    type: 'number',
                    description: 'Blue luminance shift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  lum_purple: {
                    type: 'number',
                    description: 'Purple luminance shift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  lum_magenta: {
                    type: 'number',
                    description: 'Magenta luminance shift (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  // Additional develop settings
                  texture: {
                    type: 'number',
                    description: 'Texture (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  dehaze: {
                    type: 'number',
                    description: 'Dehaze (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  // Parametric tone curve regions (PV2012)
                  parametric_shadows: {
                    type: 'number',
                    description: 'Parametric Shadows (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  parametric_darks: {
                    type: 'number',
                    description: 'Parametric Darks (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  parametric_lights: {
                    type: 'number',
                    description: 'Parametric Lights (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  parametric_highlights: {
                    type: 'number',
                    description: 'Parametric Highlights (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  parametric_shadow_split: {
                    type: 'number',
                    description: 'Parametric Shadow Split (0-100)',
                    minimum: 0,
                    maximum: 100,
                  },
                  parametric_midtone_split: {
                    type: 'number',
                    description: 'Parametric Midtone Split (0-100)',
                    minimum: 0,
                    maximum: 100,
                  },
                  parametric_highlight_split: {
                    type: 'number',
                    description: 'Parametric Highlight Split (0-100)',
                    minimum: 0,
                    maximum: 100,
                  },
                  sharpening: {
                    type: 'number',
                    description: 'Sharpening amount (0 to 150)',
                    minimum: 0,
                    maximum: 150,
                  },
                  sharpening_radius: {
                    type: 'number',
                    description: 'Sharpening radius (0.5 to 3.0)',
                    minimum: 0.5,
                    maximum: 3.0,
                  },
                  sharpening_detail: {
                    type: 'number',
                    description: 'Sharpening detail (0 to 100)',
                    minimum: 0,
                    maximum: 100,
                  },
                  sharpening_masking: {
                    type: 'number',
                    description: 'Sharpening masking (0 to 100)',
                    minimum: 0,
                    maximum: 100,
                  },
                  luminance_noise_reduction: {
                    type: 'number',
                    description: 'Luminance NR (0 to 100)',
                    minimum: 0,
                    maximum: 100,
                  },
                  color_noise_reduction: {
                    type: 'number',
                    description: 'Color NR (0 to 100)',
                    minimum: 0,
                    maximum: 100,
                  },
                  vignette: {
                    type: 'number',
                    description: 'Post-crop vignette amount (-100 to 100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  // Camera Calibration and Shadow Tint
                  shadow_tint: {
                    type: 'number',
                    description: 'Shadow Tint (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  calib_red_hue: {
                    type: 'number',
                    description: 'Calibration Red Hue (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  calib_red_sat: {
                    type: 'number',
                    description: 'Calibration Red Saturation (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  calib_green_hue: {
                    type: 'number',
                    description: 'Calibration Green Hue (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  calib_green_sat: {
                    type: 'number',
                    description: 'Calibration Green Saturation (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  calib_blue_hue: {
                    type: 'number',
                    description: 'Calibration Blue Hue (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  calib_blue_sat: {
                    type: 'number',
                    description: 'Calibration Blue Saturation (-100 to +100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  // Curves: 0-255 pairs for PV2012 tone curve
                  tone_curve: {
                    type: 'array',
                    description: 'Composite tone curve control points (0-255 input/output)',
                    items: {
                      type: 'object',
                      properties: {
                        input: { type: 'number', minimum: 0, maximum: 255 },
                        output: { type: 'number', minimum: 0, maximum: 255 },
                      },
                      required: ['input', 'output'],
                    },
                  },
                  tone_curve_red: {
                    type: 'array',
                    description: 'Red channel tone curve points',
                    items: {
                      type: 'object',
                      properties: {
                        input: { type: 'number', minimum: 0, maximum: 255 },
                        output: { type: 'number', minimum: 0, maximum: 255 },
                      },
                      required: ['input', 'output'],
                    },
                  },
                  tone_curve_green: {
                    type: 'array',
                    description: 'Green channel tone curve points',
                    items: {
                      type: 'object',
                      properties: {
                        input: { type: 'number', minimum: 0, maximum: 255 },
                        output: { type: 'number', minimum: 0, maximum: 255 },
                      },
                      required: ['input', 'output'],
                    },
                  },
                  tone_curve_blue: {
                    type: 'array',
                    description: 'Blue channel tone curve points',
                    items: {
                      type: 'object',
                      properties: {
                        input: { type: 'number', minimum: 0, maximum: 255 },
                        output: { type: 'number', minimum: 0, maximum: 255 },
                      },
                      required: ['input', 'output'],
                    },
                  },
                  // Modern Color Grading (LR/ACR)
                  color_grade_shadow_hue: {
                    type: 'number',
                    description: 'Shadow color grade hue (degrees, 0-360)',
                    minimum: 0,
                    maximum: 360,
                  },
                  color_grade_shadow_sat: {
                    type: 'number',
                    description: 'Shadow color grade saturation (0-100)',
                    minimum: 0,
                    maximum: 100,
                  },
                  color_grade_shadow_lum: {
                    type: 'number',
                    description: 'Shadow color grade luminance (-100 to 100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  color_grade_midtone_hue: {
                    type: 'number',
                    description: 'Midtone color grade hue (degrees, 0-360)',
                    minimum: 0,
                    maximum: 360,
                  },
                  color_grade_midtone_sat: {
                    type: 'number',
                    description: 'Midtone color grade saturation (0-100)',
                    minimum: 0,
                    maximum: 100,
                  },
                  color_grade_midtone_lum: {
                    type: 'number',
                    description: 'Midtone color grade luminance (-100 to 100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  color_grade_highlight_hue: {
                    type: 'number',
                    description: 'Highlight color grade hue (degrees, 0-360)',
                    minimum: 0,
                    maximum: 360,
                  },
                  color_grade_highlight_sat: {
                    type: 'number',
                    description: 'Highlight color grade saturation (0-100)',
                    minimum: 0,
                    maximum: 100,
                  },
                  color_grade_highlight_lum: {
                    type: 'number',
                    description: 'Highlight color grade luminance (-100 to 100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  color_grade_global_hue: {
                    type: 'number',
                    description: 'Global color grade hue (degrees, 0-360)',
                    minimum: 0,
                    maximum: 360,
                  },
                  color_grade_global_sat: {
                    type: 'number',
                    description: 'Global color grade saturation (0-100)',
                    minimum: 0,
                    maximum: 100,
                  },
                  color_grade_global_lum: {
                    type: 'number',
                    description: 'Global color grade luminance (-100 to 100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  color_grade_blending: {
                    type: 'number',
                    description: 'Color grade blending (0-100)',
                    minimum: 0,
                    maximum: 100,
                  },
                  color_grade_balance: {
                    type: 'number',
                    description: 'Color grade balance between shadows/highlights (-100 to 100)',
                    minimum: -100,
                    maximum: 100,
                  },
                  confidence: {
                    type: 'number',
                    description: 'Confidence level in the adjustments (0.0 to 1.0)',
                    minimum: 0.0,
                    maximum: 1.0,
                  },
                  reasoning: {
                    type: 'string',
                    description:
                      'Explanation of why these adjustments were chosen and what they achieve',
                  },
                  // Film Grain
                  grain_amount: {
                    type: 'number',
                    description: 'Film grain amount (0 to 100)',
                    minimum: 0,
                    maximum: 100,
                  },
                  grain_size: {
                    type: 'number',
                    description: 'Film grain size (0 to 100)',
                    minimum: 0,
                    maximum: 100,
                  },
                  grain_frequency: {
                    type: 'number',
                    description: 'Film grain frequency (0 to 100)',
                    minimum: 0,
                    maximum: 100,
                  },
                  masks: {
                    type: 'array',
                    description: 'Optional local adjustment masks to refine the look',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        type: {
                          type: 'string',
                          enum: [
                            'radial',
                            'linear',
                            'person',
                            'subject',
                            'background',
                            'sky',
                            'range_color',
                            'range_luminance',
                          ],
                        },
                        adjustments: {
                          type: 'object',
                          properties: {
                            local_exposure: { type: 'number', minimum: -5, maximum: 5 },
                            local_contrast: { type: 'number', minimum: -1, maximum: 1 },
                            local_highlights: { type: 'number', minimum: -1, maximum: 1 },
                            local_shadows: { type: 'number', minimum: -1, maximum: 1 },
                            local_whites: { type: 'number', minimum: -1, maximum: 1 },
                            local_blacks: { type: 'number', minimum: -1, maximum: 1 },
                            local_clarity: { type: 'number', minimum: -1, maximum: 1 },
                            local_dehaze: { type: 'number', minimum: -1, maximum: 1 },
                            local_temperature: { type: 'number', minimum: -1, maximum: 1 },
                            local_tint: { type: 'number', minimum: -1, maximum: 1 },
                            local_texture: { type: 'number', minimum: -1, maximum: 1 },
                            local_saturation: { type: 'number', minimum: -1, maximum: 1 },
                          },
                        },
                        subCategoryId: { type: 'number' },
                        top: { type: 'number', minimum: 0, maximum: 1 },
                        left: { type: 'number', minimum: 0, maximum: 1 },
                        bottom: { type: 'number', minimum: 0, maximum: 1 },
                        right: { type: 'number', minimum: 0, maximum: 1 },
                        angle: { type: 'number', minimum: -360, maximum: 360 },
                        midpoint: { type: 'number', minimum: 0, maximum: 100 },
                        roundness: { type: 'number', minimum: -100, maximum: 100 },
                        feather: { type: 'number', minimum: 0, maximum: 100 },
                        inverted: { type: 'boolean' },
                        flipped: { type: 'boolean' },
                        zeroX: { type: 'number', minimum: 0, maximum: 1 },
                        zeroY: { type: 'number', minimum: 0, maximum: 1 },
                        fullX: { type: 'number', minimum: 0, maximum: 1 },
                        fullY: { type: 'number', minimum: 0, maximum: 1 },
                        referenceX: { type: 'number', minimum: 0, maximum: 1 },
                        referenceY: { type: 'number', minimum: 0, maximum: 1 },
                        // Range mask parameters (optional)
                        colorAmount: { type: 'number', minimum: 0, maximum: 1 },
                        invert: { type: 'boolean' },
                        pointModels: {
                          type: 'array',
                          items: { type: 'array', items: { type: 'number' } },
                        },
                        lumRange: {
                          type: 'array',
                          items: { type: 'number' },
                          minItems: 4,
                          maxItems: 4,
                        },
                        luminanceDepthSampleInfo: {
                          type: 'array',
                          items: { type: 'number' },
                          minItems: 3,
                          maxItems: 3,
                        },
                      },
                      required: ['type'],
                    },
                  },
                },
              },
            },
          },
          // New: multi-call tool to report global adjustments (no masks)
          {
            type: 'function',
            function: {
              name: 'report_global_adjustments',
              description:
                'Report only global Lightroom/ACR adjustments (do not include masks here). Call once.',
              parameters: {
                type: 'object',
                properties: {
                  preset_name: { type: 'string' },
                  treatment: { type: 'string', enum: ['color', 'black_and_white'] },
                  camera_profile: { type: 'string' },
                  monochrome: { type: 'boolean' },
                  confidence: { type: 'number', minimum: 0, maximum: 1 },
                  reasoning: { type: 'string' },
                  exposure: { type: 'number', minimum: -5.0, maximum: 5.0 },
                  temperature: { type: 'number', minimum: 2000, maximum: 50000 },
                  tint: { type: 'number', minimum: -150, maximum: 150 },
                  highlights: { type: 'number', minimum: -100, maximum: 100 },
                  shadows: { type: 'number', minimum: -100, maximum: 100 },
                  whites: { type: 'number', minimum: -100, maximum: 100 },
                  blacks: { type: 'number', minimum: -100, maximum: 100 },
                  brightness: { type: 'number', minimum: -100, maximum: 100 },
                  contrast: { type: 'number', minimum: -100, maximum: 100 },
                  clarity: { type: 'number', minimum: -100, maximum: 100 },
                  vibrance: { type: 'number', minimum: -100, maximum: 100 },
                  saturation: { type: 'number', minimum: -100, maximum: 100 },
                  hue_red: { type: 'number', minimum: -100, maximum: 100 },
                  hue_orange: { type: 'number', minimum: -100, maximum: 100 },
                  hue_yellow: { type: 'number', minimum: -100, maximum: 100 },
                  hue_green: { type: 'number', minimum: -100, maximum: 100 },
                  hue_aqua: { type: 'number', minimum: -100, maximum: 100 },
                  hue_blue: { type: 'number', minimum: -100, maximum: 100 },
                  hue_purple: { type: 'number', minimum: -100, maximum: 100 },
                  hue_magenta: { type: 'number', minimum: -100, maximum: 100 },
                  sat_red: { type: 'number', minimum: -100, maximum: 100 },
                  sat_orange: { type: 'number', minimum: -100, maximum: 100 },
                  sat_yellow: { type: 'number', minimum: -100, maximum: 100 },
                  sat_green: { type: 'number', minimum: -100, maximum: 100 },
                  sat_aqua: { type: 'number', minimum: -100, maximum: 100 },
                  sat_blue: { type: 'number', minimum: -100, maximum: 100 },
                  sat_purple: { type: 'number', minimum: -100, maximum: 100 },
                  sat_magenta: { type: 'number', minimum: -100, maximum: 100 },
                  lum_red: { type: 'number', minimum: -100, maximum: 100 },
                  lum_orange: { type: 'number', minimum: -100, maximum: 100 },
                  lum_yellow: { type: 'number', minimum: -100, maximum: 100 },
                  lum_green: { type: 'number', minimum: -100, maximum: 100 },
                  lum_aqua: { type: 'number', minimum: -100, maximum: 100 },
                  lum_blue: { type: 'number', minimum: -100, maximum: 100 },
                  lum_purple: { type: 'number', minimum: -100, maximum: 100 },
                  lum_magenta: { type: 'number', minimum: -100, maximum: 100 },
                  // color grading
                  color_grade_shadow_hue: { type: 'number', minimum: 0, maximum: 360 },
                  color_grade_shadow_sat: { type: 'number', minimum: 0, maximum: 100 },
                  color_grade_shadow_lum: { type: 'number', minimum: -100, maximum: 100 },
                  color_grade_midtone_hue: { type: 'number', minimum: 0, maximum: 360 },
                  color_grade_midtone_sat: { type: 'number', minimum: 0, maximum: 100 },
                  color_grade_midtone_lum: { type: 'number', minimum: -100, maximum: 100 },
                  color_grade_highlight_hue: { type: 'number', minimum: 0, maximum: 360 },
                  color_grade_highlight_sat: { type: 'number', minimum: 0, maximum: 100 },
                  color_grade_highlight_lum: { type: 'number', minimum: -100, maximum: 100 },
                  color_grade_global_hue: { type: 'number', minimum: 0, maximum: 360 },
                  color_grade_global_sat: { type: 'number', minimum: 0, maximum: 100 },
                  color_grade_global_lum: { type: 'number', minimum: -100, maximum: 100 },
                  color_grade_blending: { type: 'number', minimum: 0, maximum: 100 },
                  color_grade_balance: { type: 'number', minimum: -100, maximum: 100 },
                  // Film Grain
                  grain_amount: { type: 'number', minimum: 0, maximum: 100 },
                  grain_size: { type: 'number', minimum: 0, maximum: 100 },
                  grain_frequency: { type: 'number', minimum: 0, maximum: 100 },
                  // Parametric curves
                  parametric_shadows: { type: 'number', minimum: -100, maximum: 100 },
                  parametric_darks: { type: 'number', minimum: -100, maximum: 100 },
                  parametric_lights: { type: 'number', minimum: -100, maximum: 100 },
                  parametric_highlights: { type: 'number', minimum: -100, maximum: 100 },
                  parametric_shadow_split: { type: 'number', minimum: 0, maximum: 100 },
                  parametric_midtone_split: { type: 'number', minimum: 0, maximum: 100 },
                  parametric_highlight_split: { type: 'number', minimum: 0, maximum: 100 },
                },
              },
            },
          },
          // Generic per-mask function (back-compat)
          {
            type: 'function',
            function: {
              name: 'add_mask',
              description:
                'Add a single local mask. Call this function once per mask you recommend (max 3).',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Human-friendly mask name' },
                  type: {
                    type: 'string',
                    enum: [
                      'linear',
                      'radial',
                      'person',
                      'subject',
                      'background',
                      'sky',
                      'range_color',
                      'range_luminance',
                    ],
                  },
                  adjustments: {
                    type: 'object',
                    properties: {
                      local_exposure: { type: 'number', minimum: -1, maximum: 1 },
                      local_contrast: { type: 'number', minimum: -1, maximum: 1 },
                      local_highlights: { type: 'number', minimum: -1, maximum: 1 },
                      local_shadows: { type: 'number', minimum: -1, maximum: 1 },
                      local_whites: { type: 'number', minimum: -1, maximum: 1 },
                      local_blacks: { type: 'number', minimum: -1, maximum: 1 },
                      local_clarity: { type: 'number', minimum: -1, maximum: 1 },
                      local_dehaze: { type: 'number', minimum: -1, maximum: 1 },
                      local_temperature: { type: 'number', minimum: -1, maximum: 1 },
                      local_tint: { type: 'number', minimum: -1, maximum: 1 },
                      local_texture: { type: 'number', minimum: -1, maximum: 1 },
                      local_saturation: { type: 'number', minimum: -1, maximum: 1 },
                    },
                  },
                  // Geometry for linear/radial
                  top: { type: 'number', minimum: 0, maximum: 1 },
                  left: { type: 'number', minimum: 0, maximum: 1 },
                  bottom: { type: 'number', minimum: 0, maximum: 1 },
                  right: { type: 'number', minimum: 0, maximum: 1 },
                  angle: { type: 'number', minimum: 0, maximum: 360 },
                  midpoint: { type: 'number', minimum: 0, maximum: 100 },
                  roundness: { type: 'number', minimum: -100, maximum: 100 },
                  feather: { type: 'number', minimum: 0, maximum: 100 },
                  inverted: { type: 'boolean' },
                  flipped: { type: 'boolean' },
                  // Geometry for linear
                  zeroX: { type: 'number', minimum: 0, maximum: 1 },
                  zeroY: { type: 'number', minimum: 0, maximum: 1 },
                  fullX: { type: 'number', minimum: 0, maximum: 1 },
                  fullY: { type: 'number', minimum: 0, maximum: 1 },
                  // Subject/background/sky reference point
                  referenceX: { type: 'number', minimum: 0, maximum: 1 },
                  referenceY: { type: 'number', minimum: 0, maximum: 1 },
                  subCategoryId: { type: 'number' },
                  // Range mask params
                  colorAmount: { type: 'number', minimum: 0, maximum: 1 },
                  invert: { type: 'boolean' },
                  pointModels: {
                    type: 'array',
                    items: { type: 'array', items: { type: 'number' } },
                  },
                  lumRange: { type: 'array', items: { type: 'number' }, minItems: 4, maxItems: 4 },
                  luminanceDepthSampleInfo: {
                    type: 'array',
                    items: { type: 'number' },
                    minItems: 3,
                    maxItems: 3,
                  },
                },
                required: ['type'],
              },
            },
          },
          // Specific mask functions for stronger guidance (call once per mask)
          {
            type: 'function',
            function: {
              name: 'add_linear_mask',
              description:
                'Add a Linear Gradient mask with required geometry and optional local adjustments.',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  inverted: { type: 'boolean' },
                  zeroX: { type: 'number', minimum: 0, maximum: 1 },
                  zeroY: { type: 'number', minimum: 0, maximum: 1 },
                  fullX: { type: 'number', minimum: 0, maximum: 1 },
                  fullY: { type: 'number', minimum: 0, maximum: 1 },
                  adjustments: {
                    type: 'object',
                    properties: {
                      local_exposure: { type: 'number', minimum: -1, maximum: 1 },
                      local_contrast: { type: 'number', minimum: -1, maximum: 1 },
                      local_highlights: { type: 'number', minimum: -1, maximum: 1 },
                      local_shadows: { type: 'number', minimum: -1, maximum: 1 },
                      local_whites: { type: 'number', minimum: -1, maximum: 1 },
                      local_blacks: { type: 'number', minimum: -1, maximum: 1 },
                      local_clarity: { type: 'number', minimum: -1, maximum: 1 },
                      local_dehaze: { type: 'number', minimum: -1, maximum: 1 },
                      local_temperature: { type: 'number', minimum: -1, maximum: 1 },
                      local_tint: { type: 'number', minimum: -1, maximum: 1 },
                      local_texture: { type: 'number', minimum: -1, maximum: 1 },
                      local_saturation: { type: 'number', minimum: -1, maximum: 1 },
                    },
                  },
                },
                required: ['zeroX', 'zeroY', 'fullX', 'fullY'],
              },
            },
          },
          {
            type: 'function',
            function: {
              name: 'add_radial_mask',
              description:
                'Add a Radial Gradient mask with required bounding box and optional local adjustments.',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  inverted: { type: 'boolean' },
                  flipped: { type: 'boolean' },
                  top: { type: 'number', minimum: 0, maximum: 1 },
                  left: { type: 'number', minimum: 0, maximum: 1 },
                  bottom: { type: 'number', minimum: 0, maximum: 1 },
                  right: { type: 'number', minimum: 0, maximum: 1 },
                  angle: { type: 'number', minimum: 0, maximum: 360 },
                  midpoint: { type: 'number', minimum: 0, maximum: 100 },
                  roundness: { type: 'number', minimum: -100, maximum: 100 },
                  feather: { type: 'number', minimum: 0, maximum: 100 },
                  adjustments: {
                    type: 'object',
                    properties: {
                      local_exposure: { type: 'number', minimum: -1, maximum: 1 },
                      local_contrast: { type: 'number', minimum: -1, maximum: 1 },
                      local_highlights: { type: 'number', minimum: -1, maximum: 1 },
                      local_shadows: { type: 'number', minimum: -1, maximum: 1 },
                      local_whites: { type: 'number', minimum: -1, maximum: 1 },
                      local_blacks: { type: 'number', minimum: -1, maximum: 1 },
                      local_clarity: { type: 'number', minimum: -1, maximum: 1 },
                      local_dehaze: { type: 'number', minimum: -1, maximum: 1 },
                      local_temperature: { type: 'number', minimum: -1, maximum: 1 },
                      local_tint: { type: 'number', minimum: -1, maximum: 1 },
                      local_texture: { type: 'number', minimum: -1, maximum: 1 },
                      local_saturation: { type: 'number', minimum: -1, maximum: 1 },
                    },
                  },
                },
                required: ['top', 'left', 'bottom', 'right'],
              },
            },
          },
          {
            type: 'function',
            function: {
              name: 'add_subject_mask',
              description:
                'Add a Subject/People mask with a reference point and optional local adjustments.',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  inverted: { type: 'boolean' },
                  referenceX: { type: 'number', minimum: 0, maximum: 1 },
                  referenceY: { type: 'number', minimum: 0, maximum: 1 },
                  adjustments: {
                    type: 'object',
                    properties: {
                      local_exposure: { type: 'number', minimum: -1, maximum: 1 },
                      local_contrast: { type: 'number', minimum: -1, maximum: 1 },
                      local_highlights: { type: 'number', minimum: -1, maximum: 1 },
                      local_shadows: { type: 'number', minimum: -1, maximum: 1 },
                      local_whites: { type: 'number', minimum: -1, maximum: 1 },
                      local_blacks: { type: 'number', minimum: -1, maximum: 1 },
                      local_clarity: { type: 'number', minimum: -1, maximum: 1 },
                      local_dehaze: { type: 'number', minimum: -1, maximum: 1 },
                      local_temperature: { type: 'number', minimum: -1, maximum: 1 },
                      local_tint: { type: 'number', minimum: -1, maximum: 1 },
                      local_texture: { type: 'number', minimum: -1, maximum: 1 },
                      local_saturation: { type: 'number', minimum: -1, maximum: 1 },
                    },
                  },
                },
                required: ['referenceX', 'referenceY'],
              },
            },
          },
          {
            type: 'function',
            function: {
              name: 'add_background_mask',
              description:
                'Add a Background mask with a reference point and optional local adjustments. Include subCategoryId (typically 22 for general background).',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  inverted: { type: 'boolean' },
                  referenceX: { type: 'number', minimum: 0, maximum: 1 },
                  referenceY: { type: 'number', minimum: 0, maximum: 1 },
                  subCategoryId: {
                    type: 'number',
                    default: 22,
                    description:
                      'Background category ID (22 for general background, 24 for objects, etc.)',
                  },
                  adjustments: {
                    type: 'object',
                    properties: {
                      local_exposure: { type: 'number', minimum: -1, maximum: 1 },
                      local_contrast: { type: 'number', minimum: -1, maximum: 1 },
                      local_highlights: { type: 'number', minimum: -1, maximum: 1 },
                      local_shadows: { type: 'number', minimum: -1, maximum: 1 },
                      local_whites: { type: 'number', minimum: -1, maximum: 1 },
                      local_blacks: { type: 'number', minimum: -1, maximum: 1 },
                      local_clarity: { type: 'number', minimum: -1, maximum: 1 },
                      local_dehaze: { type: 'number', minimum: -1, maximum: 1 },
                      local_temperature: { type: 'number', minimum: -1, maximum: 1 },
                      local_tint: { type: 'number', minimum: -1, maximum: 1 },
                      local_texture: { type: 'number', minimum: -1, maximum: 1 },
                      local_saturation: { type: 'number', minimum: -1, maximum: 1 },
                    },
                  },
                },
                required: ['referenceX', 'referenceY'],
              },
            },
          },
          {
            type: 'function',
            function: {
              name: 'add_sky_mask',
              description: 'Add a Sky mask with a reference point and optional local adjustments.',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  inverted: { type: 'boolean' },
                  referenceX: { type: 'number', minimum: 0, maximum: 1 },
                  referenceY: { type: 'number', minimum: 0, maximum: 1 },
                  adjustments: {
                    type: 'object',
                    properties: {
                      local_exposure: { type: 'number', minimum: -1, maximum: 1 },
                      local_contrast: { type: 'number', minimum: -1, maximum: 1 },
                      local_highlights: { type: 'number', minimum: -1, maximum: 1 },
                      local_shadows: { type: 'number', minimum: -1, maximum: 1 },
                      local_whites: { type: 'number', minimum: -1, maximum: 1 },
                      local_blacks: { type: 'number', minimum: -1, maximum: 1 },
                      local_clarity: { type: 'number', minimum: -1, maximum: 1 },
                      local_dehaze: { type: 'number', minimum: -1, maximum: 1 },
                      local_temperature: { type: 'number', minimum: -1, maximum: 1 },
                      local_tint: { type: 'number', minimum: -1, maximum: 1 },
                      local_texture: { type: 'number', minimum: -1, maximum: 1 },
                      local_saturation: { type: 'number', minimum: -1, maximum: 1 },
                    },
                  },
                },
                required: ['referenceX', 'referenceY'],
              },
            },
          },
          {
            type: 'function',
            function: {
              name: 'add_range_color_mask',
              description:
                'Add a Color Range mask with sample points and amount, plus optional local adjustments.',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  invert: { type: 'boolean' },
                  colorAmount: { type: 'number', minimum: 0, maximum: 1 },
                  pointModels: {
                    type: 'array',
                    items: { type: 'array', items: { type: 'number' } },
                  },
                  adjustments: {
                    type: 'object',
                    properties: {
                      local_exposure: { type: 'number', minimum: -1, maximum: 1 },
                      local_contrast: { type: 'number', minimum: -1, maximum: 1 },
                      local_highlights: { type: 'number', minimum: -1, maximum: 1 },
                      local_shadows: { type: 'number', minimum: -1, maximum: 1 },
                      local_whites: { type: 'number', minimum: -1, maximum: 1 },
                      local_blacks: { type: 'number', minimum: -1, maximum: 1 },
                      local_clarity: { type: 'number', minimum: -1, maximum: 1 },
                      local_dehaze: { type: 'number', minimum: -1, maximum: 1 },
                      local_temperature: { type: 'number', minimum: -1, maximum: 1 },
                      local_tint: { type: 'number', minimum: -1, maximum: 1 },
                      local_texture: { type: 'number', minimum: -1, maximum: 1 },
                      local_saturation: { type: 'number', minimum: -1, maximum: 1 },
                    },
                  },
                },
                required: ['colorAmount'],
              },
            },
          },
          {
            type: 'function',
            function: {
              name: 'add_range_luminance_mask',
              description:
                'Add a Luminance Range mask with range and sampling, plus optional local adjustments.',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  invert: { type: 'boolean' },
                  lumRange: { type: 'array', items: { type: 'number' }, minItems: 4, maxItems: 4 },
                  luminanceDepthSampleInfo: {
                    type: 'array',
                    items: { type: 'number' },
                    minItems: 3,
                    maxItems: 3,
                  },
                  adjustments: {
                    type: 'object',
                    properties: {
                      local_exposure: { type: 'number', minimum: -1, maximum: 1 },
                      local_contrast: { type: 'number', minimum: -1, maximum: 1 },
                      local_highlights: { type: 'number', minimum: -1, maximum: 1 },
                      local_shadows: { type: 'number', minimum: -1, maximum: 1 },
                      local_whites: { type: 'number', minimum: -1, maximum: 1 },
                      local_blacks: { type: 'number', minimum: -1, maximum: 1 },
                      local_clarity: { type: 'number', minimum: -1, maximum: 1 },
                      local_dehaze: { type: 'number', minimum: -1, maximum: 1 },
                      local_temperature: { type: 'number', minimum: -1, maximum: 1 },
                      local_tint: { type: 'number', minimum: -1, maximum: 1 },
                      local_texture: { type: 'number', minimum: -1, maximum: 1 },
                      local_saturation: { type: 'number', minimum: -1, maximum: 1 },
                    },
                  },
                },
                required: ['lumRange'],
              },
            },
          },
        ],
        // Encourage/require tool use: when 3D Pop is emphasized, require tool calls (no plain text)
        tool_choice: toolChoice,
      });
    } catch (error) {
      console.error('[AI] OpenAI API call failed:', error);
      throw new Error(
        `OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Debug: Log the complete response details
    console.log('[AI] === RESPONSE DEBUG START ===');
    console.log('[AI] Model used:', completion.model);
    console.log('[AI] Usage:', completion.usage);
    console.log('[AI] Finish reason:', completion.choices[0]?.finish_reason);
    console.log('[AI] Response message:', JSON.stringify(completion.choices[0]?.message, null, 2));
    console.log('[AI] === RESPONSE DEBUG END ===');

    // Parse tool calls response (support multiple calls to compose result)
    const message = completion.choices[0]?.message;
    if (message?.tool_calls && message.tool_calls.length > 0) {
      // If model responded with a single full adjustments object, return it
      const singleFull = message.tool_calls.find(
        (tc: any) => tc.type === 'function' && tc.function?.name === 'generate_color_adjustments'
      );
      if (singleFull && (singleFull as any).function?.arguments) {
        const adjustments = JSON.parse(
          (singleFull as any).function.arguments
        ) as AIColorAdjustments;
        console.log('[AI] AI color analysis completed (single call)');
        return adjustments;
      }

      // Otherwise, aggregate calls from report_global_adjustments and add_mask
      const aggregated: any = {};
      const masks: any[] = [];
      for (const tc of message.tool_calls as any[]) {
        if (tc.type !== 'function' || !tc.function?.arguments) continue;
        const name = tc.function.name;
        try {
          const args = JSON.parse(tc.function.arguments);
          if (name === 'report_global_adjustments') {
            Object.assign(aggregated, args);
            if (Array.isArray((args as any).masks)) {
              masks.push(...(args as any).masks);
            }
          } else if (name === 'add_mask') {
            masks.push(args);
          } else if (name === 'add_linear_mask') {
            masks.push({ ...args, type: 'linear' });
          } else if (name === 'add_radial_mask') {
            masks.push({ ...args, type: 'radial' });
          } else if (name === 'add_subject_mask') {
            masks.push({ ...args, type: 'subject' });
          } else if (name === 'add_background_mask') {
            masks.push({ ...args, type: 'background' });
          } else if (name === 'add_sky_mask') {
            masks.push({ ...args, type: 'sky' });
          } else if (name === 'add_range_color_mask') {
            masks.push({ ...args, type: 'range_color' });
          } else if (name === 'add_range_luminance_mask') {
            masks.push({ ...args, type: 'range_luminance' });
          }
        } catch {
          console.warn('[AI] Failed to parse tool_call args for', name);
        }
      }
      if (masks.length) {
        console.log(
          `[AI] Generated ${masks.length} mask(s):`,
          masks.map(m => `${m.name} (${m.type})`).join(', ')
        );
        aggregated.masks = masks;
      } else if (options?.emphasize3DPop) {
        console.log('[AI] 3D Pop enabled: no masks added (kept subtle/optional)');
      }
      if (Object.keys(aggregated).length > 0) {
        console.log('[AI] AI color analysis composed from multi-call tools');
        return aggregated as AIColorAdjustments;
      }
      console.warn('[AI] Tool calls found but no usable data composed');
    }

    // Fallback: attempt to parse JSON from text content
    let textContent = '';
    if (typeof (message?.content as any) === 'string') {
      textContent = message?.content as unknown as string;
    } else if (Array.isArray(message?.content)) {
      for (const part of message?.content as any[]) {
        if (part?.type === 'text' && typeof part.text === 'string') {
          textContent += part.text + '\n';
        }
      }
    }
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const adjustments = JSON.parse(jsonMatch[0]) as AIColorAdjustments;
        console.log('[AI] Parsed adjustments from text fallback');
        return adjustments;
      } catch {
        console.warn('[AI] Failed to parse JSON from text fallback');
      }
    }

    console.error('[AI] No usable adjustments in OpenAI response');
    throw new Error('Failed to get color adjustments from OpenAI');
  }

  private async convertToBase64Jpeg(imagePath: string): Promise<string> {
    console.log('[AI] Converting image to base64 JPEG:', path.basename(imagePath));

    try {
      // Convert any supported image format to JPEG and resize for API efficiency (1024px max long side)
      const jpegBuffer = await sharp(imagePath)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();

      return jpegBuffer.toString('base64');
    } catch (error) {
      console.error('[AI] Failed to convert image:', error);
      throw new Error(
        `Failed to convert image ${imagePath} to JPEG: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  isAvailable(): boolean {
    return this.initialized;
  }
}
