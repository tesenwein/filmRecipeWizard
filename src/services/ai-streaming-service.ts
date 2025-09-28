import { openai } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { getMaskConfig, normalizeMaskType } from '../shared/mask-types';
import { getCoreSystemPrompt } from './ai-prompt-shared';
import { AIFunctionToggles, buildBaseAdjustmentsSchema, createStreamingMaskSchema, getDefaultAIFunctionToggles } from './ai-shared';
import { AIColorAdjustments } from './types';

type ToolResultRecord = {
    toolName?: string;
    output?: unknown;
    toolCallId?: string;
};

interface GenerationRequest {
    systemPrompt: string;
    userContent: any[];
    tools: any;
}

type GenerationResponse = Awaited<ReturnType<typeof generateText>>;

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

        // Validate that reference images are provided and will be processed
        if (baseImageBase64) {
            console.log('[AI STREAMING] Reference images detected - enforcing analysis:', {
                hasBaseImageBase64: !!baseImageBase64,
                baseImageBase64Type: Array.isArray(baseImageBase64) ? 'array' : typeof baseImageBase64,
                baseImageBase64Length: Array.isArray(baseImageBase64) ? baseImageBase64.length : (typeof baseImageBase64 === 'string' ? baseImageBase64.length : 0)
            });
            
            onUpdate?.({
                type: 'thinking',
                content: 'Reference images detected - analyzing style characteristics...',
                step: 'reference_analysis',
                progress: 10
            });
        }

        try {
            const request = await this.prepareGenerationRequest(
                baseImageBase64,
                targetImageBase64,
                hint,
                options
            );
            const result = await this.executeGenerationRequest(request);

            let finalResult = this.extractAdjustmentsFromTools(result);
            if (!finalResult) {
                finalResult = this.parseResultFromText(result.text);
            }

            // Validate that reference images were actually analyzed
            if (baseImageBase64 && finalResult) {
                const toolResults = this.collectAllToolResults(result);
                const hasAnalysis = toolResults.some(tool => 
                    ['analyze_color_palette', 'assess_lighting', 'evaluate_style'].includes(tool.toolName || '')
                );
                
                if (!hasAnalysis) {
                    console.warn('[AI STREAMING] Reference images provided but analysis tools not used - this may indicate the AI ignored the reference images');
                    onUpdate?.({
                        type: 'thinking',
                        content: 'Warning: Reference images were provided but may not have been fully analyzed',
                        step: 'reference_warning',
                        progress: 90
                    });
                } else {
                    console.log('[AI STREAMING] Reference images successfully analyzed');
                    onUpdate?.({
                        type: 'thinking',
                        content: 'Reference images analyzed - generating style-matched adjustments...',
                        step: 'style_matching',
                        progress: 80
                    });
                }
            }

            this.emitCompletionUpdates(onUpdate);

            return this.ensureAdjustmentMetadata(finalResult);
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

        // Debug logging for AI content building
        console.log('[DEBUG] AI Streaming Service - buildUserContent:', {
            hasBaseImageBase64: !!baseImageBase64,
            baseImageBase64Type: Array.isArray(baseImageBase64) ? 'array' : typeof baseImageBase64,
            baseImageBase64Length: Array.isArray(baseImageBase64) ? baseImageBase64.length : (typeof baseImageBase64 === 'string' ? baseImageBase64.length : 0),
            hasTargetImageBase64: !!targetImageBase64,
            targetImageBase64Length: typeof targetImageBase64 === 'string' ? targetImageBase64.length : 0,
            hasHint: !!hint,
            hintLength: typeof hint === 'string' ? hint.length : 0,
            hasStyleOptions: !!options?.styleOptions
        });

        // Add reference images (the style we want to match)
        if (baseImageBase64) {
            content.push({
                type: 'text',
                text: 'CRITICAL: REFERENCE IMAGES PROVIDED - YOU MUST ANALYZE THESE IMAGES AND MATCH THEIR STYLE EXACTLY. These images show the exact style, color grading, and look you must replicate. Study every detail: color temperature, contrast, saturation, shadows, highlights, and overall mood. Your adjustments must recreate this exact look.'
            });
            const baseImages = Array.isArray(baseImageBase64) ? baseImageBase64 : [baseImageBase64];
            baseImages.forEach((image, index) => {
                content.push({
                    type: 'image',
                    image: image,
                    detail: 'high'
                });
                content.push({
                    type: 'text',
                    text: `REFERENCE IMAGE ${index + 1}: Analyze this image carefully. Note the color grading, contrast, saturation, shadows, highlights, and overall aesthetic. You must match this exact style.`
                });
            });
            content.push({
                type: 'text',
                text: 'MANDATORY: You MUST use the analyze_color_palette, assess_lighting, and evaluate_style tools to analyze these reference images before generating any adjustments. Then use generate_global_adjustments to recreate the exact style shown in the reference images.'
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
        } else {
            // No target image provided - create a preset based on reference style only
            content.push({
                type: 'text',
                text: 'NO TARGET IMAGE PROVIDED: Create a preset based on the reference image style that can be applied to any similar image.'
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

    private collectAllToolResults(result: GenerationResponse): ToolResultRecord[] {
        const collected: ToolResultRecord[] = [];
        const seen = new Set<string>();

        const track = (toolResult: ToolResultRecord | undefined) => {
            if (!toolResult || typeof toolResult !== 'object') return;
            const toolName = toolResult.toolName;
            if (!toolName) return;

            let keySource = typeof toolResult.toolCallId === 'string'
                ? toolResult.toolCallId
                : undefined;
            if (!keySource) {
                try {
                    keySource = `${toolName}-${JSON.stringify(toolResult.output)}`;
                } catch {
                    keySource = `${toolName}-${collected.length}`;
                }
            }
            if (seen.has(keySource)) return;
            seen.add(keySource);
            collected.push({
                toolName,
                output: toolResult.output,
                toolCallId: toolResult.toolCallId,
            });
        };

        if (Array.isArray(result?.toolResults)) {
            for (const toolResult of result.toolResults) {
                track(toolResult);
            }
        }

        const messages = (result?.response as any)?.messages;
        if (Array.isArray(messages)) {
            for (const message of messages) {
                const parts = Array.isArray((message as any)?.content) ? (message as any).content : [];
                for (const part of parts) {
                    if (part?.type === 'tool-result') {
                        track(part);
                    }
                }
            }
        }

        return collected;
    }

    private async prepareGenerationRequest(
        baseImageBase64?: string | string[],
        targetImageBase64?: string,
        hint?: string,
        options?: StreamingOptions & { styleOptions?: any }
    ): Promise<GenerationRequest> {
        const userContent = await this.buildUserContent(baseImageBase64, targetImageBase64, hint, options);
        const tools = this.createTools(options);
        const systemPrompt = this.getSystemPrompt(options || {});

        return {
            systemPrompt,
            userContent,
            tools,
        };
    }

    private async executeGenerationRequest(request: GenerationRequest): Promise<GenerationResponse> {
        process.env.OPENAI_API_KEY = this.apiKey;
        return generateText({
            model: openai(this.model),
            system: request.systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: request.userContent,
                },
            ],
            tools: request.tools,
            toolChoice: 'required',
        });
    }

    private extractAdjustmentsFromTools(result: GenerationResponse): AIColorAdjustments | null {
        const allToolResults = this.collectAllToolResults(result);
        if (allToolResults.length === 0) return null;

        const aggregated: Record<string, unknown> = {};
        let masks: any[] | undefined;

        for (const toolResult of allToolResults) {
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
            }
        }

        if (masks && masks.length > 0) {
            (aggregated as any).masks = masks;
        }

        return Object.keys(aggregated).length > 0 ? (aggregated as AIColorAdjustments) : null;
    }

    private emitCompletionUpdates(onUpdate?: StreamingOptions['onUpdate']) {
        if (!onUpdate) return;

        onUpdate({
            type: 'step_progress',
            content: 'Recipe generation complete!',
            step: 'finalization',
            progress: 100,
        });

        onUpdate({
            type: 'complete',
            content: 'Recipe generation complete!',
            step: 'complete',
            progress: 100,
        });
    }

    private ensureAdjustmentMetadata(adjustments: AIColorAdjustments | null): AIColorAdjustments {
        const ensured = adjustments ? { ...adjustments } : { ...this.createDefaultAdjustments() };

        if (!ensured.description || ensured.description.trim().length === 0) {
            ensured.description = 'A professional color grading recipe with carefully balanced tones and contrast.';
        }

        if (!ensured.preset_name || ensured.preset_name.trim().length === 0) {
            ensured.preset_name = 'Custom Recipe';
        }

        const normalizedProfile = this.normalizeCameraProfileName(ensured.camera_profile) || this.autoSelectProfileFromResult(ensured);
        ensured.camera_profile = normalizedProfile;

        return ensured;
    }

    private getSystemPrompt(_options: StreamingOptions): string {
        const base = getCoreSystemPrompt({
            includeMaskTypes: true,
            includeTechniques: true,
            includeRequirements: true
        });
        return `${base}

CRITICAL REFERENCE IMAGE REQUIREMENTS:
- If reference images are provided, you MUST analyze them first using analyze_color_palette, assess_lighting, and evaluate_style tools.
- You MUST match the reference style exactly - study color temperature, contrast, saturation, shadows, highlights, and mood.
- Your adjustments must recreate the exact look shown in the reference images.
- Ignoring reference images will result in incorrect recipes.

CRITICAL TOOL USAGE REQUIREMENTS:
- You MUST use generate_global_adjustments for ALL global color/tone changes (no masks). This is REQUIRED and must be called exactly once.
- You MUST use name_and_describe to provide the preset_name and description. This is REQUIRED and must be called exactly once.
- You MAY use generate_masks for targeted local adjustments (max 3 masks) if the reference style requires local modifications.
- You MAY use analyze_color_palette, assess_lighting, and evaluate_style to reason before proposing adjustments.
- FAILURE TO USE REQUIRED TOOLS WILL RESULT IN INCOMPLETE RECIPES.`;
    }

    private createTools(options?: StreamingOptions) {
        const toggles = this.resolveFunctionToggles(options?.aiFunctions);
        const { globalAdjustmentsSchema, maskSchema } = this.buildToolSchemas(toggles);

        const tools: any = {
            ...this.buildAnalysisTools(),
            ...this.buildGlobalAdjustmentsTool(globalAdjustmentsSchema),
            ...this.buildNamingTool(),
        };

        if (toggles.masks !== false) {
            Object.assign(tools, this.buildMaskTool(maskSchema));
        }

        return tools;
    }

    private resolveFunctionToggles(overrides?: StreamingOptions['aiFunctions']): AIFunctionToggles {
        return { ...getDefaultAIFunctionToggles(), ...overrides } as AIFunctionToggles;
    }

    private buildToolSchemas(aiFunctions: AIFunctionToggles) {
        const fullBaseSchema = buildBaseAdjustmentsSchema(aiFunctions);
        const globalAdjustmentsSchema = fullBaseSchema.omit({ preset_name: true, description: true });
        const maskSchema = createStreamingMaskSchema();
        return { globalAdjustmentsSchema, maskSchema };
    }

    private buildAnalysisTools() {
        return {
            analyze_color_palette: tool({
                description: 'MANDATORY FOR REFERENCE IMAGES: Analyze the color palette, dominant colors, and color relationships in the reference images. This tool MUST be used when reference images are provided to understand the exact color characteristics that must be replicated.',
                inputSchema: z.object({
                    dominant_colors: z.array(z.string()).describe('Primary colors found in the reference images'),
                    color_temperature: z.enum(['warm', 'cool', 'neutral']).describe('Overall color temperature'),
                    color_saturation: z.enum(['muted', 'moderate', 'vibrant', 'oversaturated']).describe('Overall saturation level'),
                    color_contrast: z.enum(['low', 'medium', 'high']).describe('Color contrast level'),
                    color_relationships: z.string().describe('How colors relate to each other and create harmony'),
                    style_notes: z.string().describe('Key observations about the color style')
                }),
                execute: async (input) => input,
            }),
            assess_lighting: tool({
                description: 'MANDATORY FOR REFERENCE IMAGES: Assess the lighting conditions, exposure, and tonal characteristics of the reference images. This tool MUST be used when reference images are provided to understand the exact lighting and exposure characteristics that must be replicated.',
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
            }),
            evaluate_style: tool({
                description: 'MANDATORY FOR REFERENCE IMAGES: Evaluate the overall style, mood, and aesthetic characteristics of the reference images. This tool MUST be used when reference images are provided to understand the exact style and aesthetic that must be replicated.',
                inputSchema: z.object({
                    style_category: z.enum(['portrait', 'landscape', 'street', 'fashion', 'documentary', 'artistic', 'commercial', 'cinematic']).describe('Primary style category'),
                    mood: z.enum(['bright', 'neutral', 'moody', 'dramatic', 'vintage', 'modern', 'ethereal']).describe('Overall mood'),
                    aesthetic: z.enum(['clean', 'gritty', 'soft', 'harsh', 'warm', 'cool', 'vintage', 'modern']).describe('Aesthetic quality'),
                    treatment: z.enum(['color', 'black_and_white', 'sepia', 'split_toned']).describe('Color treatment'),
                    complexity: z.enum(['simple', 'moderate', 'complex']).describe('Visual complexity'),
                    style_notes: z.string().describe('Key observations about the overall style and aesthetic')
                }),
                execute: async (input) => input,
            }),
        };
    }

    private buildGlobalAdjustmentsTool(globalAdjustmentsSchema: z.ZodTypeAny) {
        return {
            generate_global_adjustments: tool({
                description: 'REQUIRED: Generate global Lightroom/Camera Raw adjustments for the entire image. This is the PRIMARY tool for creating the main color grading and tone adjustments. Use bold, noticeable changes to match the reference style. Include treatment, camera_profile, tone curves, and color grading.',
                inputSchema: globalAdjustmentsSchema,
                execute: async (input) => input,
            }),
        };
    }

    private buildMaskTool(maskSchema: z.ZodTypeAny) {
        return {
            generate_masks: tool({
                description: 'OPTIONAL: Generate local adjustment masks for targeted editing of specific areas. Use this to create precise local adjustments for faces, skies, subjects, or backgrounds. Only use if the reference style requires local adjustments.',
                inputSchema: z.object({
                    masks: z.array(maskSchema).max(3).describe('Array of masks to apply (max 3 masks)'),
                    mask_strategy: z.string().describe('Strategy for mask placement and selection'),
                    mask_notes: z.string().describe('Notes about why these masks were chosen')
                }),
                execute: async (input) => input,
            }),
        };
    }

    private buildNamingTool() {
        return {
            name_and_describe: tool({
                description: 'REQUIRED: Generate a short, friendly preset name (2-4 Title Case words) and a 1-2 sentence description of the recipe style and mood. This tool MUST be called to provide the recipe title and description.',
                inputSchema: z.object({
                    preset_name: z.string().min(1).describe('Short, friendly preset name in Title Case (2-4 words)'),
                    description: z.string().describe('1-2 sentence description of the recipe style and mood'),
                }),
                execute: async (input) => input,
            }),
        };
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


}
