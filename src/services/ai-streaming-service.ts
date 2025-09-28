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

TOOL USAGE GUIDELINES:
- Use generate_global_adjustments for ALL global color/tone changes (no masks). Call this once.
- Use generate_masks to propose up to 3 targeted local masks with adjustments.
- Use name_and_describe to provide the preset_name and a short description. Always call this exactly once so the recipe has a title and description.
- You may also use analyze_color_palette, assess_lighting, and evaluate_style to reason before proposing adjustments.`;
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
            }),
            assess_lighting: tool({
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
            }),
            evaluate_style: tool({
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
            }),
        };
    }

    private buildGlobalAdjustmentsTool(globalAdjustmentsSchema: z.ZodTypeAny) {
        return {
            generate_global_adjustments: tool({
                description: 'Generate ONLY global Lightroom/Camera Raw adjustments (no masks). Use bold, noticeable changes. Include treatment, camera_profile if relevant.',
                inputSchema: globalAdjustmentsSchema,
                execute: async (input) => input,
            }),
        };
    }

    private buildMaskTool(maskSchema: z.ZodTypeAny) {
        return {
            generate_masks: tool({
                description: 'Generate local adjustment masks for targeted editing. Use this to create precise local adjustments for specific areas like faces, skies, subjects, or backgrounds.',
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
                description: 'Propose a short, friendly preset name (2-4 Title Case words) and a 1-2 sentence description of the recipe style and mood.',
                inputSchema: z.object({
                    preset_name: z.string().min(1),
                    description: z.string(),
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
