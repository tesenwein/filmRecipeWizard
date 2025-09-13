import OpenAI from 'openai';
import * as path from 'path';
import sharp from 'sharp';

export interface AIColorAdjustments {
  // Rendering intent / profile
  treatment?: 'color' | 'black_and_white';
  camera_profile?: string; // e.g., 'Adobe Color', 'Adobe Monochrome'
  monochrome?: boolean; // convenience flag indicating B&W output
  // All fields optional: include only settings that need changing
  exposure?: number; // -5.0 to +5.0 stops
  temperature?: number; // 2000K to 50000K
  tint?: number; // -150 to +150
  highlights?: number; // -100 to +100
  shadows?: number; // -100 to +100
  whites?: number; // -100 to +100
  blacks?: number; // -100 to +100
  brightness?: number; // -100 to +100 (legacy compatibility)
  contrast?: number; // -100 to +100
  clarity?: number; // -100 to +100
  vibrance?: number; // -100 to +100
  saturation?: number; // -100 to +100
  hue_red?: number; // -100 to +100
  hue_orange?: number; // -100 to +100
  hue_yellow?: number; // -100 to +100
  hue_green?: number; // -100 to +100
  hue_aqua?: number; // -100 to +100
  hue_blue?: number; // -100 to +100
  hue_purple?: number; // -100 to +100
  hue_magenta?: number; // -100 to +100
  // HSL per-color (optional)
  sat_red?: number; // -100 to +100
  sat_orange?: number; // -100 to +100
  sat_yellow?: number; // -100 to +100
  sat_green?: number; // -100 to +100
  sat_aqua?: number; // -100 to +100
  sat_blue?: number; // -100 to +100
  sat_purple?: number; // -100 to +100
  sat_magenta?: number; // -100 to +100
  lum_red?: number; // -100 to +100
  lum_orange?: number; // -100 to +100
  lum_yellow?: number; // -100 to +100
  lum_green?: number; // -100 to +100
  lum_aqua?: number; // -100 to +100
  lum_blue?: number; // -100 to +100
  lum_purple?: number; // -100 to +100
  lum_magenta?: number; // -100 to +100
  // Modern Color Grading (optional)
  color_grade_shadow_hue?: number; // 0-360
  color_grade_shadow_sat?: number; // 0-100
  color_grade_shadow_lum?: number; // -100 to 100
  color_grade_midtone_hue?: number; // 0-360
  color_grade_midtone_sat?: number; // 0-100
  color_grade_midtone_lum?: number; // -100 to 100
  color_grade_highlight_hue?: number; // 0-360
  color_grade_highlight_sat?: number; // 0-100
  color_grade_highlight_lum?: number; // -100 to 100
  color_grade_global_hue?: number; // 0-360
  color_grade_global_sat?: number; // 0-100
  color_grade_global_lum?: number; // -100 to 100
  color_grade_blending?: number; // 0-100
  color_grade_balance?: number; // -100 to 100 (shadows/highlights balance)
  // Tone curves (0-255 input/output pairs)
  tone_curve?: Array<{ input: number; output: number }>;
  tone_curve_red?: Array<{ input: number; output: number }>;
  tone_curve_green?: Array<{ input: number; output: number }>;
  tone_curve_blue?: Array<{ input: number; output: number }>;
  confidence?: number; // 0.0 to 1.0 - AI confidence in recommendations
  reasoning?: string; // AI explanation of the adjustments
  // Optional preset naming and point color corrections (advanced)
  preset_name?: string;
  point_colors?: number[][];
  color_variance?: number[];
}

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
    baseImagePath: string,
    targetImagePath: string,
    hint?: string
  ): Promise<AIColorAdjustments> {
    if (!this.initialized || !this.openai) {
      throw new Error(
        'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.'
      );
    }

    console.log('[AI] Starting AI-powered color analysis');

    // Convert both images to base64 JPEGs for OpenAI
    const baseImageB64 = await this.convertToBase64Jpeg(baseImagePath);
    const targetImageB64 = await this.convertToBase64Jpeg(targetImagePath);

    let completion;
    try {
      console.log(`[AI] Calling OpenAI API with model: ${this.model}`);
      completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: [
              ...(hint ? [{ type: 'text' as const, text: `Hint: ${hint}` }] : []),
              {
                type: 'text',
                text: `You are a professional photo editor and colorist. I have two images:

1. BASE IMAGE: This is the reference photo with the desired color grading, mood, and style
2. TARGET IMAGE: This is the photo I want to adjust to match the BASE IMAGE's color characteristics
3. For portraits, ensure a match in skin tone and backdrop
4. For landscapes, ensure a match in overall scene mood and lighting, specifically sky and foliage colors

Please analyze both images and provide detailed Lightroom/Camera Raw adjustments to make the TARGET IMAGE match the color grading, mood, white balance, and overall aesthetic of the BASE IMAGE.

Additionally, provide a short, human-friendly preset_name we can use for the XMP preset and the project title. Naming rules:
- 2–4 words, Title Case, descriptive of the look (e.g., “Warm Sunset Glow”, “Soft Mono Film”).
- Do not include words like “Match”, “Target”, “Base”, “AI”, file names, or dates.
- Avoid special characters (only letters, numbers, spaces, and hyphens).
- Keep it unique to the style you are proposing.`,
              },
              {
                type: 'text',
                text: 'BASE IMAGE (reference style):',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${baseImageB64}`,
                },
              },
              {
                type: 'text',
                text: 'TARGET IMAGE (to be adjusted):',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${targetImageB64}`,
                },
              },
            ],
          },
        ],
        tools: [
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
                    description: 'Short, friendly preset name to use for XMP and project title',
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
                    description: 'Optional Lightroom Point Colors raw parameter arrays (advanced users)',
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
                },
              },
            },
          },
        ],
        // Let the model choose the function call; it is strongly guided by the tool schema
        tool_choice: 'auto',
      });
    } catch (error) {
      console.error('[AI] OpenAI API call failed:', error);
      throw new Error(
        `OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    console.log('[AI] OpenAI response:', JSON.stringify(completion.choices[0]?.message, null, 2));

    // Parse tool calls response
    const message = completion.choices[0]?.message;
    // Preferred: tool call output
    if (message?.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      if (toolCall.type === 'function' && toolCall.function?.arguments) {
        const adjustments = JSON.parse(toolCall.function.arguments) as AIColorAdjustments;
        console.log('[AI] AI color analysis completed with confidence:', adjustments.confidence);
        console.log('[AI] AI reasoning:', adjustments.reasoning);
        return adjustments;
      }
      console.warn('[AI] Tool call present but invalid format:', toolCall);
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
      } catch (e) {
        console.warn('[AI] Failed to parse JSON from text fallback');
      }
    }

    console.error('[AI] No usable adjustments in OpenAI response');
    throw new Error('Failed to get color adjustments from OpenAI');
  }

  private async convertToBase64Jpeg(imagePath: string): Promise<string> {
    console.log('[AI] Converting image to base64 JPEG:', path.basename(imagePath));

    try {
      // Convert any supported image format to JPEG and resize for API efficiency (1280px max long side)
      const jpegBuffer = await sharp(imagePath)
        .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
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
