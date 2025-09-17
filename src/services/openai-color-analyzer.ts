import OpenAI from 'openai';
import { buildUserContentForAnalysis } from './prompt';
import type { AIColorAdjustments } from './types';
export type { AIColorAdjustments } from './types';

// Example B&W mixer derived from example-bw.xmp
export function getExampleBWMixer(): Pick<
  AIColorAdjustments,
  'gray_red' | 'gray_orange' | 'gray_yellow' | 'gray_green' | 'gray_aqua' | 'gray_blue' | 'gray_purple' | 'gray_magenta'
> {
  return {
    gray_red: -20,
    gray_orange: 31,
    gray_yellow: -70,
    gray_green: -32,
    gray_aqua: 0,
    gray_blue: -13,
    gray_purple: -43,
    gray_magenta: -32,
  };
}

export class OpenAIColorAnalyzer {
  private openai: OpenAI | null = null;
  private initialized = false;
  private model: string = 'gpt-5'; // do nerver change this!

  constructor(apiKey?: string) {
    // OpenAI API key from settings or environment variable
    const key = apiKey || process.env.OPENAI_API_KEY;
    console.log('[AI] OpenAI Color Analyzer constructor called with key:', !!key);
    if (key) {
      // Temporarily unset the environment variable to prevent SDK from using it
      const originalOrgId = process.env.OPENAI_ORG_ID;
      delete process.env.OPENAI_ORG_ID;

      this.openai = new OpenAI({
        apiKey: key,
        timeout: 120000, // 2 minutes timeout
        maxRetries: 2,
      });

      // Restore the environment variable if it was set
      if (originalOrgId) {
        process.env.OPENAI_ORG_ID = originalOrgId;
      }

      this.initialized = true;
      console.log('[AI] OpenAI client initialized successfully');
    } else {
      console.warn('[AI] OpenAI API key not provided');
    }
  }

  async analyzeColorMatch(
    baseImagePath: string | undefined,
    targetImagePath?: string,
    hint?: string,
    baseImageBase64?: string | string[],
    targetImageBase64?: string,
    options?: {
      preserveSkinTones?: boolean;
      lightroomProfile?: string;
      aiFunctions?: {
        temperatureTint?: boolean;
        masks?: boolean;
        colorGrading?: boolean;
        hsl?: boolean;
        curves?: boolean;
        grain?: boolean;
        pointColor?: boolean;
      };
    },
    onStreamUpdate?: (text: string) => void
  ): Promise<AIColorAdjustments> {
    console.log('[AI] analyzeColorMatch called with:', {
      hasBaseImagePath: !!baseImagePath,
      hasTargetImagePath: !!targetImagePath,
      hasHint: !!hint,
      hasBaseImageBase64: !!baseImageBase64,
      hasTargetImageBase64: !!targetImageBase64,
      options,
    });

    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const startTime = Date.now();
    let completion;

    try {
      // Build user content with images and prompt
      const userContent = await buildUserContentForAnalysis(baseImageBase64, targetImageBase64, hint, {
        preserveSkinTones: options?.preserveSkinTones,
        lightroomProfile: options?.lightroomProfile,
      });

      const toolChoice = 'auto';

      // Build tools array conditionally based on options
      const tools = this.buildToolsArray(options);

      // Show detailed thinking stream based on enabled features
      if (onStreamUpdate) {
        onStreamUpdate('Analyzing your images...');
        await new Promise(resolve => setTimeout(resolve, 300));

        onStreamUpdate('Identifying color characteristics...');
        await new Promise(resolve => setTimeout(resolve, 200));

        if (options?.aiFunctions?.temperatureTint !== false) {
          onStreamUpdate('Analyzing color temperature and tint...');
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (options?.aiFunctions?.hsl !== false) {
          onStreamUpdate('Mapping HSL color ranges...');
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (options?.aiFunctions?.colorGrading !== false) {
          onStreamUpdate('Evaluating color grading opportunities...');
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (options?.aiFunctions?.curves !== false) {
          onStreamUpdate('Analyzing tonal distribution and curves...');
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (options?.aiFunctions?.masks === true) {
          onStreamUpdate('Identifying areas for local adjustments...');
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (options?.aiFunctions?.pointColor !== false) {
          onStreamUpdate('Detecting specific color points...');
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (options?.aiFunctions?.grain === true) {
          onStreamUpdate('Evaluating film grain requirements...');
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (options?.preserveSkinTones) {
          onStreamUpdate('Protecting skin tone integrity...');
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        onStreamUpdate('Matching target style characteristics...');
        await new Promise(resolve => setTimeout(resolve, 300));

        onStreamUpdate('Generating Lightroom adjustments...');
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Use streaming to get real-time updates and function calls
      const stream = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: userContent,
          },
        ],
        max_completion_tokens: 8000,
        tools,
        tool_choice: toolChoice,
        stream: true,
      });

      let fullResponse = '';
      let functionCalls: any[] = [];

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        // Handle streaming text content
        if (delta.content) {
          fullResponse += delta.content;
          // Send real-time thinking updates
          if (onStreamUpdate && delta.content.includes('.')) {
            onStreamUpdate(`AI: ${delta.content.trim()}`);
          }
        }

        // Handle function calls
        if (delta.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (toolCall.index !== undefined) {
              if (!functionCalls[toolCall.index]) {
                functionCalls[toolCall.index] = {
                  id: toolCall.id,
                  type: toolCall.type,
                  function: {
                    name: '',
                    arguments: '',
                  },
                };
              }

              if (toolCall.function?.name) {
                functionCalls[toolCall.index].function.name = toolCall.function.name;
              }

              if (toolCall.function?.arguments) {
                functionCalls[toolCall.index].function.arguments += toolCall.function.arguments;
              }
            }
          }
        }
      }

      // Create a completion-like object for compatibility
      completion = {
        choices: [
          {
            message: {
              role: 'assistant' as const,
              content: fullResponse,
              tool_calls: functionCalls.filter(fc => fc && fc.function.name),
            },
          },
        ],
      };

      // Show completion and processing messages
      if (onStreamUpdate) {
        onStreamUpdate('Analysis complete! Processing results...');
        await new Promise(resolve => setTimeout(resolve, 300));

        onStreamUpdate('Optimizing color adjustments...');
        await new Promise(resolve => setTimeout(resolve, 200));

        onStreamUpdate('Fine-tuning preset parameters...');
        await new Promise(resolve => setTimeout(resolve, 200));

        onStreamUpdate('Recipe generation complete!');
      }

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      console.log(`[AI] API call completed in ${duration.toFixed(2)}s`);
    } catch (error) {
      console.error('[AI] OpenAI API call failed:', error);
      throw error;
    }

    const message = completion.choices[0]?.message;
    console.log('[AI] Message received:', {
      hasToolCalls: !!message?.tool_calls,
      toolCallCount: message?.tool_calls?.length || 0,
      toolCallNames: message?.tool_calls?.map((tc: any) => tc.function?.name) || [],
    });

    if (message?.tool_calls && message.tool_calls.length > 0) {
      // If model responded with a single full adjustments object, return it
      const singleFull = message.tool_calls.find(
        (tc: any) =>
          tc.type === 'function' &&
          (tc.function?.name === 'generate_color_adjustments' || tc.function?.name === 'report_global_adjustments')
      );
      if (singleFull && (singleFull as any).function?.arguments) {
        const adjustments = JSON.parse((singleFull as any).function.arguments) as AIColorAdjustments;
        console.log('[AI] Single full adjustments received:', adjustments);
        return adjustments;
      }

      // Otherwise, collect all adjustments from multiple tool calls
      const masks: any[] = [];
      for (const tc of message.tool_calls as any[]) {
        if (tc.type !== 'function' || !tc.function?.arguments) continue;
        const name = tc.function.name;
        try {
          const args = JSON.parse(tc.function.arguments);
          if (name === 'generate_color_adjustments' || name === 'report_global_adjustments') {
            // This should be the main adjustments object
            console.log('[AI] Main adjustments received:', args);
            return args as AIColorAdjustments;
          } else if (name.startsWith('add_') && name.includes('_mask')) {
            // This is a mask addition
            masks.push(args);
          }
        } catch (parseError) {
          console.error(`[AI] Failed to parse arguments for ${name}:`, parseError);
        }
      }

      // If we have masks but no main adjustments, create a basic structure
      if (masks.length > 0) {
        console.log('[AI] Masks received without main adjustments:', masks);
        return {
          preset_name: 'AI Generated',
          treatment: 'color',
          masks,
        } as AIColorAdjustments;
      }
    }

    // Fallback: try to extract adjustments from the message content
    if (message?.content) {
      try {
        const content = message.content;
        console.log('[AI] Attempting to parse adjustments from message content:', content);
        // Try to find JSON in the content
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const adjustments = JSON.parse(jsonMatch[0]) as AIColorAdjustments;
          console.log('[AI] Parsed adjustments from content:', adjustments);
          return adjustments;
        }

        // If no JSON found, create a basic adjustment structure from the content
        console.log('[AI] No JSON found in content, creating basic adjustments');
        const basicAdjustments: AIColorAdjustments = {
          preset_name: 'AI Generated Preset',
          treatment: 'color',
          confidence: 0.7,
          reasoning: content.substring(0, 200) + '...',
          // Add some basic adjustments
          temperature: 6500,
          tint: 0,
          contrast: 0,
          highlights: 0,
          shadows: 0,
          whites: 0,
          blacks: 0,
          clarity: 0,
          vibrance: 0,
          saturation: 0,
        };
        console.log('[AI] Created basic adjustments:', basicAdjustments);
        return basicAdjustments;
      } catch (error) {
        console.error('[AI] Failed to parse adjustments from content:', error);
      }
    }

    console.error('[AI] No valid adjustments received. Message:', message);
    console.error('[AI] Tool calls:', message?.tool_calls);
    console.error('[AI] Content:', message?.content);

    // Create a fallback adjustment structure
    console.log('[AI] Creating fallback adjustments');
    const fallbackAdjustments: AIColorAdjustments = {
      preset_name: 'Fallback Preset',
      treatment: 'color',
      confidence: 0.5,
      reasoning: 'AI did not return valid adjustments, using fallback values',
      temperature: 6500,
      tint: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
      clarity: 0,
      vibrance: 0,
      saturation: 0,
    };
    return fallbackAdjustments;
  }

  // Get current model
  getModel(): string {
    return this.model;
  }

  isAvailable(): boolean {
    return this.initialized;
  }

  private buildToolsArray(options?: {
    aiFunctions?: {
      temperatureTint?: boolean;
      masks?: boolean;
      colorGrading?: boolean;
      hsl?: boolean;
      curves?: boolean;
      grain?: boolean;
      pointColor?: boolean;
    };
  }): any[] {
    const tools: any[] = [];
    const aiFunctions = options?.aiFunctions || {
      temperatureTint: true,
      colorGrading: true,
      hsl: true,
      curves: true,
      masks: true,
      grain: false,
      pointColor: true,
    };

    // Build base properties that are always available
    const baseProperties: any = {
      preset_name: {
        type: 'string',
        description: 'Short, friendly preset name to use for XMP and recipe title',
      },
      treatment: {
        type: 'string',
        description: "Overall treatment for the target image ('color' or 'black_and_white')",
        enum: ['color', 'black_and_white'],
      },
      camera_profile: {
        type: 'string',
        description: "Preferred camera profile (e.g., 'Adobe Color', 'Adobe Monochrome')",
      },
      monochrome: {
        type: 'boolean',
        description: 'Convert to black and white',
      },
      confidence: {
        type: 'number',
        description: 'Confidence in the analysis (0.0 to 1.0)',
        minimum: 0,
        maximum: 1,
      },
      reasoning: {
        type: 'string',
        description: 'Brief explanation of the adjustments made',
      },
      exposure: {
        type: 'number',
        description: 'Exposure adjustment in stops (-5.0 to +5.0)',
        minimum: -5.0,
        maximum: 5.0,
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
        description: 'Brightness adjustment (-100 to +100)',
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
        description: 'Clarity adjustment (-100 to +100)',
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
    };

    // Add conditional properties based on enabled functions
    if (aiFunctions.temperatureTint) {
      baseProperties.temperature = {
        type: 'number',
        description: 'White balance temperature in Kelvin (2000 to 50000)',
        minimum: 2000,
        maximum: 50000,
      };
      baseProperties.tint = {
        type: 'number',
        description: 'White balance tint (-150 to +150, negative=green, positive=magenta)',
        minimum: -150,
        maximum: 150,
      };
    }

    if (aiFunctions.colorGrading) {
      baseProperties.color_grade_shadow_hue = { type: 'number', minimum: 0, maximum: 360 };
      baseProperties.color_grade_shadow_sat = { type: 'number', minimum: 0, maximum: 100 };
      baseProperties.color_grade_shadow_lum = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.color_grade_midtone_hue = { type: 'number', minimum: 0, maximum: 360 };
      baseProperties.color_grade_midtone_sat = { type: 'number', minimum: 0, maximum: 100 };
      baseProperties.color_grade_midtone_lum = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.color_grade_highlight_hue = { type: 'number', minimum: 0, maximum: 360 };
      baseProperties.color_grade_highlight_sat = { type: 'number', minimum: 0, maximum: 100 };
      baseProperties.color_grade_highlight_lum = { type: 'number', minimum: -100, maximum: 100 };
    }

    if (aiFunctions.hsl) {
      baseProperties.hue_red = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.hue_orange = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.hue_yellow = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.hue_green = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.hue_aqua = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.hue_blue = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.hue_purple = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.hue_magenta = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.sat_red = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.sat_orange = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.sat_yellow = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.sat_green = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.sat_aqua = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.sat_blue = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.sat_purple = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.sat_magenta = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.lum_red = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.lum_orange = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.lum_yellow = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.lum_green = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.lum_aqua = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.lum_blue = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.lum_purple = { type: 'number', minimum: -100, maximum: 100 };
      baseProperties.lum_magenta = { type: 'number', minimum: -100, maximum: 100 };
    }

    if (aiFunctions.grain) {
      baseProperties.grain_amount = { type: 'number', minimum: 0, maximum: 100 };
      baseProperties.grain_size = { type: 'number', minimum: 0, maximum: 100 };
      baseProperties.grain_frequency = { type: 'number', minimum: 0, maximum: 100 };
    }

    // Tone curve support when curves are enabled
    if (aiFunctions.curves) {
      const curvePoint = {
        type: 'object',
        properties: {
          input: { type: 'number' },
          output: { type: 'number' },
        },
      } as const;
      const curveArray = { type: 'array', items: curvePoint } as const;
      baseProperties.tone_curve = curveArray;
      baseProperties.tone_curve_red = curveArray;
      baseProperties.tone_curve_green = curveArray;
      baseProperties.tone_curve_blue = curveArray;
    }

    // Add Black & White Mix properties if needed
    baseProperties.gray_red = { type: 'number', minimum: -100, maximum: 100 };
    baseProperties.gray_orange = { type: 'number', minimum: -100, maximum: 100 };
    baseProperties.gray_yellow = { type: 'number', minimum: -100, maximum: 100 };
    baseProperties.gray_green = { type: 'number', minimum: -100, maximum: 100 };
    baseProperties.gray_aqua = { type: 'number', minimum: -100, maximum: 100 };
    baseProperties.gray_blue = { type: 'number', minimum: -100, maximum: 100 };
    baseProperties.gray_purple = { type: 'number', minimum: -100, maximum: 100 };
    baseProperties.gray_magenta = { type: 'number', minimum: -100, maximum: 100 };

    // Add main function
    tools.push({
      type: 'function',
      function: {
        name: 'generate_color_adjustments',
        description: 'Generate precise Lightroom/Camera Raw adjustments to match target image to base image style',
        parameters: {
          type: 'object',
          properties: baseProperties,
        },
      },
    });

    // Add report_global_adjustments function (always available)
    tools.push({
      type: 'function',
      function: {
        name: 'report_global_adjustments',
        description: 'Report only global Lightroom/ACR adjustments (do not include masks here). Call once.',
        parameters: {
          type: 'object',
          properties: baseProperties,
        },
      },
    });

    // Add mask functions if enabled
    if (aiFunctions.masks) {
      // Generic mask function
      tools.push({
        type: 'function',
        function: {
          name: 'add_mask',
          description: 'Add a local adjustment mask',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: {
                type: 'string',
                enum: ['radial', 'linear', 'person', 'subject', 'background', 'sky'],
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
                  local_texture: { type: 'number', minimum: -1, maximum: 1 },
                  local_saturation: { type: 'number', minimum: -1, maximum: 1 },
                },
              },
            },
          },
        },
      });

      // Specific mask functions for stronger guidance
      tools.push({
        type: 'function',
        function: {
          name: 'add_linear_mask',
          description: 'Add a Linear Gradient mask with start/end points and optional local adjustments.',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              zeroX: { type: 'number', minimum: 0, maximum: 1 },
              zeroY: { type: 'number', minimum: 0, maximum: 1 },
              fullX: { type: 'number', minimum: 0, maximum: 1 },
              fullY: { type: 'number', minimum: 0, maximum: 1 },
              inverted: { type: 'boolean' },
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
                  local_texture: { type: 'number', minimum: -1, maximum: 1 },
                  local_saturation: { type: 'number', minimum: -1, maximum: 1 },
                },
              },
            },
          },
        },
      });

      tools.push({
        type: 'function',
        function: {
          name: 'add_radial_mask',
          description: 'Add a Radial Gradient mask with bounds and optional local adjustments.',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              top: { type: 'number', minimum: 0, maximum: 1 },
              left: { type: 'number', minimum: 0, maximum: 1 },
              bottom: { type: 'number', minimum: 0, maximum: 1 },
              right: { type: 'number', minimum: 0, maximum: 1 },
              angle: { type: 'number' },
              midpoint: { type: 'number', minimum: 0, maximum: 100 },
              roundness: { type: 'number', minimum: -100, maximum: 100 },
              feather: { type: 'number', minimum: 0, maximum: 100 },
              flipped: { type: 'boolean' },
              inverted: { type: 'boolean' },
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
                  local_texture: { type: 'number', minimum: -1, maximum: 1 },
                  local_saturation: { type: 'number', minimum: -1, maximum: 1 },
                },
              },
            },
          },
        },
      });

      tools.push({
        type: 'function',
        function: {
          name: 'add_subject_mask',
          description: 'Add a Subject/Person mask with a reference point and optional local adjustments.',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              referenceX: { type: 'number', minimum: 0, maximum: 1 },
              referenceY: { type: 'number', minimum: 0, maximum: 1 },
              inverted: { type: 'boolean' },
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
                  local_texture: { type: 'number', minimum: -1, maximum: 1 },
                  local_saturation: { type: 'number', minimum: -1, maximum: 1 },
                },
              },
            },
          },
        },
      });

      tools.push({
        type: 'function',
        function: {
          name: 'add_background_mask',
          description: 'Add a Background mask with a reference point and optional local adjustments.',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              referenceX: { type: 'number', minimum: 0, maximum: 1 },
              referenceY: { type: 'number', minimum: 0, maximum: 1 },
              inverted: { type: 'boolean' },
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
                  local_texture: { type: 'number', minimum: -1, maximum: 1 },
                  local_saturation: { type: 'number', minimum: -1, maximum: 1 },
                },
              },
            },
          },
        },
      });

      tools.push({
        type: 'function',
        function: {
          name: 'add_sky_mask',
          description: 'Add a Sky mask with a reference point and optional local adjustments.',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              referenceX: { type: 'number', minimum: 0, maximum: 1 },
              referenceY: { type: 'number', minimum: 0, maximum: 1 },
              inverted: { type: 'boolean' },
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
                  local_texture: { type: 'number', minimum: -1, maximum: 1 },
                  local_saturation: { type: 'number', minimum: -1, maximum: 1 },
                },
              },
            },
          },
        },
      });

      tools.push({
        type: 'function',
        function: {
          name: 'add_range_color_mask',
          description: 'Add a Color Range mask with point models and optional local adjustments.',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              colorAmount: { type: 'number', minimum: 0, maximum: 1 },
              pointModels: {
                type: 'array',
                items: {
                  type: 'array',
                  items: { type: 'number' },
                },
              },
              invert: { type: 'boolean' },
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
                  local_texture: { type: 'number', minimum: -1, maximum: 1 },
                  local_saturation: { type: 'number', minimum: -1, maximum: 1 },
                },
              },
            },
          },
        },
      });

      tools.push({
        type: 'function',
        function: {
          name: 'add_range_luminance_mask',
          description: 'Add a Luminance Range mask with luminance range and optional local adjustments.',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string' },
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
              invert: { type: 'boolean' },
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
                  local_texture: { type: 'number', minimum: -1, maximum: 1 },
                  local_saturation: { type: 'number', minimum: -1, maximum: 1 },
                },
              },
            },
          },
        },
      });
    }

    return tools;
  }
}
