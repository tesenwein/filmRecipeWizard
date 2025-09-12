import OpenAI from 'openai';
import * as path from 'path';
import sharp from 'sharp';

export interface AIColorAdjustments {
  exposure: number; // -5.0 to +5.0 stops
  temperature: number; // 2000K to 50000K
  tint: number; // -150 to +150
  highlights: number; // -100 to +100
  shadows: number; // -100 to +100
  whites: number; // -100 to +100
  blacks: number; // -100 to +100
  brightness: number; // -100 to +100 (for legacy compatibility)
  contrast: number; // -100 to +100
  clarity: number; // -100 to +100
  vibrance: number; // -100 to +100
  saturation: number; // -100 to +100
  hue_red: number; // -100 to +100
  hue_orange: number; // -100 to +100
  hue_yellow: number; // -100 to +100
  hue_green: number; // -100 to +100
  hue_aqua: number; // -100 to +100
  hue_blue: number; // -100 to +100
  hue_purple: number; // -100 to +100
  hue_magenta: number; // -100 to +100
  confidence: number; // 0.0 to 1.0 - AI confidence in recommendations
  reasoning: string; // AI explanation of the adjustments
}

export class OpenAIColorAnalyzer {
  private openai: OpenAI | null = null;
  private initialized = false;
  private model: string = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  constructor() {
    // OpenAI API key should be set as environment variable
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      this.initialized = true;
      console.log('[AI] OpenAI Color Analyzer initialized');
    } else {
      console.warn('[AI] OpenAI API key not found in environment variables');
    }
  }

  async analyzeColorMatch(
    baseImagePath: string,
    targetImagePath: string
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
              {
                type: 'text',
                text: `You are a professional photo editor and colorist. I have two images:

1. BASE IMAGE: This is the reference photo with the desired color grading, mood, and style
2. TARGET IMAGE: This is the photo I want to adjust to match the BASE IMAGE's color characteristics

Please analyze both images and provide detailed Lightroom/Camera Raw adjustments to make the TARGET IMAGE match the color grading, mood, white balance, and overall aesthetic of the BASE IMAGE.

Consider these aspects:
- White balance (temperature and tint)
- Exposure and brightness levels  
- Contrast and clarity
- Shadow and highlight recovery
- Color grading and selective color adjustments
- Saturation and vibrance
- Individual color hue shifts

Provide specific numeric values for each adjustment that would achieve the best match.`,
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
                required: [
                  'exposure',
                  'temperature',
                  'tint',
                  'highlights',
                  'shadows',
                  'whites',
                  'blacks',
                  'brightness',
                  'contrast',
                  'clarity',
                  'vibrance',
                  'saturation',
                  'hue_red',
                  'hue_orange',
                  'hue_yellow',
                  'hue_green',
                  'hue_aqua',
                  'hue_blue',
                  'hue_purple',
                  'hue_magenta',
                  'confidence',
                  'reasoning',
                ],
              },
            },
          },
        ],
        // Let the model choose the function call; it is strongly guided by the tool schema
        tool_choice: 'auto',
        max_tokens: 2000,
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
        `Failed to convert image ${imagePath} to JPEG: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  isAvailable(): boolean {
    return this.initialized;
  }
}
