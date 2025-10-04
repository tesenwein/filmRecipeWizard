import type { AIColorAdjustments } from '../services/types';
import { convertRecipeToMasks } from '../shared/mask-converter';
import { normalizeMaskType } from '../shared/mask-types';

/**
 * Generates Capture One style (.costyle) content based on AI adjustments
 * Capture One styles use the format: <SL Engine="1300"><E K="key" V="value"/></SL>
 */
export function generateCaptureOneStyle(aiAdjustments: AIColorAdjustments, include: any): string {
  const isBW =
    !!aiAdjustments.monochrome ||
    aiAdjustments.treatment === 'black_and_white' ||
    (typeof aiAdjustments.camera_profile === 'string' && /monochrome/i.test(aiAdjustments.camera_profile || '')) ||
    (typeof aiAdjustments.saturation === 'number' && aiAdjustments.saturation <= -100);

  const presetName = aiAdjustments.preset_name || (include?.recipeName as string) || 'Custom Recipe';

  // Helper functions
  const clamp = (v: any, min: number, max: number): number | undefined => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
    return Math.max(min, Math.min(max, v));
  };

  const escapeXml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  // Generate UUID
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16).toUpperCase();
    });
  };

  const styleId = generateUUID();

  // Helper to create E elements
  const E = (key: string, value: string | number) => `\t<E K="${key}" V="${value}" />`;

  // Build elements array
  const elements: string[] = [];

  // Name and UUID are required
  elements.push(E('Name', escapeXml(presetName)));
  elements.push(E('UUID', styleId));

  // Basic adjustments
  const exposure = clamp(aiAdjustments.exposure, -5, 5);
  if (typeof exposure === 'number') {
    elements.push(E('Exposure', exposure.toFixed(6)));
  }

  const contrast = clamp(aiAdjustments.contrast, -100, 100);
  if (typeof contrast === 'number') {
    elements.push(E('Contrast', contrast.toFixed(6)));
  }

  const brightness = clamp(aiAdjustments.brightness, -100, 100);
  if (typeof brightness === 'number') {
    elements.push(E('Brightness', brightness.toFixed(6)));
  }

  const saturation = isBW ? -100 : clamp(aiAdjustments.saturation, -100, 100);
  if (typeof saturation === 'number') {
    elements.push(E('Saturation', saturation.toFixed(6)));
  }

  // Highlights and Shadows (use HighlightRecoveryEx and ShadowRecovery in Capture One)
  const highlights = clamp(aiAdjustments.highlights, -100, 100);
  if (typeof highlights === 'number') {
    elements.push(E('HighlightRecoveryEx', (-highlights).toFixed(6))); // Inverted
  }

  const shadows = clamp(aiAdjustments.shadows, -100, 100);
  if (typeof shadows === 'number') {
    elements.push(E('ShadowRecovery', shadows.toFixed(6)));
  }

  // Whites and Blacks
  const whites = clamp(aiAdjustments.whites, -100, 100);
  if (typeof whites === 'number') {
    elements.push(E('WhiteRecovery', whites.toFixed(6)));
  }

  const blacks = clamp(aiAdjustments.blacks, -100, 100);
  if (typeof blacks === 'number') {
    elements.push(E('BlackRecovery', blacks.toFixed(6)));
  }

  // Color grading - convert hue/sat to RGB multipliers
  if (include?.colorGrading !== false) {
    const hueToRgb = (hue: number | undefined, sat: number | undefined): string => {
      const h = (hue || 0) * Math.PI / 180; // Convert to radians
      const s = (sat || 0) / 100 * 0.3; // Scale adjustment strength (increased from 0.05 to 0.3)

      // Convert hue rotation to RGB shifts
      // Use cosine wave to map hue angle to RGB channel multipliers
      const r = 1 + s * Math.cos(h);
      const g = 1 + s * Math.cos(h - 2.094); // -120 degrees
      const b = 1 + s * Math.cos(h + 2.094); // +120 degrees

      return `${r.toFixed(6)};${g.toFixed(6)};${b.toFixed(6)}`;
    };

    const shadowHue = clamp(aiAdjustments.color_grade_shadow_hue, -180, 180);
    const shadowSat = clamp(aiAdjustments.color_grade_shadow_sat, -100, 100);
    if (typeof shadowHue === 'number' || typeof shadowSat === 'number') {
      elements.push(E('ColorBalanceShadow', hueToRgb(shadowHue, shadowSat)));
    }

    const midtoneHue = clamp(aiAdjustments.color_grade_midtone_hue, -180, 180);
    const midtoneSat = clamp(aiAdjustments.color_grade_midtone_sat, -100, 100);
    if (typeof midtoneHue === 'number' || typeof midtoneSat === 'number') {
      elements.push(E('ColorBalanceMidtone', hueToRgb(midtoneHue, midtoneSat)));
    }

    const highlightHue = clamp(aiAdjustments.color_grade_highlight_hue, -180, 180);
    const highlightSat = clamp(aiAdjustments.color_grade_highlight_sat, -100, 100);
    if (typeof highlightHue === 'number' || typeof highlightSat === 'number') {
      elements.push(E('ColorBalanceHighlight', hueToRgb(highlightHue, highlightSat)));
    }
  }

  // Grain
  if (include?.grain !== false) {
    const grainAmount = clamp((aiAdjustments as any).grain_amount, 0, 100);
    if (typeof grainAmount === 'number') {
      elements.push(E('FilmGrainAmount', grainAmount.toFixed(6)));
    }
  }

  // Tone curves
  if (include?.curves !== false) {
    const curves = (aiAdjustments as any).tone_curve;
    if (curves) {
      // Convert curve points from our format to Capture One format
      // Our format: array of {x, y} objects where x,y are 0-1
      // C1 format: "x1,y1;x2,y2;x3,y3" where values are 0-1
      const convertCurve = (curvePoints: any[]): string => {
        if (!Array.isArray(curvePoints) || curvePoints.length === 0) {
          return '0,0;1,1'; // Default linear curve
        }
        return curvePoints
          .map(pt => `${pt.x.toFixed(6)},${pt.y.toFixed(6)}`)
          .join(';');
      };

      if (curves.rgb && Array.isArray(curves.rgb)) {
        elements.push(E('GradationCurve', convertCurve(curves.rgb)));
      }
      if (curves.red && Array.isArray(curves.red)) {
        elements.push(E('GradationCurveRed', convertCurve(curves.red)));
      }
      if (curves.green && Array.isArray(curves.green)) {
        elements.push(E('GradationCurveGreen', convertCurve(curves.green)));
      }
      if (curves.blue && Array.isArray(curves.blue)) {
        elements.push(E('GradationCurveBlue', convertCurve(curves.blue)));
      }
      if (curves.luminance && Array.isArray(curves.luminance)) {
        elements.push(E('GradationCurveY', convertCurve(curves.luminance)));
      }
    }
  }

  elements.push(E('StyleSource', 'Styles'));

  // Build the XML
  let xml = `<?xml version="1.0"?>\n<SL Engine="1300">\n`;
  xml += elements.join('\n') + '\n';
  xml += `</SL>\n`;

  // Add local adjustments (masks) if any
  if (include?.masks !== false) {
    const masks = convertRecipeToMasks(aiAdjustments);
    if (masks.length > 0) {
      xml += generateMasksXML(masks);
    }
  }

  return xml;
}

/**
 * Generates XML for local adjustments (masks) in Capture One format
 */
function generateMasksXML(masks: any[]): string {
  if (!masks.length) return '';

  const clamp = (v: any, min: number, max: number): number | undefined => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
    return Math.max(min, Math.min(max, v));
  };

  const escapeXml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const E = (key: string, value: string | number, indent: string = '\t\t\t') =>
    `${indent}<E K="${key}" V="${value}" />`;

  let xml = '<LDS>\n';

  masks.forEach((mask, index) => {
    const maskType = normalizeMaskType(mask.type || 'subject');
    const adjustments = mask.adjustments || {};

    xml += '\t<LD>\n\t\t<LA>\n';

    // Add mask adjustments
    const localElements: string[] = [];

    localElements.push(E('Enabled', '1'));
    localElements.push(E('Name', escapeXml(mask.name || `Mask ${index + 1}`)));

    const localExposure = clamp(adjustments.local_exposure, -4, 4);
    if (typeof localExposure === 'number') {
      localElements.push(E('Exposure', localExposure.toFixed(6)));
    }

    const localContrast = clamp(adjustments.local_contrast, -100, 100);
    if (typeof localContrast === 'number') {
      localElements.push(E('Contrast', localContrast.toFixed(6)));
    }

    const localBrightness = clamp(adjustments.local_brightness, -100, 100);
    if (typeof localBrightness === 'number') {
      localElements.push(E('Brightness', localBrightness.toFixed(6)));
    }

    const localSaturation = clamp(adjustments.local_saturation, -100, 100);
    if (typeof localSaturation === 'number') {
      localElements.push(E('Saturation', localSaturation.toFixed(6)));
    }

    const localHighlights = clamp(adjustments.local_highlights, -100, 100);
    if (typeof localHighlights === 'number') {
      localElements.push(E('HighlightRecoveryEx', (-localHighlights).toFixed(6)));
    }

    const localShadows = clamp(adjustments.local_shadows, -100, 100);
    if (typeof localShadows === 'number') {
      localElements.push(E('ShadowRecovery', localShadows.toFixed(6)));
    }

    localElements.push(E('Opacity', '100'));

    xml += localElements.join('\n') + '\n';
    xml += '\t\t</LA>\n';

    // Add mask metadata
    xml += '\t\t<MD>\n';

    // Map mask types to Capture One mask types
    // MaskType: 0 = Brush, 1 = Gradient, 2 = Radial, 3 = Background, 4 = Subject/AI
    let captureOneMaskType = '4'; // Default to AI/Subject mask

    if (maskType === 'linear') {
      captureOneMaskType = '1'; // Gradient
    } else if (maskType === 'radial') {
      captureOneMaskType = '2'; // Radial
    } else if (maskType === 'brush') {
      captureOneMaskType = '0'; // Brush
    } else if (maskType === 'background') {
      captureOneMaskType = '3'; // Background
    }

    xml += E('MaskType', captureOneMaskType, '\t\t\t');

    // Add AI subject mask options if it's a subject mask
    if (parseInt(captureOneMaskType) === 4) {
      xml += '\n\t\t\t<SO>\n';

      // Map common mask types to Capture One subject options
      // Note: Our internal types don't always match C1's naming exactly
      const subjectOptions: Record<string, string[]> = {
        'Body': ['body', 'body_skin'],
        'Clothes': ['clothes', 'clothing'],
        'Eyebrows': ['eyebrows'],
        'Face': ['face', 'face_skin'],
        'Hair': ['hair'],
        'IrisAndPupil': ['iris_pupil'],
        'Lips': ['lips'],
        'Sclera': ['sclera', 'eye_whites']
      };

      Object.entries(subjectOptions).forEach(([coKey, ourTypes]) => {
        const enabled = ourTypes.includes(maskType) ? '1' : '0';
        xml += E(coKey, enabled, '\t\t\t\t') + '\n';
      });

      xml += '\t\t\t</SO>\n\t\t';
    }

    xml += '\n\t\t</MD>\n';
    xml += '\t</LD>\n';
  });

  xml += '</LDS>\n';
  return xml;
}

/**
 * Generates a Capture One style file with basic adjustments only
 */
export function generateCaptureOneBasicStyle(aiAdjustments: AIColorAdjustments, include: any): string {
  const basicInclude = {
    ...include,
    hsl: false,
    colorGrading: false,
    grain: false,
    vignette: false,
    masks: false,
  };

  return generateCaptureOneStyle(aiAdjustments, basicInclude);
}
