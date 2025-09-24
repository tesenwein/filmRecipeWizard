import { openai } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { getMaskConfig, normalizeMaskType } from '../shared/mask-types';
import { getCoreSystemPrompt } from './ai-prompt-shared';
import { AIFunctionToggles, buildBaseAdjustmentsSchema, createStreamingMaskSchema, getDefaultAIFunctionToggles } from './ai-shared';
import { AIColorAdjustments } from './types';

export interface StreamingUpdate {
    type: 'thinking' | 'analysis' | 'tool_call' | 'progress' | 'complete' | 'step_progress' | 'step_transition';
    content: string;
    step?: string;
    progress?: number;
    toolName?: string;
    toolArgs?: any;
}

export interface StreamingOptions {
    onUpdate?: (update: StreamingUpdate) => void;
    aiFunctions?: {
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

    constructor(apiKey: string, model: string = 'gpt-5') {
        this.apiKey = apiKey;
        this.model = model;
    }

    async analyzeColorMatchWithStreaming(
        baseImageBase64?: string | string[],
        targetImageBase64?: string,
        hint?: string,
        options?: StreamingOptions & { styleOptions?: any }
    ): Promise<AIColorAdjustments> {
        const { onUpdate } = options || {};

        try {
            // Build the user content with images
            const userContent = await this.buildUserContent(baseImageBase64, targetImageBase64, hint, options);

            // Create tools for the AI to use (separate tools per operation)
            const tools = this.createTools(options);

            // Use AI SDK v5 generateText for non-streaming API calls
            // Set the API key as environment variable for this call
            process.env.OPENAI_API_KEY = this.apiKey;
            const result = await generateText({
                model: openai(this.model),
                system: this.getSystemPrompt(options || {}),
                messages: [
                    {
                        role: 'user',
                        content: userContent,
                    },
                ],
                tools,
                toolChoice: 'required',
            });

            let finalResult: AIColorAdjustments | null = null;

            // Aggregate outputs from separate tools
            if (result.toolResults && result.toolResults.length > 0) {
                const aggregated: any = {};
                let masks: any[] | undefined;
                for (const toolResult of result.toolResults) {
                    const name = toolResult.toolName;
                    const output = toolResult.output as any;
                    if (!name || !output) continue;

                    if (name === 'generate_global_adjustments') {
                        Object.assign(aggregated, output);
                    } else if (name === 'generate_masks') {
                        if (Array.isArray(output.masks)) masks = output.masks;
                    } else if (name === 'name_and_describe') {
                        if (typeof output.preset_name === 'string') aggregated.preset_name = output.preset_name;
                        if (typeof output.description === 'string') aggregated.description = output.description;
                    } else if (name === 'generate_color_adjustments') {
                        // Backward compatibility: some older prompts may still call this combined tool
                        Object.assign(aggregated, output);
                        if ((output as any).masks && Array.isArray((output as any).masks)) {
                            masks = (output as any).masks;
                        }
                    }
                }

                if (masks && masks.length > 0) (aggregated as any).masks = masks;
                if (Object.keys(aggregated).length > 0) {
                    finalResult = aggregated as AIColorAdjustments;
                }
            }

            // Removed streaming code since we're using generateText instead of streamText

            if (!finalResult) {
                finalResult = this.parseResultFromText(result.text);
            }

            // Complete the finalization step
            onUpdate?.({
                type: 'step_progress',
                content: 'Recipe generation complete!',
                step: 'finalization',
                progress: 100,
            });

            // Send completion update
            onUpdate?.({
                type: 'complete',
                content: 'Recipe generation complete!',
                step: 'complete',
                progress: 100,
            });

            // Ensure an Adobe camera profile is always set on the result
            if (!finalResult) {
                finalResult = this.createDefaultAdjustments();
            }

            // Ensure description is always present
            if (!finalResult.description || finalResult.description.trim().length === 0) {
                finalResult.description = 'A professional color grading recipe with carefully balanced tones and contrast.';
            }

            // Ensure preset name is always present - only use fallback if truly empty
            if (!finalResult.preset_name || finalResult.preset_name.trim().length === 0) {
                finalResult.preset_name = 'Custom Recipe';
            }
            // else {
            // }

            const ensuredProfile = this.normalizeCameraProfileName(finalResult.camera_profile) || this.autoSelectProfileFromResult(finalResult);
            finalResult.camera_profile = ensuredProfile;

            return finalResult;

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
        options?: StreamingOptions & { styleOptions?: any }
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

        // Add detailed style instructions from artist and film styles
        if (options?.styleOptions) {
            const styleInstructions: string[] = [];
            
            if (options.styleOptions.artistStyle?.prompt) {
                styleInstructions.push(`ARTIST STYLE INSTRUCTIONS (${options.styleOptions.artistStyle.name}): ${options.styleOptions.artistStyle.prompt}`);
            }
            
            if (options.styleOptions.filmStyle?.prompt) {
                styleInstructions.push(`FILM STYLE INSTRUCTIONS (${options.styleOptions.filmStyle.name}): ${options.styleOptions.filmStyle.prompt}`);
            }
            
            if (styleInstructions.length > 0) {
                content.push({
                    type: 'text',
                    text: `DETAILED STYLE INSTRUCTIONS:\n${styleInstructions.join('\n\n')}`
                });
            }
        }

        return content;
    }

    private getSystemPrompt(_options: StreamingOptions): string {
        const base = getCoreSystemPrompt({
            includeMaskTypes: true,
            includeTechniques: true,
            includeRequirements: true
        });
        return `${base}

TOOL USAGE GUIDELINES:
- Use generate_global_adjustments for ALL global color/tone changes (no masks). Call this once.
- Use generate_masks to propose up to 3 targeted local masks with adjustments.
- Use name_and_describe to provide the preset_name and a short description. Always call this exactly once so the recipe has a title and description.
- You may also use analyze_color_palette, assess_lighting, and evaluate_style to reason before proposing adjustments.`;
    }

    private createTools(_options?: StreamingOptions) {
        const aiFunctions: AIFunctionToggles = getDefaultAIFunctionToggles();

        // Build schemas using shared helpers
        // Full base contains meta fields preset_name/description which we will separate for a dedicated tool
        const fullBaseSchema = buildBaseAdjustmentsSchema(aiFunctions);
        // Global adjustments schema excludes naming/description and masks; focused purely on global params
        const globalAdjustmentsSchema = fullBaseSchema
            .omit({ preset_name: true, description: true });

        // Masks schema (kept separate)
        const maskSchema = createStreamingMaskSchema();

        // Create tools using AI SDK v5's tool function with Zod schemas
        const tools: any = {};

        // Analysis tools - these help the AI understand the images
        tools.analyze_color_palette = tool({
            description: 'Analyze the color palette, dominant colors, and color relationships in the reference images. Identify the key color characteristics that define the style.',
            inputSchema: z.object({
                dominant_colors: z.array(z.string()).describe('Primary colors found in the reference images'),
                color_temperature: z.enum(['warm', 'cool', 'neutral']).describe('Overall color temperature'),
                color_saturation: z.enum(['muted', 'moderate', 'vibrant', 'oversaturated']).describe('Overall saturation level'),
                color_contrast: z.enum(['low', 'medium', 'high']).describe('Color contrast level'),
                color_relationships: z.string().describe('How colors relate to each other and create harmony'),
                style_notes: z.string().describe('Key observations about the color style')
            }),
            execute: async (input) => input,
        });

        tools.assess_lighting = tool({
            description: 'Assess the lighting conditions, exposure, and tonal characteristics of the reference images.',
            inputSchema: z.object({
                exposure_level: z.enum(['underexposed', 'correct', 'overexposed']).describe('Overall exposure level'),
                contrast_level: z.enum(['low', 'medium', 'high']).describe('Overall contrast level'),
                shadow_detail: z.enum(['crushed', 'preserved', 'lifted']).describe('Shadow detail preservation'),
                highlight_detail: z.enum(['blown', 'preserved', 'reduced']).describe('Highlight detail preservation'),
                lighting_quality: z.enum(['soft', 'hard', 'mixed']).describe('Quality of lighting'),
                mood: z.enum(['bright', 'neutral', 'moody', 'dramatic']).describe('Overall lighting mood'),
                lighting_notes: z.string().describe('Key observations about lighting and exposure')
            }),
            execute: async (input) => input,
        });

        tools.evaluate_style = tool({
            description: 'Evaluate the overall style, mood, and aesthetic characteristics of the reference images.',
            inputSchema: z.object({
                style_category: z.enum(['portrait', 'landscape', 'street', 'fashion', 'documentary', 'artistic', 'commercial', 'cinematic']).describe('Primary style category'),
                mood: z.enum(['bright', 'neutral', 'moody', 'dramatic', 'vintage', 'modern', 'ethereal']).describe('Overall mood'),
                aesthetic: z.enum(['clean', 'gritty', 'soft', 'harsh', 'warm', 'cool', 'vintage', 'modern']).describe('Aesthetic quality'),
                treatment: z.enum(['color', 'black_and_white', 'sepia', 'split_toned']).describe('Color treatment'),
                complexity: z.enum(['simple', 'moderate', 'complex']).describe('Visual complexity'),
                style_notes: z.string().describe('Key observations about the overall style and aesthetic')
            }),
            execute: async (input) => input,
        });

        // Global adjustments tool (no masks)
        tools.generate_global_adjustments = tool({
            description: 'Generate ONLY global Lightroom/Camera Raw adjustments (no masks). Use bold, noticeable changes. Include treatment, camera_profile if relevant.',
            inputSchema: globalAdjustmentsSchema,
            execute: async (input) => input,
        });

        // Mask generation tool
        tools.generate_masks = tool({
            description: 'Generate local adjustment masks for targeted editing. Use this to create precise local adjustments for specific areas like faces, skies, subjects, or backgrounds.',
            inputSchema: z.object({
                masks: z.array(maskSchema).max(3).describe('Array of masks to apply (max 3 masks)'),
                mask_strategy: z.string().describe('Strategy for mask placement and selection'),
                mask_notes: z.string().describe('Notes about why these masks were chosen')
            }),
            execute: async (input) => input,
        });

        // Separate naming/description tool
        tools.name_and_describe = tool({
            description: 'Propose a short, friendly preset name (2-4 Title Case words) and a 1-2 sentence description of the recipe style and mood.',
            inputSchema: z.object({
                preset_name: z.string().min(1),
                description: z.string(),
            }),
            execute: async (input) => input,
        });

        return tools;
    }


    private parseResultFromText(text: string): AIColorAdjustments | null {
        // Try to extract structured data from the text
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

    // Normalize any free-form profile name to Adobe's canonical set
    private normalizeCameraProfileName(name?: string): string | undefined {
        if (!name) return undefined;
        const n = String(name).toLowerCase();
        if (/mono|black\s*&?\s*white|b\s*&\s*w/.test(n)) return 'Adobe Monochrome';
        if (/portrait|people|skin/.test(n)) return 'Adobe Portrait';
        if (/landscape|sky|mountain|nature/.test(n)) return 'Adobe Landscape';
        if (/color|standard|default|auto/.test(n)) return 'Adobe Color';
        return 'Adobe Color';
    }

    // Pick an Adobe profile using the adjustments and mask hints
    private autoSelectProfileFromResult(adjustments: AIColorAdjustments): string {
        const isBW =
            !!adjustments.monochrome ||
            adjustments.treatment === 'black_and_white' ||
            (typeof adjustments.saturation === 'number' && adjustments.saturation <= -100);
        if (isBW) return 'Adobe Monochrome';

        const masks = (adjustments as any).masks || [];
        let faceCount = 0;
        let landscapeLike = 0;
        let hasSky = false;
        for (const m of masks) {
            let t: any = m?.type;
            if (typeof t === 'string') t = normalizeMaskType(t);
            const cfg = typeof t === 'string' ? getMaskConfig(t) : undefined;
            const cat = cfg?.category;
            if (cat === 'face' || t === 'subject' || t === 'person') faceCount++;
            if (cat === 'landscape' || cat === 'background') landscapeLike++;
            if (t === 'sky') hasSky = true;
        }
        if (faceCount > 0) return 'Adobe Portrait';
        if (hasSky || landscapeLike > 0) return 'Adobe Landscape';
        return 'Adobe Color';
    }

    private createDefaultAdjustments(): AIColorAdjustments {
        return {
            preset_name: 'Custom Recipe',
            description: 'A balanced color grading recipe with natural tones and clean contrast.',
            confidence: 0.5,
            camera_profile: 'Adobe Color',
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
            'generate_global_adjustments': 'global color/tone adjustments',
            'generate_color_adjustments': 'color characteristics and creating the recipe', // backward compat
            'analyze_color_palette': 'color palette and tonal relationships',
            'assess_lighting': 'lighting conditions and exposure',
            'evaluate_style': 'overall style and mood',
            'generate_masks': 'local masks and targeted edits',
            'name_and_describe': 'naming and description of the recipe',
        };
        return descriptions[toolName] || 'image characteristics';
    }
}
