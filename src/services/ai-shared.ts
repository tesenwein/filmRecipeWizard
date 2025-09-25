import { z } from 'zod';
import { getAllMaskTypes } from '../shared/mask-types';

export interface AIFunctionToggles {
    masks?: boolean;
    colorGrading?: boolean;
    hsl?: boolean;
    curves?: boolean;
    grain?: boolean;
    vignette?: boolean;
    pointColor?: boolean;
}

export function getDefaultAIFunctionToggles(): AIFunctionToggles {
    return {
        colorGrading: true,
        hsl: true,
        curves: true,
        masks: true,
        grain: true,
        vignette: true,
        pointColor: true,
    };
}

// Base adjustments schema builder (used by streaming service)
export function buildBaseAdjustmentsSchema(aiFunctions: AIFunctionToggles) {
    let baseSchema = z.object({
        preset_name: z.string().min(1).describe('REQUIRED: Short, friendly preset name (2-4 words, Title Case) that will be used as the recipe name. Make it descriptive and appealing. Examples: "Warm Portrait", "Cool Landscape", "Cinematic Shadows", "Vintage Film", "Film Noir", "Sunset Glow", "Urban Grit", "Soft Pastels"'),
        description: z.string().describe('Short, engaging description of the recipe style and mood (1-2 sentences)'),
        treatment: z.enum(['color', 'black_and_white']).describe('Overall treatment for the target image'),
        camera_profile: z.string().optional().describe("Preferred camera profile (e.g., 'Adobe Color', 'Adobe Monochrome')"),
        monochrome: z.boolean().optional().describe('Convert to black and white'),
        confidence: z.number().min(0).max(1).describe('Confidence in the analysis (0.0 to 1.0)'),

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

    if (aiFunctions.vignette) {
        baseSchema = baseSchema.extend({
            vignette_amount: z.number().min(-100).max(100).optional(),
            vignette_midpoint: z.number().min(0).max(100).optional(),
            vignette_feather: z.number().min(0).max(100).optional(),
            vignette_roundness: z.number().min(-100).max(100).optional(),
            vignette_style: z.number().min(0).max(2).optional(),
            vignette_highlight_contrast: z.number().min(0).max(100).optional(),
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

    if (aiFunctions.pointColor) {
        baseSchema = baseSchema.extend({
            point_colors: z.array(z.array(z.number())).optional().describe('Point color adjustments as arrays of RGB values'),
            color_variance: z.array(z.number()).optional().describe('Color variance adjustments for point colors'),
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

    return baseSchema;
}

// Unified mask adjustments schema (used by both chat and streaming)
export const maskAdjustmentsSchema = z.object({
    local_exposure: z.number().min(-0.1).max(0.1).optional(),
    local_contrast: z.number().min(-0.3).max(0.3).optional(),
    local_highlights: z.number().min(-0.3).max(0.3).optional(),
    local_shadows: z.number().min(-0.3).max(0.3).optional(),
    local_whites: z.number().min(-0.3).max(0.3).optional(),
    local_blacks: z.number().min(-0.3).max(0.3).optional(),
    local_clarity: z.number().min(-0.3).max(0.3).optional(),
    local_dehaze: z.number().min(-0.3).max(0.3).optional(),
    local_texture: z.number().min(-0.3).max(0.3).optional(),
    local_saturation: z.number().min(-0.3).max(0.3).optional(),
}).partial();

// Unified mask edit schema (used by both chat and streaming)
export const maskEditSchema = z.object({
    id: z.string().optional(),
    op: z.enum(['add', 'update', 'remove', 'remove_all', 'clear']).optional(),
    name: z.string().optional(),
    type: z.enum([
        'radial', 'linear', 'person', 'subject', 'background', 'sky', 'range_color', 'range_luminance', 'brush', 'face', 'eye', 'skin', 'hair', 'clothing', 'landscape', 'water', 'vegetation', 'mountain', 'building', 'vehicle', 'animal', 'object'
    ]).optional(),
    subCategoryId: z.number().optional(),
    adjustments: maskAdjustmentsSchema.optional(),
    // Geometry / reference fields
    top: z.number().optional(), left: z.number().optional(), bottom: z.number().optional(), right: z.number().optional(),
    angle: z.number().optional(), midpoint: z.number().optional(), roundness: z.number().optional(), feather: z.number().optional(),
    inverted: z.boolean().optional(), flipped: z.boolean().optional(),
    zeroX: z.number().optional(), zeroY: z.number().optional(), fullX: z.number().optional(), fullY: z.number().optional(),
    referenceX: z.number().optional(), referenceY: z.number().optional(),
});

// Legacy aliases for backward compatibility
// export const maskAdjustmentsSchemaChat = maskAdjustmentsSchema;
// export const maskEditSchemaChat = maskEditSchema;

// Streaming-specific mask schema builder (now uses unified schema)
export function createStreamingMaskSchema() {
    return z.object({
        name: z.string().min(1).describe('Descriptive name for the mask (e.g., "Face Skin", "Eye Pop", "Sky Soften")'),
        type: z.enum(getAllMaskTypes() as [string, ...string[]]),
        adjustments: maskAdjustmentsSchema.optional(),
        // Optional sub-category for background masks and other AI masks
        subCategoryId: z.number().optional().describe('For background masks, use 22 for general background detection. For person masks: 1=face, 2=eye, 3=skin, 4=hair, 5=clothing, 6=person'),
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
        // Range mask parameters
        colorAmount: z.number().min(0).max(1).optional(),
        invert: z.boolean().optional(),
        pointModels: z.array(z.array(z.number())).optional(),
        lumRange: z.array(z.number()).optional(),
        luminanceDepthSampleInfo: z.array(z.number()).optional(),
        // Brush mask parameters
        brushSize: z.number().min(0).max(100).optional(),
        brushFlow: z.number().min(0).max(100).optional(),
        brushDensity: z.number().min(0).max(100).optional(),
        // AI mask specific parameters
        confidence: z.number().min(0).max(1).optional(),
        detectionQuality: z.number().min(0).max(1).optional(),
    });
}

