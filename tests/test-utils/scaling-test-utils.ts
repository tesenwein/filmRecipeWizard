import { CurveData, extractCurveData, generateAllToneCurvesXML } from '../../src/shared/curve-utils';
import { scaleBasicToneValues, scaleBWMixerValues, scaleColorGradingValues, scaleHSLValues, scaleValue, ScalingOptions } from '../../src/shared/scaling-utils';

/**
 * Test utilities for scaling expectations
 * 
 * These utilities help tests automatically calculate expected scaled values
 * instead of manually computing them, making tests more maintainable.
 */

/**
 * Get expected scaled value for a test
 */
export function getExpectedScaledValue(
  originalValue: number,
  options: ScalingOptions = {}
): number {
  const scaled = scaleValue(originalValue, options);
  return scaled !== undefined ? scaled : 0;
}

/**
 * Get expected scaled B&W mixer values for tests
 */
export function getExpectedBWMixerValues(
  originalValues: {
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
  const scaled = scaleBWMixerValues(originalValues, options);
  return {
    gray_red: scaled.gray_red || 0,
    gray_orange: scaled.gray_orange || 0,
    gray_yellow: scaled.gray_yellow || 0,
    gray_green: scaled.gray_green || 0,
    gray_aqua: scaled.gray_aqua || 0,
    gray_blue: scaled.gray_blue || 0,
    gray_purple: scaled.gray_purple || 0,
    gray_magenta: scaled.gray_magenta || 0,
  };
}

/**
 * Get expected scaled HSL values for tests
 */
export function getExpectedHSLValues(
  originalValues: {
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
  const scaled = scaleHSLValues(originalValues, options);
  return {
    // Hue values (not scaled, just clamped)
    hue_red: scaled.hue_red || 0,
    hue_orange: scaled.hue_orange || 0,
    hue_yellow: scaled.hue_yellow || 0,
    hue_green: scaled.hue_green || 0,
    hue_aqua: scaled.hue_aqua || 0,
    hue_blue: scaled.hue_blue || 0,
    hue_purple: scaled.hue_purple || 0,
    hue_magenta: scaled.hue_magenta || 0,
    // Saturation and luminance values (scaled)
    sat_red: scaled.sat_red || 0,
    sat_orange: scaled.sat_orange || 0,
    sat_yellow: scaled.sat_yellow || 0,
    sat_green: scaled.sat_green || 0,
    sat_aqua: scaled.sat_aqua || 0,
    sat_blue: scaled.sat_blue || 0,
    sat_purple: scaled.sat_purple || 0,
    sat_magenta: scaled.sat_magenta || 0,
    lum_red: scaled.lum_red || 0,
    lum_orange: scaled.lum_orange || 0,
    lum_yellow: scaled.lum_yellow || 0,
    lum_green: scaled.lum_green || 0,
    lum_aqua: scaled.lum_aqua || 0,
    lum_blue: scaled.lum_blue || 0,
    lum_purple: scaled.lum_purple || 0,
    lum_magenta: scaled.lum_magenta || 0,
  };
}

/**
 * Get expected scaled color grading values for tests
 */
export function getExpectedColorGradingValues(
  originalValues: {
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
  const scaled = scaleColorGradingValues(originalValues, options);
  return {
    color_grade_shadow_hue: scaled.color_grade_shadow_hue || 0,
    color_grade_shadow_sat: scaled.color_grade_shadow_sat || 0,
    color_grade_shadow_lum: scaled.color_grade_shadow_lum || 0,
    color_grade_midtone_hue: scaled.color_grade_midtone_hue || 0,
    color_grade_midtone_sat: scaled.color_grade_midtone_sat || 0,
    color_grade_midtone_lum: scaled.color_grade_midtone_lum || 0,
    color_grade_highlight_hue: scaled.color_grade_highlight_hue || 0,
    color_grade_highlight_sat: scaled.color_grade_highlight_sat || 0,
    color_grade_highlight_lum: scaled.color_grade_highlight_lum || 0,
    color_grade_global_hue: scaled.color_grade_global_hue || 0,
    color_grade_global_sat: scaled.color_grade_global_sat || 0,
    color_grade_global_lum: scaled.color_grade_global_lum || 0,
    color_grade_blending: scaled.color_grade_blending || 0,
    color_grade_balance: scaled.color_grade_balance || 0,
  };
}

/**
 * Get expected scaled basic tone values for tests
 */
export function getExpectedBasicToneValues(
  originalValues: {
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
  const scaled = scaleBasicToneValues(originalValues, options);
  return {
    exposure: scaled.exposure || 0,
    contrast: scaled.contrast || 0,
    highlights: scaled.highlights || 0,
    shadows: scaled.shadows || 0,
    whites: scaled.whites || 0,
    blacks: scaled.blacks || 0,
    vibrance: scaled.vibrance || 0,
    saturation: scaled.saturation || 0,
    clarity: scaled.clarity || 0,
  };
}

/**
 * Get expected curve XML for tests
 */
export function getExpectedCurveXML(
  originalCurveData: CurveData
): string {
  const processedCurveData = extractCurveData(originalCurveData);
  return generateAllToneCurvesXML(processedCurveData);
}

/**
 * Helper to create scaling options for different export types
 */
export const ScalingOptionsForTests = {
  xmp: { exportType: 'xmp' as const },
  cameraProfile: { exportType: 'camera-profile' as const },
  mask: { exportType: 'mask' as const },
  lut: { exportType: 'lut' as const },
  custom: (strength: number) => ({ strength }),
} as const;
