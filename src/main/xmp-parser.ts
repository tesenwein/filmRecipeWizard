import type { AIColorAdjustments } from '../services/types';
import { getMaskTypeFromXMP } from '../shared/mask-types';

export interface XMPParseResult {
  success: boolean;
  adjustments?: AIColorAdjustments;
  error?: string;
  presetName?: string;
  description?: string;
  metadata?: {
    presetName?: string;
    presetType?: string;
    version?: string;
    hasMasks?: boolean;
    hasColorGrading?: boolean;
    hasHSL?: boolean;
    hasCurves?: boolean;
  };
}

/**
 * Parses XMP preset content and converts it back to AIColorAdjustments format
 */
export function parseXMPContent(xmpContent: string): XMPParseResult {
  try {
    // Basic validation
    if (!xmpContent || typeof xmpContent !== 'string') {
      return { success: false, error: 'Invalid XMP content' };
    }

    if (!xmpContent.includes('crs:') || !xmpContent.includes('rdf:RDF')) {
      return { success: false, error: 'Not a valid Lightroom XMP preset' };
    }

    const adjustments: AIColorAdjustments = {
      preset_name: 'Imported Preset',
      confidence: 0.8,
      reasoning: 'Imported from XMP preset',
    };

    const metadata: XMPParseResult['metadata'] = {
      hasMasks: false,
      hasColorGrading: false,
      hasHSL: false,
      hasCurves: false,
    };

    // Extract preset name
    const nameMatch = xmpContent.match(/<crs:Name>\s*<rdf:Alt>\s*<rdf:li[^>]*>([^<]*)<\/rdf:li>/);
    const presetName = nameMatch?.[1]?.trim() || 'Imported Preset';
    if (nameMatch) {
      adjustments.preset_name = presetName;
    }

    // Extract description
    const descMatch = xmpContent.match(/<crs:Description>\s*<rdf:Alt>\s*<rdf:li[^>]*>([^<]*)<\/rdf:li>/);
    const description = descMatch?.[1]?.trim() || '';

    // Extract preset type
    const presetTypeMatch = xmpContent.match(/crs:PresetType\s*=\s*"([^"]*)"/);
    if (presetTypeMatch) {
      metadata.presetType = presetTypeMatch[1];
    }

    // Extract version
    const versionMatch = xmpContent.match(/crs:Version\s*=\s*"([^"]*)"/);
    if (versionMatch) {
      metadata.version = versionMatch[1];
    }

    // Parse basic adjustments
    parseBasicAdjustments(xmpContent, adjustments);

    // Parse HSL adjustments
    if (parseHSLAdjustments(xmpContent, adjustments)) {
      metadata.hasHSL = true;
    }

    // Parse color grading
    if (parseColorGrading(xmpContent, adjustments)) {
      metadata.hasColorGrading = true;
    }

    // Parse tone curves
    if (parseToneCurves(xmpContent, adjustments)) {
      metadata.hasCurves = true;
    }

    // Parse Black & White mixer
    parseBWMixer(xmpContent, adjustments);

    // Parse masks
    if (parseMasks(xmpContent, adjustments)) {
      metadata.hasMasks = true;
    }

    // Parse grain
    parseGrain(xmpContent, adjustments);

    // Parse point color
    parsePointColor(xmpContent, adjustments);

    return {
      success: true,
      adjustments,
      presetName,
      description,
      metadata,
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse XMP content',
    };
  }
}

function parseBasicAdjustments(xmpContent: string, adjustments: AIColorAdjustments): void {
  // Temperature and Tint
  const tempMatch = xmpContent.match(/<crs:Temperature>([^<]*)<\/crs:Temperature>/);
  if (tempMatch) {
    const temp = parseFloat(tempMatch[1]);
    if (!isNaN(temp)) {
      adjustments.temperature = temp;
    }
  }

  const tintMatch = xmpContent.match(/<crs:Tint>([^<]*)<\/crs:Tint>/);
  if (tintMatch) {
    const tint = parseFloat(tintMatch[1]);
    if (!isNaN(tint)) {
      adjustments.tint = tint;
    }
  }

  // Basic tone adjustments
  const parseToneValue = (pattern: string, key: keyof AIColorAdjustments): void => {
    const match = xmpContent.match(new RegExp(`<crs:${pattern}>([^<]*)</crs:${pattern}>`));
    if (match) {
      const value = parseFloat(match[1]);
      if (!isNaN(value)) {
        (adjustments as any)[key] = value;
      }
    }
  };

  parseToneValue('Exposure2012', 'exposure');
  parseToneValue('Contrast2012', 'contrast');
  parseToneValue('Highlights2012', 'highlights');
  parseToneValue('Shadows2012', 'shadows');
  parseToneValue('Whites2012', 'whites');
  parseToneValue('Blacks2012', 'blacks');
  parseToneValue('Clarity2012', 'clarity');
  parseToneValue('Vibrance', 'vibrance');
  parseToneValue('Saturation', 'saturation');

  // Treatment
  const treatmentMatch = xmpContent.match(/<crs:Treatment>([^<]*)<\/crs:Treatment>/);
  if (treatmentMatch) {
    const treatment = treatmentMatch[1].trim();
    if (treatment === 'Black & White' || treatment === 'Black &amp; White') {
      adjustments.treatment = 'black_and_white';
      adjustments.monochrome = true;
    } else {
      adjustments.treatment = 'color';
    }
  }

  // Convert to grayscale
  const grayscaleMatch = xmpContent.match(/<crs:ConvertToGrayscale>([^<]*)<\/crs:ConvertToGrayscale>/);
  if (grayscaleMatch && grayscaleMatch[1].toLowerCase() === 'true') {
    adjustments.monochrome = true;
    adjustments.treatment = 'black_and_white';
  }
}

function parseHSLAdjustments(xmpContent: string, adjustments: AIColorAdjustments): boolean {
  let hasHSL = false;

  const parseHSLValue = (pattern: string, key: keyof AIColorAdjustments): void => {
    const match = xmpContent.match(new RegExp(`<crs:${pattern}>([^<]*)</crs:${pattern}>`));
    if (match) {
      const value = parseFloat(match[1]);
      if (!isNaN(value)) {
        (adjustments as any)[key] = value;
        hasHSL = true;
      }
    }
  };

  // Hue adjustments
  parseHSLValue('HueAdjustmentRed', 'hue_red');
  parseHSLValue('HueAdjustmentOrange', 'hue_orange');
  parseHSLValue('HueAdjustmentYellow', 'hue_yellow');
  parseHSLValue('HueAdjustmentGreen', 'hue_green');
  parseHSLValue('HueAdjustmentAqua', 'hue_aqua');
  parseHSLValue('HueAdjustmentBlue', 'hue_blue');
  parseHSLValue('HueAdjustmentPurple', 'hue_purple');
  parseHSLValue('HueAdjustmentMagenta', 'hue_magenta');

  // Saturation adjustments
  parseHSLValue('SaturationAdjustmentRed', 'sat_red');
  parseHSLValue('SaturationAdjustmentOrange', 'sat_orange');
  parseHSLValue('SaturationAdjustmentYellow', 'sat_yellow');
  parseHSLValue('SaturationAdjustmentGreen', 'sat_green');
  parseHSLValue('SaturationAdjustmentAqua', 'sat_aqua');
  parseHSLValue('SaturationAdjustmentBlue', 'sat_blue');
  parseHSLValue('SaturationAdjustmentPurple', 'sat_purple');
  parseHSLValue('SaturationAdjustmentMagenta', 'sat_magenta');

  // Luminance adjustments
  parseHSLValue('LuminanceAdjustmentRed', 'lum_red');
  parseHSLValue('LuminanceAdjustmentOrange', 'lum_orange');
  parseHSLValue('LuminanceAdjustmentYellow', 'lum_yellow');
  parseHSLValue('LuminanceAdjustmentGreen', 'lum_green');
  parseHSLValue('LuminanceAdjustmentAqua', 'lum_aqua');
  parseHSLValue('LuminanceAdjustmentBlue', 'lum_blue');
  parseHSLValue('LuminanceAdjustmentPurple', 'lum_purple');
  parseHSLValue('LuminanceAdjustmentMagenta', 'lum_magenta');

  return hasHSL;
}

function parseColorGrading(xmpContent: string, adjustments: AIColorAdjustments): boolean {
  let hasColorGrading = false;

  const parseColorGradingValue = (pattern: string, key: keyof AIColorAdjustments): void => {
    const match = xmpContent.match(new RegExp(`<crs:${pattern}>([^<]*)</crs:${pattern}>`));
    if (match) {
      const value = parseFloat(match[1]);
      if (!isNaN(value)) {
        (adjustments as any)[key] = value;
        hasColorGrading = true;
      }
    }
  };

  // Shadow color grading
  parseColorGradingValue('ColorGradeShadowHue', 'color_grade_shadow_hue');
  parseColorGradingValue('ColorGradeShadowSat', 'color_grade_shadow_sat');
  parseColorGradingValue('ColorGradeShadowLum', 'color_grade_shadow_lum');

  // Midtone color grading
  parseColorGradingValue('ColorGradeMidtoneHue', 'color_grade_midtone_hue');
  parseColorGradingValue('ColorGradeMidtoneSat', 'color_grade_midtone_sat');
  parseColorGradingValue('ColorGradeMidtoneLum', 'color_grade_midtone_lum');

  // Highlight color grading
  parseColorGradingValue('ColorGradeHighlightHue', 'color_grade_highlight_hue');
  parseColorGradingValue('ColorGradeHighlightSat', 'color_grade_highlight_sat');
  parseColorGradingValue('ColorGradeHighlightLum', 'color_grade_highlight_lum');

  // Global color grading
  parseColorGradingValue('ColorGradeGlobalHue', 'color_grade_global_hue');
  parseColorGradingValue('ColorGradeGlobalSat', 'color_grade_global_sat');
  parseColorGradingValue('ColorGradeGlobalLum', 'color_grade_global_lum');

  // Blending and balance
  parseColorGradingValue('ColorGradeBlending', 'color_grade_blending');
  parseColorGradingValue('ColorGradeBalance', 'color_grade_balance');

  return hasColorGrading;
}

function parseToneCurves(xmpContent: string, adjustments: AIColorAdjustments): boolean {
  let hasCurves = false;

  // Parse parametric curves
  const parseParametricValue = (pattern: string, key: keyof AIColorAdjustments): void => {
    const match = xmpContent.match(new RegExp(`<crs:${pattern}>([^<]*)</crs:${pattern}>`));
    if (match) {
      const value = parseFloat(match[1]);
      if (!isNaN(value)) {
        (adjustments as any)[key] = value;
        hasCurves = true;
      }
    }
  };

  parseParametricValue('ParametricShadows', 'parametric_shadows');
  parseParametricValue('ParametricDarks', 'parametric_darks');
  parseParametricValue('ParametricLights', 'parametric_lights');
  parseParametricValue('ParametricHighlights', 'parametric_highlights');
  parseParametricValue('ParametricShadowSplit', 'parametric_shadow_split');
  parseParametricValue('ParametricMidtoneSplit', 'parametric_midtone_split');
  parseParametricValue('ParametricHighlightSplit', 'parametric_highlight_split');

  // Parse point curves
  const parsePointCurve = (curveName: string, key: keyof AIColorAdjustments): void => {
    const curveMatch = xmpContent.match(new RegExp(`<crs:${curveName}>\\s*<rdf:Seq>\\s*([\\s\\S]*?)\\s*</rdf:Seq>\\s*</crs:${curveName}>`));
    if (curveMatch) {
      const curveContent = curveMatch[1];
      const pointMatches = curveContent.match(/<rdf:li>([^<]*)<\/rdf:li>/g);
      if (pointMatches) {
        const points = pointMatches.map(match => {
          const coords = match.replace(/<\/?rdf:li>/g, '').split(',').map(s => parseFloat(s.trim()));
          return { input: coords[0], output: coords[1] };
        }).filter(p => !isNaN(p.input) && !isNaN(p.output));

        if (points.length > 0) {
          (adjustments as any)[key] = points;
          hasCurves = true;
        }
      }
    }
  };

  parsePointCurve('ToneCurvePV2012', 'tone_curve');
  parsePointCurve('ToneCurvePV2012Red', 'tone_curve_red');
  parsePointCurve('ToneCurvePV2012Green', 'tone_curve_green');
  parsePointCurve('ToneCurvePV2012Blue', 'tone_curve_blue');

  return hasCurves;
}

function parseBWMixer(xmpContent: string, adjustments: AIColorAdjustments): void {
  const parseBWMixerValue = (pattern: string, key: keyof AIColorAdjustments): void => {
    const match = xmpContent.match(new RegExp(`<crs:${pattern}>([^<]*)</crs:${pattern}>`));
    if (match) {
      const value = parseFloat(match[1]);
      if (!isNaN(value)) {
        (adjustments as any)[key] = value;
      }
    }
  };

  parseBWMixerValue('GrayMixerRed', 'gray_red');
  parseBWMixerValue('GrayMixerOrange', 'gray_orange');
  parseBWMixerValue('GrayMixerYellow', 'gray_yellow');
  parseBWMixerValue('GrayMixerGreen', 'gray_green');
  parseBWMixerValue('GrayMixerAqua', 'gray_aqua');
  parseBWMixerValue('GrayMixerBlue', 'gray_blue');
  parseBWMixerValue('GrayMixerPurple', 'gray_purple');
  parseBWMixerValue('GrayMixerMagenta', 'gray_magenta');
}

function parseMasks(xmpContent: string, adjustments: AIColorAdjustments): boolean {
  const maskGroupMatch = xmpContent.match(/<crs:MaskGroupBasedCorrections>\s*<rdf:Seq>\s*([\s\S]*?)\s*<\/rdf:Seq>\s*<\/crs:MaskGroupBasedCorrections>/);
  if (!maskGroupMatch) {
    return false;
  }

  const maskContent = maskGroupMatch[1];
  const maskMatches = maskContent.match(/<rdf:li>\s*<rdf:Description[\s\S]*?<\/rdf:Description>\s*<\/rdf:li>/g);

  if (!maskMatches) {
    return false;
  }

  const masks: any[] = [];

  maskMatches.forEach((maskMatch, index) => {
    const mask: any = {
      name: `Mask ${index + 1}`,
      type: 'subject', // Default type
      adjustments: {},
    };

    // Extract mask name
    const nameMatch = maskMatch.match(/crs:CorrectionName="([^"]*)"/);
    if (nameMatch) {
      mask.name = nameMatch[1];
    }

    // Extract mask type from the mask definition
    const maskTypeMatch = maskMatch.match(/crs:What="Mask\/([^"]*)"/);
    if (maskTypeMatch) {
      const maskType = maskTypeMatch[1];
      if (maskType === 'Image') {
        // Check for AI mask subtypes and subcategories
        const subTypeMatch = maskMatch.match(/crs:MaskSubType="([^"]*)"/);
        const subCategoryMatch = maskMatch.match(/crs:MaskSubCategoryID="([^"]*)"/);

        if (subTypeMatch) {
          const subType = subTypeMatch[1];
          const subCategory = subCategoryMatch ? subCategoryMatch[1] : null;

          // Map MaskSubType and MaskSubCategoryID to our mask types
          mask.type = mapMaskSubTypeToType(subType, subCategory);
          if (subCategory) {
            mask.subCategoryId = parseInt(subCategory);
          }
        } else {
          mask.type = 'subject';
        }
      } else if (maskType === 'CircularGradient') {
        mask.type = 'radial';
      } else if (maskType === 'Gradient') {
        mask.type = 'linear';
      } else if (maskType === 'Brush') {
        mask.type = 'brush';
      } else if (maskType === 'RangeMask') {
        // Determine if it's color or luminance range mask
        const rangeTypeMatch = maskMatch.match(/crs:Type="([^"]*)"/);
        if (rangeTypeMatch) {
          const rangeType = rangeTypeMatch[1];
          mask.type = rangeType === '1' ? 'range_color' : 'range_luminance';
        }
      }
    }

    // Extract local adjustments
    const parseLocalAdjustment = (pattern: string, key: string): void => {
      const match = maskMatch.match(new RegExp(`crs:${pattern}="([^"]*)"`));
      if (match) {
        const value = parseFloat(match[1]);
        if (!isNaN(value)) {
          mask.adjustments[key] = value;
        }
      }
    };

    parseLocalAdjustment('LocalExposure2012', 'local_exposure');
    parseLocalAdjustment('LocalContrast2012', 'local_contrast');
    parseLocalAdjustment('LocalHighlights2012', 'local_highlights');
    parseLocalAdjustment('LocalShadows2012', 'local_shadows');
    parseLocalAdjustment('LocalWhites2012', 'local_whites');
    parseLocalAdjustment('LocalBlacks2012', 'local_blacks');
    parseLocalAdjustment('LocalClarity2012', 'local_clarity');
    parseLocalAdjustment('LocalDehaze', 'local_dehaze');
    parseLocalAdjustment('LocalTexture', 'local_texture');
    parseLocalAdjustment('LocalTemperature', 'local_temperature');
    parseLocalAdjustment('LocalTint', 'local_tint');
    parseLocalAdjustment('LocalSaturation', 'local_saturation');

    // Extract geometry for radial masks
    if (mask.type === 'radial') {
      const parseGeometry = (pattern: string, key: string): void => {
        const match = maskMatch.match(new RegExp(`crs:${pattern}="([^"]*)"`));
        if (match) {
          const value = parseFloat(match[1]);
          if (!isNaN(value)) {
            mask[key] = value;
          }
        }
      };

      parseGeometry('Top', 'top');
      parseGeometry('Left', 'left');
      parseGeometry('Bottom', 'bottom');
      parseGeometry('Right', 'right');
      parseGeometry('Angle', 'angle');
      parseGeometry('Midpoint', 'midpoint');
      parseGeometry('Roundness', 'roundness');
      parseGeometry('Feather', 'feather');
    }

    // Extract geometry for linear masks
    if (mask.type === 'linear') {
      const parseGeometry = (pattern: string, key: string): void => {
        const match = maskMatch.match(new RegExp(`crs:${pattern}="([^"]*)"`));
        if (match) {
          const value = parseFloat(match[1]);
          if (!isNaN(value)) {
            mask[key] = value;
          }
        }
      };

      parseGeometry('ZeroX', 'zeroX');
      parseGeometry('ZeroY', 'zeroY');
      parseGeometry('FullX', 'fullX');
      parseGeometry('FullY', 'fullY');
    }

    // Extract brush parameters
    if (mask.type === 'brush') {
      const parseBrushParam = (pattern: string, key: string): void => {
        const match = maskMatch.match(new RegExp(`crs:${pattern}="([^"]*)"`));
        if (match) {
          const value = parseFloat(match[1]);
          if (!isNaN(value)) {
            mask[key] = value;
          }
        }
      };

      parseBrushParam('SizeX', 'brushSize');
      parseBrushParam('Flow', 'brushFlow');
      parseBrushParam('Density', 'brushDensity');
    }

    // Extract reference point for AI masks
    if (['subject', 'background', 'sky', 'face', 'eye', 'skin', 'hair', 'clothing', 'landscape', 'water', 'vegetation', 'mountain', 'building', 'vehicle', 'animal', 'object'].includes(mask.type)) {
      const refMatch = maskMatch.match(/crs:ReferencePoint="([^"]*)"/);
      if (refMatch) {
        const coords = refMatch[1].split(' ').map(s => parseFloat(s.trim()));
        if (coords.length >= 2) {
          mask.referenceX = coords[0];
          mask.referenceY = coords[1];
        }
      }
    }

    // Extract range mask parameters
    if (mask.type === 'range_color' || mask.type === 'range_luminance') {
      const parseRangeParam = (pattern: string, key: string): void => {
        const match = maskMatch.match(new RegExp(`crs:${pattern}="([^"]*)"`));
        if (match) {
          if (key === 'invert') {
            mask[key] = match[1].toLowerCase() === 'true';
          } else if (key === 'pointModels' || key === 'lumRange' || key === 'luminanceDepthSampleInfo') {
            // Parse array values
            const values = match[1].split(' ').map(s => parseFloat(s.trim())).filter(v => !isNaN(v));
            mask[key] = values;
          } else {
            const value = parseFloat(match[1]);
            if (!isNaN(value)) {
              mask[key] = value;
            }
          }
        }
      };

      parseRangeParam('ColorAmount', 'colorAmount');
      parseRangeParam('Invert', 'invert');
      parseRangeParam('LumRange', 'lumRange');
      parseRangeParam('LuminanceDepthSampleInfo', 'luminanceDepthSampleInfo');
    }

    // Extract inverted flag
    const invertedMatch = maskMatch.match(/crs:MaskInverted="([^"]*)"/);
    if (invertedMatch && invertedMatch[1].toLowerCase() === 'true') {
      mask.inverted = true;
    }

    // Extract flipped flag
    const flippedMatch = maskMatch.match(/crs:Flipped="([^"]*)"/);
    if (flippedMatch && flippedMatch[1].toLowerCase() === 'true') {
      mask.flipped = true;
    }

    masks.push(mask);
  });

  if (masks.length > 0) {
    (adjustments as any).masks = masks;
    return true;
  }

  return false;
}

// Map Lightroom MaskSubType and MaskSubCategoryID to our mask types
function mapMaskSubTypeToType(subType: string, subCategory: string | null): string {
  return getMaskTypeFromXMP(subType, subCategory);
}

function parseGrain(xmpContent: string, adjustments: AIColorAdjustments): void {
  const parseGrainValue = (pattern: string, key: keyof AIColorAdjustments): void => {
    const match = xmpContent.match(new RegExp(`<crs:${pattern}>([^<]*)</crs:${pattern}>`));
    if (match) {
      const value = parseFloat(match[1]);
      if (!isNaN(value)) {
        (adjustments as any)[key] = value;
      }
    }
  };

  parseGrainValue('GrainAmount', 'grain_amount');
  parseGrainValue('GrainSize', 'grain_size');
  parseGrainValue('GrainFrequency', 'grain_frequency');
}

function parsePointColor(xmpContent: string, adjustments: AIColorAdjustments): void {
  const pointColorMatches = xmpContent.match(/<crs:PointColor\d+>([^<]*)<\/crs:PointColor\d+>/g);
  if (pointColorMatches && pointColorMatches.length > 0) {
    const pointColors = pointColorMatches.map(match => {
      const valueMatch = match.match(/<crs:PointColor\d+>([^<]*)<\/crs:PointColor\d+>/);
      if (valueMatch) {
        return valueMatch[1].split(',').map(s => parseFloat(s.trim())).filter(v => !isNaN(v));
      }
      return [];
    }).filter(arr => arr.length > 0);

    if (pointColors.length > 0) {
      (adjustments as any).point_colors = pointColors;
    }
  }
}
