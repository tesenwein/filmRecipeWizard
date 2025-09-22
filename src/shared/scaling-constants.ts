/**
 * Centralized scaling constants for Film Recipe Wizard
 * 
 * These constants define how AI-generated adjustments are scaled when exported
 * to different formats (XMP presets, camera profiles, etc.)
 */

export const SCALING_CONSTANTS = {
  // Default strength scaling for XMP presets
  // 1.0 for full intensity - users can adjust strength as needed
  XMP_PRESET_DEFAULT_STRENGTH: 1.0,
  
  // Default strength scaling for camera profiles
  // 1.0 for full intensity since camera profiles are meant to be more subtle
  CAMERA_PROFILE_DEFAULT_STRENGTH: 1.0,
  
  // Mask adjustment scaling
  // 0.35 for local adjustments to make them less aggressive
  MASK_ADJUSTMENT_STRENGTH: 0.35,
  
  // LUT generation scaling
  // Different scaling for LUT generation to match expected output
  LUT_EXPOSURE_SCALING: 0.25, // Map 4 UI units ≈ 1 stop
  
  // Range limits for different adjustment types
  RANGES: {
    EXPOSURE: { min: -5, max: 5 },
    TONE_ADJUSTMENTS: { min: -100, max: 100 },
    HUE_ADJUSTMENTS: { min: -100, max: 100 },
    SATURATION_ADJUSTMENTS: { min: -100, max: 100 },
    LUMINANCE_ADJUSTMENTS: { min: -100, max: 100 },
    COLOR_GRADE_HUE: { min: 0, max: 360 },
    COLOR_GRADE_SAT: { min: 0, max: 100 },
    COLOR_GRADE_LUM: { min: -100, max: 100 },
    GRAIN: { min: 0, max: 100 },
    VIGNETTE_AMOUNT: { min: -100, max: 100 },
    VIGNETTE_MIDPOINT: { min: 0, max: 100 },
    VIGNETTE_FEATHER: { min: 0, max: 100 },
    VIGNETTE_ROUNDNESS: { min: -100, max: 100 },
    VIGNETTE_STYLE: { min: 0, max: 2 },
    VIGNETTE_HIGHLIGHT_CONTRAST: { min: 0, max: 100 },
  }
} as const;

/**
 * Get the appropriate default strength for a given export type
 */
export function getDefaultStrength(exportType: 'xmp' | 'camera-profile' | 'mask' | 'lut'): number {
  switch (exportType) {
    case 'xmp':
      return SCALING_CONSTANTS.XMP_PRESET_DEFAULT_STRENGTH;
    case 'camera-profile':
      return SCALING_CONSTANTS.CAMERA_PROFILE_DEFAULT_STRENGTH;
    case 'mask':
      return SCALING_CONSTANTS.MASK_ADJUSTMENT_STRENGTH;
    case 'lut':
      return 1.0; // LUT uses different scaling approach
    default:
      return SCALING_CONSTANTS.XMP_PRESET_DEFAULT_STRENGTH;
  }
}

/**
 * Check if a value is a valid number for scaling
 */
export function isValidNumber(value: any): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Get the appropriate range for a given adjustment type
 */
export function getRange(adjustmentType: keyof typeof SCALING_CONSTANTS.RANGES) {
  return SCALING_CONSTANTS.RANGES[adjustmentType];
}
