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

  const captureOneInclude = (include?.captureOne ?? {}) as Record<string, unknown>;
  const resolveOverride = (key: string): string | undefined => {
    const direct = include?.[key];
    if (typeof direct === 'string' && direct.trim()) return direct.trim();
    const nested = captureOneInclude[key];
    if (typeof nested === 'string' && nested.trim()) return nested.trim();
    return undefined;
  };

  const iccProfileName = resolveOverride('iccProfile') || resolveOverride('icc_profile');
  const filmCurveName = resolveOverride('filmCurve') || resolveOverride('film_curve') || resolveOverride('baseCurve');

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

  // Helper to format numbers for Capture One (remove trailing zeros, use shorter decimals)
  const formatNumber = (n: number): string => {
    // If it's an integer or very close to one, return as integer
    if (Math.abs(n - Math.round(n)) < 0.0001) {
      return Math.round(n).toString();
    }
    // Otherwise use a fixed precision that matches Capture One exports
    return n.toFixed(6);
  };

  // Helper to create E elements
  const E = (key: string, value: string | number) => {
    const formattedValue = typeof value === 'number' ? formatNumber(value) : value;
    return `\t<E K="${key}" V="${formattedValue}" />`;
  };

  // Build elements array
  const elements: string[] = [];

  // Name and UUID are required
  elements.push(E('Name', escapeXml(presetName)));
  elements.push(E('UUID', styleId));

  // Basic adjustments
  // Exposure is required - default to 0 if not provided
  const exposure = clamp(aiAdjustments.exposure, -5, 5);
  elements.push(E('Exposure', typeof exposure === 'number' ? exposure : 0));

  const contrast = clamp(aiAdjustments.contrast, -100, 100);
  if (typeof contrast === 'number') {
    elements.push(E('Contrast', contrast));
  }

  const brightness = clamp(aiAdjustments.brightness, -100, 100);
  if (typeof brightness === 'number') {
    elements.push(E('Brightness', brightness));
  }

  const saturation = isBW ? -100 : clamp(aiAdjustments.saturation, -100, 100);
  if (typeof saturation === 'number') {
    elements.push(E('Saturation', saturation));
  }

  // B&W mode settings (required when using B&W)
  if (isBW) {
    elements.push(E('BwEnabled', '1'));
    // Add B&W color mixer defaults (can be customized later)
    elements.push(E('BwRed', '0'));
    elements.push(E('BwGreen', '0'));
    elements.push(E('BwBlue', '0'));
    elements.push(E('BwYellow', '0'));
    elements.push(E('BwCyan', '0'));
    elements.push(E('BwMagenta', '0'));
  }

  if (filmCurveName) {
    elements.push(E('FilmCurve', filmCurveName));
  }
  if (iccProfileName) {
    elements.push(E('ICCProfile', iccProfileName));
  }

  // Highlights and Shadows (use HighlightRecoveryEx and ShadowRecovery in Capture One)
  const highlights = clamp(aiAdjustments.highlights, -100, 100);
  if (typeof highlights === 'number') {
    elements.push(E('HighlightRecoveryEx', -highlights)); // Inverted
  }

  const shadows = clamp(aiAdjustments.shadows, -100, 100);
  if (typeof shadows === 'number') {
    elements.push(E('ShadowRecovery', shadows));
  }

  // Whites and Blacks
  const whites = clamp(aiAdjustments.whites, -100, 100);
  if (typeof whites === 'number') {
    elements.push(E('WhiteRecovery', whites));
  }

  const blacks = clamp(aiAdjustments.blacks, -100, 100);
  if (typeof blacks === 'number') {
    elements.push(E('BlackRecovery', blacks));
  }

  // Base color balance (required field)
  elements.push(E('ColorBalance', '1;1;1'));

  // Color grading - convert hue/sat to RGB multipliers
  const includeColorGrading = include?.colorGrading !== false;
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
  const midtoneHue = clamp(aiAdjustments.color_grade_midtone_hue, -180, 180);
  const midtoneSat = clamp(aiAdjustments.color_grade_midtone_sat, -100, 100);
  const highlightHue = clamp(aiAdjustments.color_grade_highlight_hue, -180, 180);
  const highlightSat = clamp(aiAdjustments.color_grade_highlight_sat, -100, 100);

  if (includeColorGrading) {
    const pushColorBalance = (key: string, hue?: number, sat?: number) => {
      if (typeof hue !== 'number' && typeof sat !== 'number') return;
      elements.push(E(key, hueToRgb(hue, sat)));
    };

    pushColorBalance('ColorBalanceShadow', shadowHue, shadowSat);
    pushColorBalance('ColorBalanceMidtone', midtoneHue, midtoneSat);
    pushColorBalance('ColorBalanceHighlight', highlightHue, highlightSat);
  }

  // Grain
  if (include?.grain !== false) {
    const grainAmount = clamp((aiAdjustments as any).grain_amount, 0, 100);
    if (typeof grainAmount === 'number') {
      elements.push(E('FilmGrainAmount', grainAmount));
    }

    const grainSize = clamp((aiAdjustments as any).grain_size, 0, 100);
    if (typeof grainSize === 'number') {
      elements.push(E('FilmGrainGranularity', grainSize));
    }

    const grainFrequency = clamp((aiAdjustments as any).grain_frequency, 0, 100);
    if (typeof grainFrequency === 'number') {
      elements.push(E('FilmGrainDensity', grainFrequency));
    }

    // FilmGrainType: 0 = Soft, 1 = Medium, 2 = Hard (default to 1 if grain is present)
    if (typeof grainAmount === 'number' && grainAmount > 0) {
      elements.push(E('FilmGrainType', 1));
    }
  }

  // Vignette
  if (include?.vignette !== false) {
    const vignetteAmount = clamp((aiAdjustments as any).vignette_amount, -100, 100);
    const vignetteMidpoint = clamp((aiAdjustments as any).vignette_midpoint, 0, 100);
    const vignetteFeather = clamp((aiAdjustments as any).vignette_feather, 0, 100);
    const vignetteRoundness = clamp((aiAdjustments as any).vignette_roundness, -100, 100);

    if (typeof vignetteAmount === 'number') {
      // C1 format: "amount|midpoint|feather|roundness" (pipe-separated)
      const midpoint = typeof vignetteMidpoint === 'number' ? vignetteMidpoint / 100 : 0.5;
      const feather = typeof vignetteFeather === 'number' ? vignetteFeather / 100 : 0.5;
      const roundness = typeof vignetteRoundness === 'number' ? vignetteRoundness / 100 : 0;
      const amount = vignetteAmount / 100; // Normalize to -1..1 range

      elements.push(E('Vignetting', `${formatNumber(amount)}|${formatNumber(midpoint)}|${formatNumber(feather)}|${formatNumber(roundness)}`));
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
          .map(pt => `${formatNumber(pt.x)},${formatNumber(pt.y)}`)
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

  // Add color correction fields (Highlight, Midtone, Shadow)
  // Format: "intensity;red;green;blue" where intensity is overall strength and RGB are color shifts
  // These use the same color grading data but in a different format
  const hueToColorShift = (hue: number | undefined, sat: number | undefined): string => {
    const h = (hue || 0) * Math.PI / 180;
    const s = (sat || 0) / 100;

    const intensity = Math.abs(s);

    // RGB shifts based on hue angle (simplified color wheel mapping)
    const r = s * Math.cos(h) * 0.1;
    const g = s * Math.cos(h - 2.094) * 0.1; // -120 degrees
    const b = s * Math.cos(h + 2.094) * 0.1; // +120 degrees

    return `${formatNumber(intensity)};${formatNumber(r)};${formatNumber(g)};${formatNumber(b)}`;
  };

  if (includeColorGrading) {
    const pushColorShift = (key: string, hue?: number, sat?: number) => {
      if (typeof hue !== 'number' && typeof sat !== 'number') return;
      elements.push(E(key, hueToColorShift(hue, sat)));
    };

    pushColorShift('Highlight', highlightHue, highlightSat);
    pushColorShift('Midtone', midtoneHue, midtoneSat);
    pushColorShift('Shadow', shadowHue, shadowSat);
  }

  // Add required retouching fields (even if zero, these appear to be mandatory)
  elements.push(E('RetouchingBlemishRemovalAmount', '0'));
  elements.push(E('RetouchingDarkCirclesReductionAmount', '0'));
  elements.push(E('RetouchingFaceSculptingContouring', '0'));
  elements.push(E('RetouchingOpacity', '100'));
  elements.push(E('RetouchingSkinEveningAmount', '0'));
  elements.push(E('RetouchingSkinEveningTexture', '0'));

  // Sort elements alphabetically by key (required by Capture One)
  elements.sort((a, b) => {
    const keyA = a.match(/K="([^"]+)"/)?.[1] || '';
    const keyB = b.match(/K="([^"]+)"/)?.[1] || '';
    return keyA.localeCompare(keyB);
  });

  // Build the XML
  let xml = `<?xml version="1.0"?>\n<SL Engine="1300">\n`;
  xml += elements.join('\n') + '\n';
  xml += `</SL>\n`;

  // Add local adjustments (masks) section (Capture One expects LDS block even when empty)
  if (include?.masks === false) {
    xml += '<LDS>\n</LDS>\n';
  } else {
    const masks = convertRecipeToMasks(aiAdjustments);
    xml += generateMasksXML(masks);
  }

  return xml;
}

/**
 * Generates XML for local adjustments (masks) in Capture One format
 */
function generateMasksXML(masks: any[]): string {
  if (!masks.length) return '<LDS>\n</LDS>\n';

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

  const formatNumber = (n: number): string => {
    // If it's an integer or very close to one, return as integer
    if (Math.abs(n - Math.round(n)) < 0.0001) {
      return Math.round(n).toString();
    }
    // Otherwise match the six decimal precision used in global adjustments
    return n.toFixed(6);
  };

  const E = (key: string, value: string | number, indent: string = '\t\t\t') => {
    const formattedValue = typeof value === 'number' ? formatNumber(value) : value;
    return `${indent}<E K="${key}" V="${formattedValue}" />`;
  };

  let xml = '<LDS>\n';

  masks.forEach((mask, index) => {
    const maskType = normalizeMaskType(mask.type || 'subject');
    const adjustments = mask.adjustments || {};

    xml += '\t<LD>\n\t\t<LA>\n';

    // Add mask adjustments
    const localElements: string[] = [];

    // Required mask metadata fields
    localElements.push(E('AIColorGrade', '0'));
    localElements.push(E('Enabled', '1'));
    localElements.push(E('Moire', '0;0'));
    localElements.push(E('Name', escapeXml(mask.name || `Mask ${index + 1}`)));

    const localExposure = clamp(adjustments.local_exposure, -4, 4);
    if (typeof localExposure === 'number') {
      localElements.push(E('Exposure', localExposure));
    }

    const localContrast = clamp(adjustments.local_contrast, -100, 100);
    if (typeof localContrast === 'number') {
      localElements.push(E('Contrast', localContrast));
    }

    const localBrightness = clamp(adjustments.local_brightness, -100, 100);
    if (typeof localBrightness === 'number') {
      localElements.push(E('Brightness', localBrightness));
    }

    const localSaturation = clamp(adjustments.local_saturation, -100, 100);
    if (typeof localSaturation === 'number') {
      localElements.push(E('Saturation', localSaturation));
    }

    const localHighlights = clamp(adjustments.local_highlights, -100, 100);
    if (typeof localHighlights === 'number') {
      localElements.push(E('HighlightRecoveryEx', -localHighlights));
    }

    const localShadows = clamp(adjustments.local_shadows, -100, 100);
    if (typeof localShadows === 'number') {
      localElements.push(E('ShadowRecovery', localShadows));
    }

    localElements.push(E('Opacity', '100'));
    localElements.push(E('UsmMethod', '0'));

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

      let anyEnabled = false;
      const optionsXml: string[] = [];

      Object.entries(subjectOptions).forEach(([coKey, ourTypes]) => {
        const enabled = ourTypes.includes(maskType) ? '1' : '0';
        if (enabled === '1') anyEnabled = true;
        optionsXml.push(E(coKey, enabled, '\t\t\t\t'));
      });

      // If no specific subject part is enabled, enable Face as default
      // (Subject masks require at least one part enabled)
      if (!anyEnabled) {
        const faceIndex = optionsXml.findIndex(line => line.includes('K="Face"'));
        if (faceIndex >= 0) {
          optionsXml[faceIndex] = E('Face', '1', '\t\t\t\t');
        }
      }

      xml += optionsXml.join('\n') + '\n';
      xml += '\t\t\t</SO>';
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
