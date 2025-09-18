"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIStreamingService = void 0;
const openai_1 = require("@ai-sdk/openai");
const ai_1 = require("ai");
const zod_1 = require("zod");
class AIStreamingService {
    constructor(apiKey, model = 'gpt-4o') {
        this.apiKey = apiKey;
        this.model = model;
    }
    async analyzeColorMatchWithStreaming(baseImageBase64, targetImageBase64, hint, options) {
        const { onUpdate } = options || {};
        try {
            // Build the user content with images
            const userContent = await this.buildUserContent(baseImageBase64, targetImageBase64, hint, options);
            // Create tools for the AI to use
            const tools = this.createTools(options);
            // Use AI SDK v5 generateText for non-streaming API calls
            // Set the API key as environment variable for this call
            const originalApiKey = process.env.OPENAI_API_KEY;
            process.env.OPENAI_API_KEY = this.apiKey;
            const result = await (0, ai_1.generateText)({
                model: (0, openai_1.openai)(this.model),
                system: this.getSystemPrompt(options || {}),
                messages: [
                    {
                        role: 'user',
                        content: userContent,
                    },
                ],
                tools,
            });
            // Restore original API key
            if (originalApiKey) {
                process.env.OPENAI_API_KEY = originalApiKey;
            }
            else {
                delete process.env.OPENAI_API_KEY;
            }
            // Simulate progress updates for UI consistency
            onUpdate?.({
                type: 'progress',
                content: '',
                step: 'initialization',
                progress: 20,
            });
            onUpdate?.({
                type: 'step_progress',
                content: '',
                step: 'analysis',
                progress: 50,
            });
            onUpdate?.({
                type: 'step_transition',
                content: '',
                step: 'color_matching',
                progress: 80,
            });
            // Extract the result from tool calls
            let finalResult = null;
            if (result.toolResults && result.toolResults.length > 0) {
                // Find the tool result that contains our adjustments
                const adjustmentToolResult = result.toolResults.find(toolResult => toolResult.toolName === 'generate_color_adjustments' || toolResult.toolName === 'report_global_adjustments');
                if (adjustmentToolResult) {
                    // Access the result using the correct property name (output, not result)
                    finalResult = adjustmentToolResult.output;
                }
            }
            // Fallback: try to parse the result from the text
            if (!finalResult) {
                finalResult = this.parseResultFromText(result.text);
            }
            onUpdate?.({
                type: 'step_transition',
                content: '',
                step: 'finalization',
                progress: 100,
            });
            return finalResult || this.createDefaultAdjustments();
        }
        catch (error) {
            console.error('AI Streaming Service Error:', error);
            onUpdate?.({
                type: 'thinking',
                content: `Error during analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
                step: 'error',
                progress: 100,
            });
            throw error;
        }
    }
    async buildUserContent(baseImageBase64, targetImageBase64, hint, _options) {
        const content = [];
        // Add reference images (the style we want to match)
        if (baseImageBase64) {
            content.push({
                type: 'text',
                text: 'REFERENCE IMAGES (the style/look we want to achieve):',
            });
            const baseImages = Array.isArray(baseImageBase64) ? baseImageBase64 : [baseImageBase64];
            baseImages.forEach((image, _index) => {
                content.push({
                    type: 'image',
                    image: image,
                    detail: 'high',
                });
            });
        }
        // Add target image (the image to be modified)
        if (targetImageBase64) {
            content.push({
                type: 'text',
                text: 'TARGET IMAGE (the image to be modified to match the reference style):',
            });
            content.push({
                type: 'image',
                image: targetImageBase64,
                detail: 'high',
            });
        }
        // Add user hint/prompt
        if (hint) {
            content.push({
                type: 'text',
                text: `STYLE DESCRIPTION (text description of the desired look/style, NOT an image): ${hint}`,
            });
        }
        return content;
    }
    getSystemPrompt(options) {
        return (`You are a professional photo editor. Create comprehensive Lightroom/Camera Raw adjustments to achieve the target look.

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

Show your thinking process step by step as you analyze the images. Explain what you're looking for, what you notice about the colors, tones, and style, and how you're building the recipe.

For the description field, create a compelling, concise summary that describes the visual style and mood of the recipe (e.g., "Warm, cinematic tones with rich shadows and golden highlights perfect for portrait photography" or "Cool, desaturated look with blue undertones ideal for urban landscapes").

CRITICAL: You must call the generate_color_adjustments function with ALL adjustments including masks in a single call. Do NOT call individual mask functions - they are just for reference.

Call the generate_color_adjustments function with:
1. Global adjustments: temperature, tint, exposure, contrast, highlights, shadows, whites, blacks, clarity, vibrance, saturation
2. Color grading: shadow/midtone/highlight color grading values
3. HSL adjustments: hue/saturation/luminance for each color range
4. Tone curves: parametric and point curve adjustments
5. Masks: Include masks array with local adjustments (max 3 masks)
   - For background masks, include subCategoryId: 22 for proper Lightroom detection
   - For sky masks, use type: 'sky' with referenceX/Y coordinates
   - CRITICAL: For ANY facial features (skin, eyes, teeth, hair, etc.), ALWAYS use specific face masks instead of radial masks
   - NEVER use 'radial' masks for facial features - use 'face_skin', 'eye_whites', 'iris_pupil', 'teeth', 'eyebrows', 'lips', 'hair', 'facial_hair' instead
   - AVOID using 'subject' or 'person' masks unless you can clearly identify a face/person in the image
   - AVOID using 'radial' masks - prefer specific mask types (face, landscape, background, sky) or 'linear' masks for gradients
   - Use 'linear' masks for gradients or directional lighting effects
   - Use 'background' masks to adjust everything except the main subject
   - For portraits with clear faces, ALWAYS use specific face masks: 'face_skin' for facial skin, 'eye_whites' for eye sclera, 'iris_pupil' for iris and pupil, 'teeth' for teeth
   - Additional face/body masks: 'body_skin' for body skin, 'eyebrows' for eyebrows, 'lips' for lips, 'hair' for hair, 'facial_hair' for beards/mustaches, 'clothing' for clothes
   - Landscape masks: 'mountains' for mountain ranges, 'architecture' for buildings/structures, 'vegetation' for plants/trees, 'water' for water bodies, 'natural_ground' for natural terrain, 'artificial_ground' for man-made surfaces
   - Face-specific masks work best for portrait photography and require clear facial features
   - Landscape masks work best for outdoor/nature photography and require clear landscape elements` +
            (options.aiFunctions?.pointColor
                ? `\n6. Point color adjustments: Use point_colors and color_variance for targeted color corrections`
                : '') +
            (options.preserveSkinTones ? `\n${options.aiFunctions?.pointColor ? '7' : '6'}. Preserve natural skin tones in Subject masks` : '') +
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

Provide detailed reasoning for each adjustment to help the user understand the creative process.`);
    }
    createTools(options) {
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
        let baseSchema = zod_1.z.object({
            preset_name: zod_1.z.string().describe('Short, friendly preset name to use for XMP and recipe title'),
            treatment: zod_1.z.enum(['color', 'black_and_white']).describe('Overall treatment for the target image'),
            camera_profile: zod_1.z.string().optional().describe("Preferred camera profile (e.g., 'Adobe Color', 'Adobe Monochrome')"),
            monochrome: zod_1.z.boolean().optional().describe('Convert to black and white'),
            confidence: zod_1.z.number().min(0).max(1).describe('Confidence in the analysis (0.0 to 1.0)'),
            reasoning: zod_1.z.string().describe('Brief explanation of the adjustments made'),
            description: zod_1.z.string().describe('Short, engaging description of the recipe style and mood (1-2 sentences)'),
            exposure: zod_1.z.number().min(-5).max(5).optional().describe('Exposure adjustment in stops (-5.0 to +5.0)'),
            highlights: zod_1.z.number().min(-100).max(100).optional().describe('Highlights recovery (-100 to +100)'),
            shadows: zod_1.z.number().min(-100).max(100).optional().describe('Shadows lift (-100 to +100)'),
            whites: zod_1.z.number().min(-100).max(100).optional().describe('Whites adjustment (-100 to +100)'),
            blacks: zod_1.z.number().min(-100).max(100).optional().describe('Blacks adjustment (-100 to +100)'),
            brightness: zod_1.z.number().min(-100).max(100).optional().describe('Brightness adjustment (-100 to +100)'),
            contrast: zod_1.z.number().min(-100).max(100).optional().describe('Contrast adjustment (-100 to +100)'),
            clarity: zod_1.z.number().min(-100).max(100).optional().describe('Clarity adjustment (-100 to +100)'),
            vibrance: zod_1.z.number().min(-100).max(100).optional().describe('Vibrance adjustment (-100 to +100)'),
            saturation: zod_1.z.number().min(-100).max(100).optional().describe('Saturation adjustment (-100 to +100)'),
        });
        // Add conditional properties based on enabled functions
        if (aiFunctions.temperatureTint) {
            baseSchema = baseSchema.extend({
                temperature: zod_1.z.number().min(2000).max(50000).optional().describe('White balance temperature in Kelvin (2000 to 50000)'),
                tint: zod_1.z.number().min(-150).max(150).optional().describe('White balance tint (-150 to +150, negative=green, positive=magenta)'),
            });
        }
        if (aiFunctions.colorGrading) {
            baseSchema = baseSchema.extend({
                color_grade_shadow_hue: zod_1.z.number().min(0).max(360).optional(),
                color_grade_shadow_sat: zod_1.z.number().min(0).max(100).optional(),
                color_grade_shadow_lum: zod_1.z.number().min(-100).max(100).optional(),
                color_grade_midtone_hue: zod_1.z.number().min(0).max(360).optional(),
                color_grade_midtone_sat: zod_1.z.number().min(0).max(100).optional(),
                color_grade_midtone_lum: zod_1.z.number().min(-100).max(100).optional(),
                color_grade_highlight_hue: zod_1.z.number().min(0).max(360).optional(),
                color_grade_highlight_sat: zod_1.z.number().min(0).max(100).optional(),
                color_grade_highlight_lum: zod_1.z.number().min(-100).max(100).optional(),
            });
        }
        if (aiFunctions.hsl) {
            baseSchema = baseSchema.extend({
                hue_red: zod_1.z.number().min(-100).max(100).optional(),
                hue_orange: zod_1.z.number().min(-100).max(100).optional(),
                hue_yellow: zod_1.z.number().min(-100).max(100).optional(),
                hue_green: zod_1.z.number().min(-100).max(100).optional(),
                hue_aqua: zod_1.z.number().min(-100).max(100).optional(),
                hue_blue: zod_1.z.number().min(-100).max(100).optional(),
                hue_purple: zod_1.z.number().min(-100).max(100).optional(),
                hue_magenta: zod_1.z.number().min(-100).max(100).optional(),
                sat_red: zod_1.z.number().min(-100).max(100).optional(),
                sat_orange: zod_1.z.number().min(-100).max(100).optional(),
                sat_yellow: zod_1.z.number().min(-100).max(100).optional(),
                sat_green: zod_1.z.number().min(-100).max(100).optional(),
                sat_aqua: zod_1.z.number().min(-100).max(100).optional(),
                sat_blue: zod_1.z.number().min(-100).max(100).optional(),
                sat_purple: zod_1.z.number().min(-100).max(100).optional(),
                sat_magenta: zod_1.z.number().min(-100).max(100).optional(),
                lum_red: zod_1.z.number().min(-100).max(100).optional(),
                lum_orange: zod_1.z.number().min(-100).max(100).optional(),
                lum_yellow: zod_1.z.number().min(-100).max(100).optional(),
                lum_green: zod_1.z.number().min(-100).max(100).optional(),
                lum_aqua: zod_1.z.number().min(-100).max(100).optional(),
                lum_blue: zod_1.z.number().min(-100).max(100).optional(),
                lum_purple: zod_1.z.number().min(-100).max(100).optional(),
                lum_magenta: zod_1.z.number().min(-100).max(100).optional(),
            });
        }
        if (aiFunctions.grain) {
            baseSchema = baseSchema.extend({
                grain_amount: zod_1.z.number().min(0).max(100).optional(),
                grain_size: zod_1.z.number().min(0).max(100).optional(),
                grain_frequency: zod_1.z.number().min(0).max(100).optional(),
            });
        }
        if (aiFunctions.curves) {
            const curvePoint = zod_1.z.object({
                input: zod_1.z.number(),
                output: zod_1.z.number(),
            });
            const curveArray = zod_1.z.array(curvePoint);
            baseSchema = baseSchema.extend({
                tone_curve: curveArray.optional(),
                tone_curve_red: curveArray.optional(),
                tone_curve_green: curveArray.optional(),
                tone_curve_blue: curveArray.optional(),
            });
        }
        if (aiFunctions.pointColor) {
            baseSchema = baseSchema.extend({
                point_colors: zod_1.z.array(zod_1.z.array(zod_1.z.number())).optional().describe('Point color adjustments as arrays of RGB values'),
                color_variance: zod_1.z.array(zod_1.z.number()).optional().describe('Color variance adjustments for point colors'),
            });
        }
        // Add Black & White Mix properties
        baseSchema = baseSchema.extend({
            gray_red: zod_1.z.number().min(-100).max(100).optional(),
            gray_orange: zod_1.z.number().min(-100).max(100).optional(),
            gray_yellow: zod_1.z.number().min(-100).max(100).optional(),
            gray_green: zod_1.z.number().min(-100).max(100).optional(),
            gray_aqua: zod_1.z.number().min(-100).max(100).optional(),
            gray_blue: zod_1.z.number().min(-100).max(100).optional(),
            gray_purple: zod_1.z.number().min(-100).max(100).optional(),
            gray_magenta: zod_1.z.number().min(-100).max(100).optional(),
        });
        // Add masks if enabled
        if (aiFunctions.masks) {
            const localAdjustmentsSchema = zod_1.z.object({
                local_exposure: zod_1.z.number().min(-1).max(1).optional(),
                local_contrast: zod_1.z.number().min(-1).max(1).optional(),
                local_highlights: zod_1.z.number().min(-1).max(1).optional(),
                local_shadows: zod_1.z.number().min(-1).max(1).optional(),
                local_whites: zod_1.z.number().min(-1).max(1).optional(),
                local_blacks: zod_1.z.number().min(-1).max(1).optional(),
                local_clarity: zod_1.z.number().min(-1).max(1).optional(),
                local_dehaze: zod_1.z.number().min(-1).max(1).optional(),
                local_texture: zod_1.z.number().min(-1).max(1).optional(),
                local_saturation: zod_1.z.number().min(-1).max(1).optional(),
            });
            const maskSchema = zod_1.z.object({
                name: zod_1.z.string().optional(),
                type: zod_1.z
                    .enum([
                    'radial',
                    'linear',
                    'person',
                    'subject',
                    'background',
                    'sky',
                    'face_skin',
                    'eye_whites',
                    'iris_pupil',
                    'teeth',
                    'body_skin',
                    'eyebrows',
                    'lips',
                    'hair',
                    'facial_hair',
                    'clothing',
                    'mountains',
                    'architecture',
                    'vegetation',
                    'water',
                    'natural_ground',
                    'artificial_ground',
                ])
                    .describe('radial: AVOID - use specific masks instead, linear: gradients, subject/person: only for clear faces, background: everything except subject, sky: sky areas, face_skin: facial skin, eye_whites: eye sclera, iris_pupil: iris and pupil, teeth: teeth, body_skin: body skin, eyebrows: eyebrows, lips: lips, hair: hair, facial_hair: facial hair, clothing: clothing, mountains: mountain ranges, architecture: buildings/structures, vegetation: plants/trees, water: water bodies, natural_ground: natural terrain, artificial_ground: man-made surfaces'),
                adjustments: localAdjustmentsSchema.optional(),
                // Optional sub-category for background masks (use 22 for general background)
                subCategoryId: zod_1.z.number().optional().describe('For background masks, use 22 for general background detection'),
                // Radial geometry
                top: zod_1.z.number().min(0).max(1).optional(),
                left: zod_1.z.number().min(0).max(1).optional(),
                bottom: zod_1.z.number().min(0).max(1).optional(),
                right: zod_1.z.number().min(0).max(1).optional(),
                angle: zod_1.z.number().optional(),
                midpoint: zod_1.z.number().min(0).max(100).optional(),
                roundness: zod_1.z.number().min(-100).max(100).optional(),
                feather: zod_1.z.number().min(0).max(100).optional(),
                inverted: zod_1.z.boolean().optional(),
                flipped: zod_1.z.boolean().optional(),
                // Linear geometry
                zeroX: zod_1.z.number().min(0).max(1).optional(),
                zeroY: zod_1.z.number().min(0).max(1).optional(),
                fullX: zod_1.z.number().min(0).max(1).optional(),
                fullY: zod_1.z.number().min(0).max(1).optional(),
                // Person/subject reference point
                referenceX: zod_1.z.number().min(0).max(1).optional(),
                referenceY: zod_1.z.number().min(0).max(1).optional(),
            });
            baseSchema = baseSchema.extend({
                masks: zod_1.z.array(maskSchema).max(3).optional(),
            });
        }
        // Create tools using AI SDK v5's tool function with Zod schemas
        const tools = {};
        // Main function for generating color adjustments
        tools.generate_color_adjustments = (0, ai_1.tool)({
            description: 'Generate precise Lightroom/Camera Raw adjustments to match target image to base image style',
            inputSchema: baseSchema,
            execute: async (input) => input, // Placeholder - AI will call this
        });
        // Report global adjustments function
        tools.report_global_adjustments = (0, ai_1.tool)({
            description: 'Report only global Lightroom/ACR adjustments (do not include masks here). Call once.',
            inputSchema: baseSchema,
            execute: async (input) => input, // Placeholder - AI will call this
        });
        // Note: Individual mask functions removed - masks are now included in the main generate_color_adjustments function
        return tools;
    }
    parseResultFromText(text) {
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
                            return parsed;
                        }
                    }
                    catch {
                        // Continue to next match
                        continue;
                    }
                }
            }
        }
        catch (error) {
            console.warn('Could not parse result from text:', error);
        }
        return null;
    }
    createDefaultAdjustments() {
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
            saturation: 0,
        };
    }
    getToolDescription(toolName) {
        const descriptions = {
            generate_color_adjustments: 'color characteristics and creating the recipe',
            analyze_color_palette: 'color palette and tonal relationships',
            assess_lighting: 'lighting conditions and exposure',
            evaluate_style: 'overall style and mood',
        };
        return descriptions[toolName] || 'image characteristics';
    }
}
exports.AIStreamingService = AIStreamingService;
