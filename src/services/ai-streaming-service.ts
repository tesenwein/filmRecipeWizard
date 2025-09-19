import { openai } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { getMaskTypesByCategory, normalizeMaskType, getMaskConfig } from '../shared/mask-types';
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
                // Fallback: try to parse the result from the text
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
                console.log('[AI] No description found, applying fallback description');
                finalResult.description = 'A professional color grading recipe with carefully balanced tones and contrast.';
            }

            // Ensure preset name is always present
            if (!finalResult.preset_name || finalResult.preset_name.trim().length === 0 || finalResult.preset_name === 'Custom Recipe') {
                console.log('[AI] No preset name found or using fallback, applying fallback name');
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

        const faceMaskList = faceMasks.map(m => `'${m.type}' for ${m.description}`).join(', ');
        const landscapeMaskList = landscapeMasks.map(m => `'${m.type}' for ${m.description}`).join(', ');
        const subjectMaskList = subjectMasks.map(m => `'${m.type}' for ${m.description}`).join(', ');
        const backgroundMaskList = backgroundMasks.map(m => `'${m.type}' for ${m.description}`).join(', ');
        const otherMaskList = otherMasks.map(m => `'${m.type}' for ${m.description}`).join(', ');

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
- Generate a short, engaging description (1-2 sentences) that captures the style and mood

PROFILE SELECTION:
- Always set camera_profile to one of: 'Adobe Color', 'Adobe Portrait', 'Adobe Landscape', or 'Adobe Monochrome'
- Use 'Adobe Monochrome' when treatment is black & white or the style is clearly monochrome
- Prefer 'Adobe Portrait' for people/face-focused images (skin, eyes, hair, etc.)
- Prefer 'Adobe Landscape' for scenes with sky/foliage/mountains/background-dominant content
- Otherwise use 'Adobe Color'

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
   - For sky masks, use type: 'sky' with referenceX/Y coordinates
   - CRITICAL: For ANY facial features (skin, eyes, teeth, hair, etc.), ALWAYS use specific face masks instead of radial masks
   - NEVER use 'radial' masks for facial features - use specific face mask types instead
   - AVOID using 'subject' or 'person' masks unless you can clearly identify a face/person in the image
   - AVOID using 'radial' masks - prefer specific mask types (face, landscape, background, sky) or 'linear' masks for gradients
   - Use 'linear' masks for gradients or directional lighting effects
   - Use 'background' masks to adjust everything except the main subject
   
   AVAILABLE MASK TYPES:
   - Face/Body Masks: ${faceMaskList}
   - Landscape Masks: ${landscapeMaskList}
   - Subject Masks: ${subjectMaskList}
   - Background Masks: ${backgroundMaskList}
   - Other Masks: ${otherMaskList}
   
   - Face-specific masks work best for portrait photography and require clear facial features
   - Landscape masks work best for outdoor/nature photography and require clear landscape elements` +
            (options.aiFunctions?.pointColor ? `\n6. Point color adjustments: Use point_colors and color_variance for targeted color corrections` : '') +
            '' +
            `
7. For portraits, ensure a match in skin tone and backdrop
8. For landscapes, ensure sky/foliage mood and lighting alignment
9. Mask modifications values should be minimal and very subtle
10. Apply advanced color grading techniques including shadow/midtone/highlight color grading
11. Use HSL (hue/saturation/luminance) adjustments to fine-tune specific color ranges
12. Consider tone curve adjustments for sophisticated contrast control

CRITICAL: You MUST always include a preset_name (2-4 words, Title Case) that describes the visual style and mood of the recipe. This is REQUIRED and cannot be empty. Examples: "Warm Portrait", "Cool Landscape", "Cinematic Shadows", "Vintage Film", "Golden Hour", "Moody B&W". Also include a compelling description (1-2 sentences) that describes the visual style and mood of the recipe (e.g., "Warm, cinematic tones with rich shadows and golden highlights perfect for portrait photography" or "Cool, desaturated look with blue undertones ideal for urban landscapes").
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
