import { openai } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { getMaskConfig, getMaskTypesByCategory, normalizeMaskType } from '../shared/mask-types';
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
            });

            let finalResult: AIColorAdjustments | null = null;

            // Extract result from tool calls
            if (result.toolResults && result.toolResults.length > 0) {
                for (const toolResult of result.toolResults) {
                    if (toolResult.toolName === 'generate_color_adjustments' && toolResult.output) {
                        finalResult = toolResult.output as AIColorAdjustments;
                        console.log('[AI] Tool result received:', {
                            hasDescription: !!finalResult.description,
                            description: finalResult.description,
                            presetName: finalResult.preset_name
                        });
                        break;
                    }
                }
            }

            // Removed streaming code since we're using generateText instead of streamText

            if (!finalResult) {
                console.log('[AI] No tool results found, attempting to parse from text');
                finalResult = this.parseResultFromText(result.text);
                if (finalResult) {
                    console.log('[AI] Parsed result from text:', {
                        hasDescription: !!finalResult.description,
                        description: finalResult.description,
                        presetName: finalResult.preset_name
                    });
                }
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
            } else {
                console.log('[AI] Generated preset name:', finalResult.preset_name);
            }

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
        // Generate mask type descriptions dynamically from configuration
        const faceMasks = getMaskTypesByCategory('face');
        const landscapeMasks = getMaskTypesByCategory('landscape');
        const subjectMasks = getMaskTypesByCategory('subject');
        const backgroundMasks = getMaskTypesByCategory('background');
        const otherMasks = getMaskTypesByCategory('other');

        const faceMaskList = faceMasks.map(m => m.type).join(', ');
        const landscapeMaskList = landscapeMasks.map(m => m.type).join(', ');
        const subjectMaskList = subjectMasks.map(m => m.type).join(', ');
        const backgroundMaskList = backgroundMasks.map(m => m.type).join(', ');
        const otherMaskList = otherMasks.map(m => m.type).join(', ');

        return `You are a professional photo editor. Create Lightroom/Camera Raw adjustments to match the target image to the reference style.

TASK:
- REFERENCE IMAGES: Style to achieve
- TARGET IMAGE: Photo to modify  
- STYLE DESCRIPTION: Text description of desired look

REQUIREMENTS:
- Generate preset_name (2-4 words, Title Case) - REQUIRED
- Include description (1-2 sentences) of style and mood
- Set camera_profile: 'Adobe Color', 'Adobe Portrait', 'Adobe Landscape', or 'Adobe Monochrome'
- Use 'Adobe Monochrome' for B&W, 'Adobe Portrait' for people, 'Adobe Landscape' for nature/sky
- For portrait use masks to optimize and do not use radial masks for portrait

AVAILABLE MASKS:
- Face: ${faceMaskList}
- Landscape: ${landscapeMaskList}  
- Subject: ${subjectMaskList}
- Background: ${backgroundMaskList}
- Other: ${otherMaskList}

TECHNIQUES:
- Apply subtle mask adjustments
- Use color grading for shadows/midtones/highlights
- Fine-tune with HSL adjustments
- Consider tone curves for contrast
${options.aiFunctions?.pointColor ? '- Use point_colors for targeted corrections' : ''}
- For B&W: include gray_* values for each color channel
- For film/artist styles: match HSL and tone curve characteristics`;
    }

    private createTools(options?: StreamingOptions) {
        const aiFunctions: AIFunctionToggles = options?.aiFunctions || getDefaultAIFunctionToggles();

        // Build base schema using Zod
        let baseSchema = buildBaseAdjustmentsSchema(aiFunctions);

        // Add conditional properties based on enabled functions
        // base schema now built via shared helper

        // Add masks if enabled
        if (aiFunctions.masks) {
            const maskSchema = createStreamingMaskSchema();
            baseSchema = baseSchema.extend({ masks: z.array(maskSchema).max(3).optional() });
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

        const masks = Array.isArray((adjustments as any).masks) ? ((adjustments as any).masks as any[]) : [];
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
            'generate_color_adjustments': 'color characteristics and creating the recipe',
            'analyze_color_palette': 'color palette and tonal relationships',
            'assess_lighting': 'lighting conditions and exposure',
            'evaluate_style': 'overall style and mood'
        };
        return descriptions[toolName] || 'image characteristics';
    }
}
