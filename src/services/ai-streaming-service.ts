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
                system: this.getSystemPrompt(options || {}),
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
            let accumulatedThinkingText = '';
            let currentProgress = 10; // Start at 10%
            let thinkingStarted = false;
            let thinkingComplete = false;
            let lastThinkingUpdate = 0;
            let lastThinkingLength = 0;

            // Stream the response and show thinking process using AI SDK v5 stream protocol
            for await (const part of result.fullStream) {
                // Handle different stream parts according to AI SDK v5 protocol
                if (part.type === 'text-delta') {
                    fullText += part.text;
                    accumulatedThinkingText += part.text;

                    // Start thinking display when we have meaningful text
                    if (!thinkingStarted && accumulatedThinkingText.trim().length > 20) {
                        thinkingStarted = true;
                        currentProgress = 20;
                        onUpdate?.({
                            type: 'progress',
                            content: 'Starting analysis...',
                            step: 'initialization',
                            progress: currentProgress
                        });
                        lastThinkingUpdate = Date.now();
                        lastThinkingLength = accumulatedThinkingText.length;
                    }

                    // Update thinking content with incremental text
                    if (thinkingStarted && !thinkingComplete) {
                        const now = Date.now();
                        const currentLength = accumulatedThinkingText.length;
                        // Lower thresholds to make streaming feel smoother
                        const hasSignificantNewContent = (currentLength - lastThinkingLength) > 10; // At least 10 new characters
                        const enoughTimePassed = (now - lastThinkingUpdate) > 200; // At least 200ms between updates

                        if (hasSignificantNewContent && enoughTimePassed && accumulatedThinkingText.trim().length > 20) {
                            // Get only the new content since last update
                            const newContent = accumulatedThinkingText.substring(lastThinkingLength);

                            // Clean up the new content (remove code blocks, JSON, etc.)
                            const cleanNewContent = newContent
                                .replace(/```[\s\S]*?```/g, '') // Remove code blocks
                                .replace(/`[^`]*`/g, '') // Remove inline code
                                .replace(/\{[^}]*\}/g, '') // Remove JSON-like structures
                                .replace(/\[[^\]]*\]/g, '') // Remove array-like structures
                                .replace(/function\s+\w+\s*\([^)]*\)\s*\{[^}]*\}/g, '') // Remove function definitions
                                .replace(/const\s+\w+\s*=\s*[^;]+;/g, '') // Remove variable assignments
                                .replace(/let\s+\w+\s*=\s*[^;]+;/g, '') // Remove let assignments
                                .replace(/var\s+\w+\s*=\s*[^;]+;/g, '') // Remove var assignments
                                // Strip common Markdown formatting so thinking text is plain
                                .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Remove images
                                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
                                .replace(/^#{1,6}\s+/gm, '') // Remove headings
                                .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
                                .replace(/__([^_]+)__/g, '$1') // Bold underscores
                                .replace(/\*([^*]+)\*/g, '$1') // Italic
                                .replace(/_([^_]+)_/g, '$1') // Italic underscores
                                .replace(/^\s*>\s?/gm, '') // Blockquotes
                                .replace(/^\s*[-*+]\s+/gm, '') // Unordered list bullets
                                .replace(/^\s*\d+\.\s+/gm, '') // Ordered list markers
                                .replace(/^\s*-{3,}\s*$/gm, '') // Horizontal rules
                                .replace(/\n\s*\n/g, '\n') // Collapse multiple blank lines into single newline
                                .replace(/[ \t]+/g, ' ') // Normalize spaces and tabs but preserve newlines
                                .trim();


                            if (cleanNewContent.length > 5) {
                                currentProgress = Math.min(currentProgress + 2, 50); // Gradual progress
                                onUpdate?.({
                                    type: 'thinking',
                                    content: cleanNewContent,
                                    step: 'reasoning',
                                    progress: currentProgress
                                });
                                lastThinkingUpdate = now;
                                lastThinkingLength = currentLength;
                            }
                        }
                    }
                } else if (part.type === 'tool-call') {
                    // Mark thinking as complete when first tool call starts
                    if (!thinkingComplete) {
                        thinkingComplete = true;
                    }

                    // Handle tool calls
                    currentProgress = Math.min(currentProgress + 10, 80); // Jump to 80% for tool calls


                    onUpdate?.({
                        type: 'tool_call',
                        content: `Using ${part.toolName} to analyze ${this.getToolDescription(part.toolName)}`,
                        step: 'tool_execution',
                        progress: currentProgress,
                        toolName: part.toolName,
                        toolArgs: part.input
                    });
                } else if (part.type === 'tool-result') {
                    // Handle tool results
                    if (part.toolName === 'generate_color_adjustments' || part.toolName === 'report_global_adjustments') {
                        finalResult = part.output as AIColorAdjustments;
                    }
                } else if (part.type === 'reasoning-start') {
                    // Handle reasoning start
                    if (!thinkingStarted) {
                        thinkingStarted = true;
                        currentProgress = 15;
                        onUpdate?.({
                            type: 'thinking',
                            content: 'Starting analysis...',
                            step: 'reasoning',
                            progress: currentProgress
                        });
                    }
                } else if (part.type === 'reasoning-end') {
                    // Handle reasoning end - mark thinking as complete
                    if (!thinkingComplete) {
                        thinkingComplete = true;
                    }
                    currentProgress = 90;
                    // Use a progress-type update here so UI can optionally skip it once thinking started
                    onUpdate?.({
                        type: 'progress',
                        content: 'Analysis complete, generating results...',
                        step: 'reasoning',
                        progress: currentProgress
                    });
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
        _options?: StreamingOptions
    ): Promise<any[]> {
        const content: any[] = [];

        // Add reference images (the style we want to match)
        if (baseImageBase64) {
            content.push({
                type: 'text',
                text: 'REFERENCE IMAGES (the style/look we want to achieve):'
            });
            const baseImages = Array.isArray(baseImageBase64) ? baseImageBase64 : [baseImageBase64];
            baseImages.forEach((image, _index) => {
                content.push({
                    type: 'image',
                    image: image,
                    detail: 'high'
                });
            });
        }

        // Add target image (the image to be modified)
        if (targetImageBase64) {
            content.push({
                type: 'text',
                text: 'TARGET IMAGE (the image to be modified to match the reference style):'
            });
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
                text: `STYLE DESCRIPTION (text description of the desired look/style, NOT an image): ${hint}`
            });
        }

        return content;
    }

    private getSystemPrompt(options: StreamingOptions): string {
        return `You are a professional photo editor. Create comprehensive Lightroom/Camera Raw adjustments to achieve the target look.

IMPORTANT: 
- REFERENCE IMAGES show the style/look we want to achieve
- TARGET IMAGE is the photo that needs to be modified to match the reference style
- STYLE DESCRIPTION is a text description of the desired look/style (NOT an image)
- Your job is to analyze the reference images and create adjustments that will make the target image look like the reference style
- If no reference images are provided, use the STYLE DESCRIPTION to understand what look to create

CRITICAL INSTRUCTIONS FOR YOUR RESPONSE:
- Write your thinking process in plain text and markdown only
- DO NOT generate any code, JSON, or technical syntax in your thinking text
- Use natural language to explain your analysis
- Focus on describing colors, tones, mood, and style characteristics
- Explain your reasoning in conversational text

Show your thinking process step by step as you analyze the images. Explain what you're looking for, what you notice about the colors, tones, and style, and how you're building the recipe.

CRITICAL: You must call the generate_color_adjustments function with ALL adjustments including masks in a single call. Do NOT call individual mask functions - they are just for reference.

Call the generate_color_adjustments function with:
1. Global adjustments: temperature, tint, exposure, contrast, highlights, shadows, whites, blacks, clarity, vibrance, saturation
2. Color grading: shadow/midtone/highlight color grading values
3. HSL adjustments: hue/saturation/luminance for each color range
4. Tone curves: parametric and point curve adjustments
5. Masks: Include masks array with local adjustments (max 3 masks)
   - For background masks, include subCategoryId: 22 for proper Lightroom detection
   - For subject/person masks, use type: 'subject' with referenceX/Y coordinates
   - For sky masks, use type: 'sky' with referenceX/Y coordinates` +
            (options.preserveSkinTones ? `\n6. Preserve natural skin tones in Subject masks` : '') +
            (options.lightroomProfile
                ? `\n\nIMPORTANT: Use "${options.lightroomProfile}" as the base camera profile in your adjustments. This profile determines the baseline color rendition and contrast.`
                : '') +
            `
7. For portraits, ensure a match in skin tone and backdrop
8. For landscapes, ensure sky/foliage mood and lighting alignment
9. Mask modifications values should be minimal and very subtle
10. Apply advanced color grading techniques including shadow/midtone/highlight color grading
11. Use HSL (hue/saturation/luminance) adjustments to fine-tune specific color ranges
12. Consider tone curve adjustments for sophisticated contrast control

Include a short preset_name (2-4 words, Title Case).
If you select a black & white/monochrome treatment, explicitly include the Black & White Mix (gray_*) values for each color channel (gray_red, gray_orange, gray_yellow, gray_green, gray_aqua, gray_blue, gray_purple, gray_magenta).
If an artist or film style is mentioned in the hint, explicitly include HSL shifts and tone curve adjustments that reflect that style's palette and contrast.

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

        // Add masks if enabled
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

            const maskSchema = z.object({
                name: z.string().optional(),
                type: z.enum(['radial', 'linear', 'person', 'subject', 'background', 'sky']),
                adjustments: localAdjustmentsSchema.optional(),
                // Optional sub-category for background masks (use 22 for general background)
                subCategoryId: z.number().optional().describe('For background masks, use 22 for general background detection'),
                // Radial geometry
                top: z.number().min(0).max(1).optional(),
                left: z.number().min(0).max(1).optional(),
                bottom: z.number().min(0).max(1).optional(),
                right: z.number().min(0).max(1).optional(),
                angle: z.number().optional(),
                midpoint: z.number().min(0).max(100).optional(),
                roundness: z.number().min(-100).max(100).optional(),
                feather: z.number().min(0).max(100).optional(),
                inverted: z.boolean().optional(),
                flipped: z.boolean().optional(),
                // Linear geometry
                zeroX: z.number().min(0).max(1).optional(),
                zeroY: z.number().min(0).max(1).optional(),
                fullX: z.number().min(0).max(1).optional(),
                fullY: z.number().min(0).max(1).optional(),
                // Person/subject reference point
                referenceX: z.number().min(0).max(1).optional(),
                referenceY: z.number().min(0).max(1).optional(),
            });

            baseSchema = baseSchema.extend({
                masks: z.array(maskSchema).max(3).optional(),
            });
        }

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

        // Note: Individual mask functions removed - masks are now included in the main generate_color_adjustments function

        return tools;
    }


    private parseResultFromText(text: string): AIColorAdjustments | null {
        // Try to extract structured data from the text
        // This is a fallback method
        try {
            // Look for JSON-like structures in the text
            const jsonMatches = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
            if (jsonMatches) {
                for (const match of jsonMatches) {
                    try {
                        const parsed = JSON.parse(match);
                        // Check if it looks like a valid AIColorAdjustments object
                        if (parsed && typeof parsed === 'object' && (parsed.preset_name || parsed.confidence !== undefined)) {
                            return parsed as AIColorAdjustments;
                        }
                    } catch {
                        // Continue to next match
                        continue;
                    }
                }
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
