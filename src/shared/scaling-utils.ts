import { SCALING_CONSTANTS, getRange, isValidNumber } from './scaling-constants';

/**
 * Shared scaling utilities for Film Recipe Wizard
 * 
 * These utilities provide consistent scaling behavior across all generators
 * and help reduce code duplication.
 */

export interface ScalingOptions {
  exportType?: 'xmp' | 'camera-profile' | 'mask' | 'lut';
  clamp?: boolean;
  round?: boolean;
  fixedDecimals?: number;
}

/**
 * Scale a value with the given options
 */
export function scaleValue(
  value: any,
  options: ScalingOptions = {}
): number | undefined {
  if (!isValidNumber(value)) {
    return undefined;
  }

  const {
    clamp = true,
    round = true,
    fixedDecimals
  } = options;

  let scaled = value;

  if (clamp) {
    // For now, use tone adjustments range as default
    // In the future, we could make this more specific per adjustment type
    const range = getRange('TONE_ADJUSTMENTS');
    scaled = Math.max(range.min, Math.min(range.max, scaled));
  }

  if (round) {
    scaled = Math.round(scaled);
  }

  if (fixedDecimals !== undefined) {
    return Number(scaled.toFixed(fixedDecimals));
  }

  return scaled;
}

/**
 * Scale a value with specific range clamping
 */
export function scaleValueWithRange(
  value: any,
  rangeType: keyof typeof SCALING_CONSTANTS.RANGES,
  options: ScalingOptions = {}
): number | undefined {
  if (!isValidNumber(value)) {
    return undefined;
  }

  const {
    round = true,
    fixedDecimals
  } = options;

  const range = getRange(rangeType);
  let scaled = value;
  scaled = Math.max(range.min, Math.min(range.max, scaled));

  if (round) {
    scaled = Math.round(scaled);
  }

  if (fixedDecimals !== undefined) {
    return Number(scaled.toFixed(fixedDecimals));
  }

  return scaled;
}

/**
 * Scale multiple values with the same options
 */
export function scaleValues(
  values: Record<string, any>,
  options: ScalingOptions = {}
): Record<string, number | undefined> {
  const result: Record<string, number | undefined> = {};
  
  for (const [key, value] of Object.entries(values)) {
    result[key] = scaleValue(value, options);
  }
  
  return result;
}

/**
 * Scale B&W mixer values specifically
 */
export function scaleBWMixerValues(
  values: {
    gray_red?: number;
    gray_orange?: number;
    gray_yellow?: number;
    gray_green?: number;
    gray_aqua?: number;
    gray_blue?: number;
    gray_purple?: number;
    gray_magenta?: number;
  },
  options: ScalingOptions = {}
) {
  return scaleValues(values, {
    ...options,
    exportType: options.exportType || 'xmp'
  });
}

/**
 * Scale HSL adjustment values specifically
 */
export function scaleHSLValues(
  values: {
    hue_red?: number;
    hue_orange?: number;
    hue_yellow?: number;
    hue_green?: number;
    hue_aqua?: number;
    hue_blue?: number;
    hue_purple?: number;
    hue_magenta?: number;
    sat_red?: number;
    sat_orange?: number;
    sat_yellow?: number;
    sat_green?: number;
    sat_aqua?: number;
    sat_blue?: number;
    sat_purple?: number;
    sat_magenta?: number;
    lum_red?: number;
    lum_orange?: number;
    lum_yellow?: number;
    lum_green?: number;
    lum_aqua?: number;
    lum_blue?: number;
    lum_purple?: number;
    lum_magenta?: number;
  },
  options: ScalingOptions = {}
) {
  const result: Record<string, number | undefined> = {};
  
  // Hue adjustments (not scaled, just clamped)
  const hueKeys = Object.keys(values).filter(key => key.startsWith('hue_'));
  for (const key of hueKeys) {
    result[key] = scaleValueWithRange(values[key as keyof typeof values], 'HUE_ADJUSTMENTS', options);
  }
  
  // Saturation and luminance adjustments (scaled)
  const satKeys = Object.keys(values).filter(key => key.startsWith('sat_'));
  const lumKeys = Object.keys(values).filter(key => key.startsWith('lum_'));
  
  for (const key of [...satKeys, ...lumKeys]) {
    result[key] = scaleValueWithRange(values[key as keyof typeof values], 'SATURATION_ADJUSTMENTS', options);
  }
  
  return result;
}

/**
 * Scale color grading values specifically
 */
export function scaleColorGradingValues(
  values: {
    color_grade_shadow_hue?: number;
    color_grade_shadow_sat?: number;
    color_grade_shadow_lum?: number;
    color_grade_midtone_hue?: number;
    color_grade_midtone_sat?: number;
    color_grade_midtone_lum?: number;
    color_grade_highlight_hue?: number;
    color_grade_highlight_sat?: number;
    color_grade_highlight_lum?: number;
    color_grade_global_hue?: number;
    color_grade_global_sat?: number;
    color_grade_global_lum?: number;
    color_grade_blending?: number;
    color_grade_balance?: number;
  },
  options: ScalingOptions = {}
) {
  const result: Record<string, number | undefined> = {};
  
  // Hue values (not scaled, just clamped)
  const hueKeys = Object.keys(values).filter(key => key.includes('_hue'));
  for (const key of hueKeys) {
    result[key] = scaleValueWithRange(values[key as keyof typeof values], 'COLOR_GRADE_HUE', options);
  }
  
  // Saturation values (scaled)
  const satKeys = Object.keys(values).filter(key => key.includes('_sat'));
  for (const key of satKeys) {
    result[key] = scaleValueWithRange(values[key as keyof typeof values], 'COLOR_GRADE_SAT', options);
  }
  
  // Luminance values (scaled)
  const lumKeys = Object.keys(values).filter(key => key.includes('_lum'));
  for (const key of lumKeys) {
    result[key] = scaleValueWithRange(values[key as keyof typeof values], 'COLOR_GRADE_LUM', options);
  }
  
  // Blending and balance (scaled)
  if (values.color_grade_blending !== undefined) {
    result.color_grade_blending = scaleValueWithRange(values.color_grade_blending, 'COLOR_GRADE_SAT', options);
  }
  if (values.color_grade_balance !== undefined) {
    result.color_grade_balance = scaleValueWithRange(values.color_grade_balance, 'COLOR_GRADE_LUM', options);
  }
  
  return result;
}

/**
 * Scale basic tone adjustment values
 */
export function scaleBasicToneValues(
  values: {
    exposure?: number;
    contrast?: number;
    highlights?: number;
    shadows?: number;
    whites?: number;
    blacks?: number;
    vibrance?: number;
    saturation?: number;
    clarity?: number;
  },
  options: ScalingOptions = {}
) {
  const result: Record<string, number | undefined> = {};
  
  // Exposure has special range
  if (values.exposure !== undefined) {
    result.exposure = scaleValueWithRange(values.exposure, 'EXPOSURE', {
      ...options,
      round: false, // Don't round exposure values
      fixedDecimals: 2
    });
  }
  
  // All other tone adjustments use the same range
  const toneKeys = ['contrast', 'highlights', 'shadows', 'whites', 'blacks', 'vibrance', 'saturation', 'clarity'];
  for (const key of toneKeys) {
    if (values[key as keyof typeof values] !== undefined) {
      result[key] = scaleValueWithRange(values[key as keyof typeof values], 'TONE_ADJUSTMENTS', options);
    }
  }
  
  return result;
}
