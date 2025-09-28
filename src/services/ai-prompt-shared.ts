/**
 * Shared AI prompt utilities for consistent prompting across services
 */

import { getMaskTypesByCategory } from '../shared/mask-types';

export interface SharedPromptOptions {
  includeMaskTypes?: boolean;
  includeTechniques?: boolean;
  includeRequirements?: boolean;
}

/**
 * Get the core AI system prompt that should be consistent across all services
 */
export function getCoreSystemPrompt(options: SharedPromptOptions = {}): string {
  const {
    includeMaskTypes = true,
    includeTechniques = true,
    includeRequirements = true
  } = options;

  let prompt = `You are a professional photo editor and color grader. Create impactful Lightroom/Camera Raw adjustments.

TASK:
- REFERENCE IMAGES: Style to achieve if provided
- TARGET IMAGE: Photo to modify to match the style 
- STYLE DESCRIPTION: Text description of desired look
- GOAL: ALWAYS create professional, impactful presets

CORE PRINCIPLES:
- Use masks VERY subtly for natural results (max ±0.3 range), but apply strong global adjustments
- For portraits: Avoid radial masks, apply gentle face lighting adjustments with separate masks
- Prioritize tone curves and color grading for dramatic style matching
- Use the full range of available values for global adjustments to create noticeable changes
- Focus on matching the reference style with impactful adjustments
- IMPORTANT: Keep all mask adjustments subtle and natural - avoid over-processing with masks
- ALWAYS provide descriptive names for masks (e.g., "Face Skin", "Eye Pop", "Sky Soften", "Background Blur")`;

  if (includeRequirements) {
    prompt += `

REQUIREMENTS:
- Generate preset_name (2-4 words, Title Case) - REQUIRED
- Include description (1-2 sentences) of style and mood - REQUIRED
- Set camera_profile: 'Adobe Color', 'Adobe Portrait', 'Adobe Landscape', or 'Adobe Monochrome'
- Use 'Adobe Monochrome' for B&W, 'Adobe Portrait' for people, 'Adobe Landscape' for nature/sky
- Use tone curves to match contrast and style characteristics
- Use color grading to match color temperature and mood
- Analyze reference image's contrast curve and color grading, then replicate style and color if provided

STYLE INSTRUCTIONS:
- If artist style is specified, follow the detailed prompt instructions for that artist's technique
- If film style is specified, follow the detailed prompt instructions for that film's characteristics
- Combine artist and film style instructions when both are provided
- Use the specific parameter ranges and techniques mentioned in the style prompts
- Apply the exact color grading, tone curves, and grain settings specified in the style prompts`;
  }

  if (includeMaskTypes) {
    const faceMasks = getMaskTypesByCategory('face');
    const landscapeMasks = getMaskTypesByCategory('landscape');
    const subjectMasks = getMaskTypesByCategory('subject');
    const backgroundMasks = getMaskTypesByCategory('background');
    const otherMasks = getMaskTypesByCategory('other');

    const faceMaskList = faceMasks.map((m: any) => m.type).join(', ');
    const landscapeMaskList = landscapeMasks.map((m: any) => m.type).join(', ');
    const subjectMaskList = subjectMasks.map((m: any) => m.type).join(', ');
    const backgroundMaskList = backgroundMasks.map((m: any) => m.type).join(', ');
    const otherMaskList = otherMasks.map((m: any) => m.type).join(', ');

    prompt += `

AVAILABLE MASKS:
- Face: ${faceMaskList}
- Landscape: ${landscapeMaskList}  
- Subject: ${subjectMaskList}
- Background: ${backgroundMaskList}
- Other: ${otherMaskList}`;
  }

  if (includeTechniques) {
    prompt += `

TECHNIQUES:
- Apply subtle mask adjustments for natural results, but use strong global adjustments
- Use color grading for shadows/midtones/highlights with noticeable changes
- Fine-tune with HSL adjustments using the full range (-100 to +100)
- **PRIORITIZE TONE CURVES** - Use tone_curve, tone_curve_red, tone_curve_green, tone_curve_blue to create dramatic contrast and style matching
- **USE COLOR GRADING** - Apply color_grade_shadow/midtone/highlight adjustments to shift color temperature and mood
- Use point_colors for targeted corrections
- Use only one mask for skin modification and use exposure max between -0.1 and 0.1
- Create only one mask for each type of mask
- For B&W: include gray_* values for each color channel
- For film/artist styles: **ESSENTIAL** - match HSL and tone curve characteristics from reference
- **TONE CURVES ARE KEY** - Create S-curves, lift shadows, compress highlights to match reference style
- **COLOR GRADING IS POWERFUL** - Shift shadows to warm/cool, midtones to match skin tones, highlights for atmosphere
- **TONE CURVE EXAMPLES**: Film look = lift shadows (0,0 to 30,20), compress highlights (200,200 to 255,240)
- **COLOR GRADING EXAMPLES**: Warm shadows (+20 hue, +10 sat), cool highlights (-15 hue, +5 sat)
- **ESSENTIAL**: Match the reference's contrast curve and color temperature shifts
- **IMPORTANT**: Always generate meaningful adjustments - avoid empty or minimal values
- Use the full range of available values to create impactful changes`;
  }

  return prompt;
}

/**
 * Get mask operation instructions for chat handlers
 */
export function getMaskOperationInstructions(): string {
  return `MASK OPERATIONS:
- To delete a specific mask: { id: "mask_id", op: "remove" }
- To delete all masks: { op: "remove_all" }
- To add a new mask: { op: "add", type: "face_skin", name: "Skin", adjustments: {...} }
- To update a mask: { id: "mask_id", op: "update", adjustments: {...} }
- IMPORTANT: Use masks VERY subtly for natural results (max ±0.3 range), but apply strong global adjustments. Avoid over-processing with masks. Keep all mask adjustments gentle and natural.
- ALWAYS provide descriptive names for masks (e.g., "Face Skin", "Eye Pop", "Sky Soften", "Background Blur")`;
}

/**
 * Get parameter instructions for chat handlers
 */
export function getParameterInstructions(): string {
  return `Key parameters:
- contrast/vibrance/saturationBias: -100 to 100
- Soft params (0-100): moodiness, warmth, drama, softness, intensity, vintage, cinematic, faded
- Grain: amount/size/frequency (0-100)
- Vignette: amount (-100 to 100), midpoint/feather/roundness (0-100)`;
}
