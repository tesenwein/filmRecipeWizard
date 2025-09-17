import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { AIColorAdjustments } from './types';

export interface StreamingUpdate {
    type: 'thinking' | 'analysis' | 'tool_call' | 'progress' | 'complete';
    content: string;
    step?: string;
    progress?: number;
    toolName?: string;
    toolArgs?: any;
}

export interface StreamingOptions {
    onUpdate?: (update: StreamingUpdate) => void;
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
}

export class AIStreamingService {
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'gpt-4o') {
        this.apiKey = apiKey;
        this.model = model;
    }

    async analyzeColorMatchWithStreaming(
        baseImageBase64?: string | string[],
        targetImageBase64?: string,
        hint?: string,
        options?: StreamingOptions
    ): Promise<AIColorAdjustments> {
        const { onUpdate } = options || {};

        try {
            // Build the user content with images
            const userContent = await this.buildUserContent(baseImageBase64, targetImageBase64, hint, options);

            // Create tools for the AI to use
            const tools = this.createTools(options);

            // Use AI SDK v5 streaming with proper thinking process
            const result = await streamText({
                model: openai(this.model),
                messages: [
                    {
                        role: 'user',
                        content: userContent,
                    },
                ],
                tools,
            });

            let fullText = '';
            let finalResult: AIColorAdjustments | null = null;

            // Stream the response and show thinking process using AI SDK v5 stream protocol
            for await (const part of result.fullStream) {
                // Handle different stream parts according to AI SDK v5 protocol
                if (part.type === 'text-delta') {
                    fullText += part.text;
                    // Text deltas are just building up the final response - no need to parse them
                } else if (part.type === 'tool-call') {
                    // Handle tool calls
                    onUpdate?.({
                        type: 'tool_call',
                        content: `Using ${part.toolName} to analyze ${this.getToolDescription(part.toolName)}`,
                        step: 'tool_execution',
                        progress: 30 + Math.random() * 40, // Progress between 30-70%
                        toolName: part.toolName,
                        toolArgs: part.input
                    });
                } else if (part.type === 'tool-result') {
                    // Handle tool results
                    if (part.toolName === 'generate_color_adjustments' || part.toolName === 'report_global_adjustments') {
                        finalResult = part.output as AIColorAdjustments;
                    }
                }
            }

            if (!finalResult) {
                // Fallback: try to parse the result from the text
                finalResult = this.parseResultFromText(fullText);
            }

            return finalResult || this.createDefaultAdjustments();

        } catch (error) {
            console.error('AI Streaming Service Error:', error);
            onUpdate?.({
                type: 'thinking',
                content: `Error during analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
                step: 'error',
                progress: 100
            });
            throw error;
        }
    }

    private async buildUserContent(
        baseImageBase64?: string | string[],
        targetImageBase64?: string,
        hint?: string,
        options?: StreamingOptions
    ): Promise<any[]> {
        const content: any[] = [];

        // Add system prompt
        content.push({
            type: 'text',
            text: this.getSystemPrompt(options || {})
        });

        // Add base images
        if (baseImageBase64) {
            const baseImages = Array.isArray(baseImageBase64) ? baseImageBase64 : [baseImageBase64];
            baseImages.forEach((image, index) => {
                content.push({
                    type: 'image',
                    image: image,
                    detail: 'high'
                });
            });
        }

        // Add target image
        if (targetImageBase64) {
            content.push({
                type: 'image',
                image: targetImageBase64,
                detail: 'high'
            });
        }

        // Add user hint/prompt
        if (hint) {
            content.push({
                type: 'text',
                text: `User request: ${hint}`
            });
        }

        return content;
    }

    private getSystemPrompt(options: StreamingOptions): string {
        return `You are a professional photo editor. Create comprehensive Lightroom/Camera Raw adjustments to achieve the target look.

IMPORTANT: Show your thinking process step by step as you analyze the images. Explain what you're looking for, what you notice about the colors, tones, and style, and how you're building the recipe.

Call functions to:
1. Report global adjustments with confidence and reasoning - include color grading, tone curves, HSL adjustments, and other sophisticated techniques
2. Create masks when needed (max 3 masks) for local adjustments` +
            (options.preserveSkinTones ? `\n3. Preserve natural skin tones in Subject masks` : '') +
            (options.lightroomProfile
                ? `\n\nIMPORTANT: Use "${options.lightroomProfile}" as the base camera profile in your adjustments. This profile determines the baseline color rendition and contrast.`
                : '') +
            `
3. For portraits, ensure a match in skin tone and backdrop
4. For landscapes, ensure sky/foliage mood and lighting alignment
5. Mask modifications values should be minimal and very subtle
6. Apply advanced color grading techniques including shadow/midtone/highlight color grading
7. Use HSL (hue/saturation/luminance) adjustments to fine-tune specific color ranges
8. Consider tone curve adjustments for sophisticated contrast control

Include a short preset_name (2-4 words, Title Case).
If you select a black & white/monochrome treatment, explicitly include the Black & White Mix (gray_*) values for each color channel (gray_red, gray_orange, gray_yellow, gray_green, gray_aqua, gray_blue, gray_purple, gray_magenta).
If an artist or film style is mentioned in the hint, explicitly include HSL shifts and tone curve adjustments that reflect that style's palette and contrast. Prefer calling the provided tool to report global adjustments once, including HSL fields when applicable.

When analyzing images:
1. First, describe what you see in the images - the overall mood, color palette, lighting conditions
2. Identify the key color characteristics that define the style
3. Explain how you're matching or creating the desired look
4. Detail each adjustment you're making and why

Provide detailed reasoning for each adjustment to help the user understand the creative process.`;
    }

    private createTools(options?: StreamingOptions) {
        const aiFunctions = options?.aiFunctions || {
            temperatureTint: true,
            colorGrading: true,
            hsl: true,
            curves: true,
            masks: true,
            grain: false,
            pointColor: true,
        };

        // Build base schema using Zod
        let baseSchema = z.object({
            preset_name: z.string().describe('Short, friendly preset name to use for XMP and recipe title'),
            treatment: z.enum(['color', 'black_and_white']).describe("Overall treatment for the target image"),
            camera_profile: z.string().optional().describe("Preferred camera profile (e.g., 'Adobe Color', 'Adobe Monochrome')"),
            monochrome: z.boolean().optional().describe('Convert to black and white'),
            confidence: z.number().min(0).max(1).describe('Confidence in the analysis (0.0 to 1.0)'),
            reasoning: z.string().describe('Brief explanation of the adjustments made'),
            exposure: z.number().min(-5).max(5).optional().describe('Exposure adjustment in stops (-5.0 to +5.0)'),
            highlights: z.number().min(-100).max(100).optional().describe('Highlights recovery (-100 to +100)'),
            shadows: z.number().min(-100).max(100).optional().describe('Shadows lift (-100 to +100)'),
            whites: z.number().min(-100).max(100).optional().describe('Whites adjustment (-100 to +100)'),
            blacks: z.number().min(-100).max(100).optional().describe('Blacks adjustment (-100 to +100)'),
            brightness: z.number().min(-100).max(100).optional().describe('Brightness adjustment (-100 to +100)'),
            contrast: z.number().min(-100).max(100).optional().describe('Contrast adjustment (-100 to +100)'),
            clarity: z.number().min(-100).max(100).optional().describe('Clarity adjustment (-100 to +100)'),
            vibrance: z.number().min(-100).max(100).optional().describe('Vibrance adjustment (-100 to +100)'),
            saturation: z.number().min(-100).max(100).optional().describe('Saturation adjustment (-100 to +100)'),
        });

        // Add conditional properties based on enabled functions
        if (aiFunctions.temperatureTint) {
            baseSchema = baseSchema.extend({
                temperature: z.number().min(2000).max(50000).optional().describe('White balance temperature in Kelvin (2000 to 50000)'),
                tint: z.number().min(-150).max(150).optional().describe('White balance tint (-150 to +150, negative=green, positive=magenta)'),
            });
        }

        if (aiFunctions.colorGrading) {
            baseSchema = baseSchema.extend({
                color_grade_shadow_hue: z.number().min(0).max(360).optional(),
                color_grade_shadow_sat: z.number().min(0).max(100).optional(),
                color_grade_shadow_lum: z.number().min(-100).max(100).optional(),
                color_grade_midtone_hue: z.number().min(0).max(360).optional(),
                color_grade_midtone_sat: z.number().min(0).max(100).optional(),
                color_grade_midtone_lum: z.number().min(-100).max(100).optional(),
                color_grade_highlight_hue: z.number().min(0).max(360).optional(),
                color_grade_highlight_sat: z.number().min(0).max(100).optional(),
                color_grade_highlight_lum: z.number().min(-100).max(100).optional(),
            });
        }

        if (aiFunctions.hsl) {
            baseSchema = baseSchema.extend({
                hue_red: z.number().min(-100).max(100).optional(),
                hue_orange: z.number().min(-100).max(100).optional(),
                hue_yellow: z.number().min(-100).max(100).optional(),
                hue_green: z.number().min(-100).max(100).optional(),
                hue_aqua: z.number().min(-100).max(100).optional(),
                hue_blue: z.number().min(-100).max(100).optional(),
                hue_purple: z.number().min(-100).max(100).optional(),
                hue_magenta: z.number().min(-100).max(100).optional(),
                sat_red: z.number().min(-100).max(100).optional(),
                sat_orange: z.number().min(-100).max(100).optional(),
                sat_yellow: z.number().min(-100).max(100).optional(),
                sat_green: z.number().min(-100).max(100).optional(),
                sat_aqua: z.number().min(-100).max(100).optional(),
                sat_blue: z.number().min(-100).max(100).optional(),
                sat_purple: z.number().min(-100).max(100).optional(),
                sat_magenta: z.number().min(-100).max(100).optional(),
                lum_red: z.number().min(-100).max(100).optional(),
                lum_orange: z.number().min(-100).max(100).optional(),
                lum_yellow: z.number().min(-100).max(100).optional(),
                lum_green: z.number().min(-100).max(100).optional(),
                lum_aqua: z.number().min(-100).max(100).optional(),
                lum_blue: z.number().min(-100).max(100).optional(),
                lum_purple: z.number().min(-100).max(100).optional(),
                lum_magenta: z.number().min(-100).max(100).optional(),
            });
        }

        if (aiFunctions.grain) {
            baseSchema = baseSchema.extend({
                grain_amount: z.number().min(0).max(100).optional(),
                grain_size: z.number().min(0).max(100).optional(),
                grain_frequency: z.number().min(0).max(100).optional(),
            });
        }

        if (aiFunctions.curves) {
            const curvePoint = z.object({
                input: z.number(),
                output: z.number(),
            });
            const curveArray = z.array(curvePoint);

            baseSchema = baseSchema.extend({
                tone_curve: curveArray.optional(),
                tone_curve_red: curveArray.optional(),
                tone_curve_green: curveArray.optional(),
                tone_curve_blue: curveArray.optional(),
            });
        }

        // Add Black & White Mix properties
        baseSchema = baseSchema.extend({
            gray_red: z.number().min(-100).max(100).optional(),
            gray_orange: z.number().min(-100).max(100).optional(),
            gray_yellow: z.number().min(-100).max(100).optional(),
            gray_green: z.number().min(-100).max(100).optional(),
            gray_aqua: z.number().min(-100).max(100).optional(),
            gray_blue: z.number().min(-100).max(100).optional(),
            gray_purple: z.number().min(-100).max(100).optional(),
            gray_magenta: z.number().min(-100).max(100).optional(),
        });

        // Create tools using AI SDK v5's tool function with Zod schemas
        const tools: any = {};

        // Main function for generating color adjustments
        tools.generate_color_adjustments = tool({
            description: 'Generate precise Lightroom/Camera Raw adjustments to match target image to base image style',
            inputSchema: baseSchema,
            execute: async (input) => input, // Placeholder - AI will call this
        });

        // Report global adjustments function
        tools.report_global_adjustments = tool({
            description: 'Report only global Lightroom/ACR adjustments (do not include masks here). Call once.',
            inputSchema: baseSchema,
            execute: async (input) => input, // Placeholder - AI will call this
        });

        // Add mask functions if enabled
        if (aiFunctions.masks) {
            const localAdjustmentsSchema = z.object({
                local_exposure: z.number().min(-1).max(1).optional(),
                local_contrast: z.number().min(-1).max(1).optional(),
                local_highlights: z.number().min(-1).max(1).optional(),
                local_shadows: z.number().min(-1).max(1).optional(),
                local_whites: z.number().min(-1).max(1).optional(),
                local_blacks: z.number().min(-1).max(1).optional(),
                local_clarity: z.number().min(-1).max(1).optional(),
                local_dehaze: z.number().min(-1).max(1).optional(),
                local_texture: z.number().min(-1).max(1).optional(),
                local_saturation: z.number().min(-1).max(1).optional(),
            });

            // Generic mask function
            tools.add_mask = tool({
                description: 'Add a local adjustment mask',
                inputSchema: z.object({
                    name: z.string(),
                    type: z.enum(['radial', 'linear', 'person', 'subject', 'background', 'sky']),
                    adjustments: localAdjustmentsSchema.optional(),
                }),
                execute: async (input) => input, // Placeholder - AI will call this
            });

            // Linear mask function
            tools.add_linear_mask = tool({
                description: 'Add a Linear Gradient mask with start/end points and optional local adjustments.',
                inputSchema: z.object({
                    name: z.string(),
                    zeroX: z.number().min(0).max(1),
                    zeroY: z.number().min(0).max(1),
                    fullX: z.number().min(0).max(1),
                    fullY: z.number().min(0).max(1),
                    inverted: z.boolean().optional(),
                    adjustments: localAdjustmentsSchema.optional(),
                }),
                execute: async (input) => input, // Placeholder - AI will call this
            });

            // Radial mask function
            tools.add_radial_mask = tool({
                description: 'Add a Radial Gradient mask with bounds and optional local adjustments.',
                inputSchema: z.object({
                    name: z.string(),
                    top: z.number().min(0).max(1),
                    left: z.number().min(0).max(1),
                    bottom: z.number().min(0).max(1),
                    right: z.number().min(0).max(1),
                    angle: z.number().optional(),
                    midpoint: z.number().min(0).max(100).optional(),
                    roundness: z.number().min(-100).max(100).optional(),
                    feather: z.number().min(0).max(100).optional(),
                    flipped: z.boolean().optional(),
                    inverted: z.boolean().optional(),
                    adjustments: localAdjustmentsSchema.optional(),
                }),
                execute: async (input) => input, // Placeholder - AI will call this
            });

            // Subject mask function
            tools.add_subject_mask = tool({
                description: 'Add a Subject/Person mask with a reference point and optional local adjustments.',
                inputSchema: z.object({
                    name: z.string(),
                    referenceX: z.number().min(0).max(1),
                    referenceY: z.number().min(0).max(1),
                    inverted: z.boolean().optional(),
                    adjustments: localAdjustmentsSchema.optional(),
                }),
                execute: async (input) => input, // Placeholder - AI will call this
            });

            // Background mask function
            tools.add_background_mask = tool({
                description: 'Add a Background mask with a reference point and optional local adjustments.',
                inputSchema: z.object({
                    name: z.string(),
                    referenceX: z.number().min(0).max(1),
                    referenceY: z.number().min(0).max(1),
                    inverted: z.boolean().optional(),
                    adjustments: localAdjustmentsSchema.optional(),
                }),
                execute: async (input) => input, // Placeholder - AI will call this
            });

            // Sky mask function
            tools.add_sky_mask = tool({
                description: 'Add a Sky mask with a reference point and optional local adjustments.',
                inputSchema: z.object({
                    name: z.string(),
                    referenceX: z.number().min(0).max(1),
                    referenceY: z.number().min(0).max(1),
                    inverted: z.boolean().optional(),
                    adjustments: localAdjustmentsSchema.optional(),
                }),
                execute: async (input) => input, // Placeholder - AI will call this
            });
        }

        return tools;
    }


    private parseResultFromText(text: string): AIColorAdjustments | null {
        // Try to extract structured data from the text
        // This is a fallback method
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.warn('Could not parse result from text:', error);
        }
        return null;
    }

    private createDefaultAdjustments(): AIColorAdjustments {
        return {
            preset_name: 'Default Recipe',
            confidence: 0.5,
            reasoning: 'Default adjustments applied due to analysis error',
            temperature: 0,
            tint: 0,
            exposure: 0,
            contrast: 0,
            highlights: 0,
            shadows: 0,
            whites: 0,
            blacks: 0,
            vibrance: 0,
            saturation: 0
        };
    }

    private getToolDescription(toolName: string): string {
        const descriptions: Record<string, string> = {
            'generate_color_adjustments': 'color characteristics and creating the recipe',
            'analyze_color_palette': 'color palette and tonal relationships',
            'assess_lighting': 'lighting conditions and exposure',
            'evaluate_style': 'overall style and mood'
        };
        return descriptions[toolName] || 'image characteristics';
    }
}
