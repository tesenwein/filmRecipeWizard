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

  // Build elements arrays - separate base and layer adjustments
  const baseElements: string[] = [];
  const layerElements: string[] = [];

  // Helper to create E elements for layers (with tab indentation)
  const ELayer = (key: string, value: string | number) => {
    const formattedValue = typeof value === 'number' ? formatNumber(value) : value;
    return `\t\t\t<E K="${key}" V="${formattedValue}" />`;
  };

  // Base elements (SL) - Name, UUID, B&W settings, Film Grain, Retouching
  baseElements.push(E('Name', escapeXml(presetName)));
  baseElements.push(E('UUID', styleId));

  // Brightness - only in base adjustments (not supported in layers)
  const brightness = clamp(aiAdjustments.brightness, -100, 100);
  if (typeof brightness === 'number') {
    baseElements.push(E('Brightness', brightness));
  }

  // B&W mode settings (in base adjustments)
  if (isBW) {
    baseElements.push(E('BwEnabled', '1'));

    // Add B&W color mixer - map from Lightroom gray mixer values
    // C1 range appears to be roughly -100 to +100 based on working examples
    const gray_red = clamp((aiAdjustments as any).gray_red, -100, 100);
    const gray_green = clamp((aiAdjustments as any).gray_green, -100, 100);
    const gray_blue = clamp((aiAdjustments as any).gray_blue, -100, 100);
    const gray_yellow = clamp((aiAdjustments as any).gray_yellow, -100, 100);
    const gray_cyan = clamp((aiAdjustments as any).gray_cyan, -100, 100);
    const gray_magenta = clamp((aiAdjustments as any).gray_magenta, -100, 100);

    // Orange: interpolate between red and yellow (C1 doesn't have separate orange)
    const gray_orange = clamp((aiAdjustments as any).gray_orange, -100, 100);

    // Purple: interpolate between blue and magenta (C1 doesn't have separate purple)
    const gray_purple = clamp((aiAdjustments as any).gray_purple, -100, 100);

    baseElements.push(E('BwRed', typeof gray_red === 'number' ? gray_red + (typeof gray_orange === 'number' ? gray_orange * 0.5 : 0) : 0));
    baseElements.push(E('BwGreen', typeof gray_green === 'number' ? gray_green : 0));
    baseElements.push(E('BwBlue', typeof gray_blue === 'number' ? gray_blue + (typeof gray_purple === 'number' ? gray_purple * 0.5 : 0) : 0));
    baseElements.push(E('BwYellow', typeof gray_yellow === 'number' ? gray_yellow + (typeof gray_orange === 'number' ? gray_orange * 0.5 : 0) : 0));
    baseElements.push(E('BwCyan', typeof gray_cyan === 'number' ? gray_cyan : 0));
    baseElements.push(E('BwMagenta', typeof gray_magenta === 'number' ? gray_magenta + (typeof gray_purple === 'number' ? gray_purple * 0.5 : 0) : 0));
  }

  if (filmCurveName) {
    baseElements.push(E('FilmCurve', filmCurveName));
  }
  if (iccProfileName) {
    baseElements.push(E('ICCProfile', iccProfileName));
  }

  // Grain (in base adjustments)
  if (include?.grain !== false) {
    const grainAmount = clamp((aiAdjustments as any).grain_amount, 0, 100);
    if (typeof grainAmount === 'number') {
      baseElements.push(E('FilmGrainAmount', grainAmount));
    }

    const grainSize = clamp((aiAdjustments as any).grain_size, 0, 100);
    if (typeof grainSize === 'number') {
      baseElements.push(E('FilmGrainGranularity', grainSize));
    }

    const grainFrequency = clamp((aiAdjustments as any).grain_frequency, 0, 100);
    if (typeof grainFrequency === 'number') {
      baseElements.push(E('FilmGrainDensity', grainFrequency));
    }

    // FilmGrainType: 0 = Soft, 1 = Medium, 2 = Hard (default to 1 if grain is present)
    if (typeof grainAmount === 'number' && grainAmount > 0) {
      baseElements.push(E('FilmGrainType', 1));
    }
  }

  // Add required retouching fields to base (even if zero, these appear to be mandatory)
  baseElements.push(E('RetouchingBlemishRemovalAmount', '0'));
  baseElements.push(E('RetouchingDarkCirclesReductionAmount', '0'));
  baseElements.push(E('RetouchingFaceSculptingContouring', '0'));
  baseElements.push(E('RetouchingOpacity', '100'));
  baseElements.push(E('RetouchingSkinEveningAmount', '0'));
  baseElements.push(E('RetouchingSkinEveningTexture', '0'));

  // Layer elements (LA) - Contrast, Highlights/Shadows, Whites/Blacks, Color Grading, Curves, ColorCorrections
  layerElements.push(ELayer('Enabled', '1'));
  layerElements.push(ELayer('Name', escapeXml(presetName)));

  // Contrast (in layer)
  const contrast = clamp(aiAdjustments.contrast, -100, 100);
  if (typeof contrast === 'number') {
    layerElements.push(ELayer('Contrast', contrast));
  }

  // Saturation (in layer)
  const saturation = isBW ? -100 : clamp(aiAdjustments.saturation, -100, 100);
  if (typeof saturation === 'number') {
    layerElements.push(ELayer('Saturation', saturation));
  }

  // Highlights and Shadows (in layer)
  const highlights = clamp(aiAdjustments.highlights, -100, 100);
  if (typeof highlights === 'number') {
    layerElements.push(ELayer('HighlightRecoveryEx', -highlights)); // Inverted
  }

  const shadows = clamp(aiAdjustments.shadows, -100, 100);
  if (typeof shadows === 'number') {
    layerElements.push(ELayer('ShadowRecovery', shadows));
  }

  // Whites and Blacks (in layer)
  const whites = clamp(aiAdjustments.whites, -100, 100);
  if (typeof whites === 'number') {
    layerElements.push(ELayer('WhiteRecovery', whites));
  }

  const blacks = clamp(aiAdjustments.blacks, -100, 100);
  if (typeof blacks === 'number') {
    layerElements.push(ELayer('BlackRecovery', blacks));
  }

  // Color grading - convert hue/sat to RGB multipliers (in layer)
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

  const colorBalanceValue = (hue?: number, sat?: number) => {
    if (!includeColorGrading) return '1;1;1';
    if (typeof hue !== 'number' && typeof sat !== 'number') return '1;1;1';
    return hueToRgb(hue, sat);
  };

  layerElements.push(ELayer('ColorBalanceShadow', colorBalanceValue(shadowHue, shadowSat)));
  layerElements.push(ELayer('ColorBalanceMidtone', colorBalanceValue(midtoneHue, midtoneSat)));
  layerElements.push(ELayer('ColorBalanceHighlight', colorBalanceValue(highlightHue, highlightSat)));

  // Tone curves (in layer)
  if (include?.curves !== false) {
    // Convert curve points from our format to Capture One format
    // Our format: array of {input, output} objects where values can be 0-255 or 0-1
    // C1 format: "x1,y1;x2,y2;x3,y3" where values are 0-1
    const convertCurve = (curvePoints: any[]): string => {
      if (!Array.isArray(curvePoints) || curvePoints.length === 0) {
        return '0,0;1,1'; // Default linear curve
      }
      return curvePoints
        .map(pt => {
          let input = pt.input || pt.x || 0;
          let output = pt.output || pt.y || 0;

          // Normalize from 0-255 range to 0-1 if needed
          if (input > 1) input = input / 255;
          if (output > 1) output = output / 255;

          return `${formatNumber(input)},${formatNumber(output)}`;
        })
        .join(';');
    };

    // Check for tone_curve fields (from AIColorAdjustments)
    const toneCurve = (aiAdjustments as any).tone_curve;
    if (toneCurve && Array.isArray(toneCurve)) {
      layerElements.push(ELayer('GradationCurve', convertCurve(toneCurve)));
    }

    const toneCurveRed = (aiAdjustments as any).tone_curve_red;
    if (toneCurveRed && Array.isArray(toneCurveRed)) {
      layerElements.push(ELayer('GradationCurveRed', convertCurve(toneCurveRed)));
    }

    const toneCurveGreen = (aiAdjustments as any).tone_curve_green;
    if (toneCurveGreen && Array.isArray(toneCurveGreen)) {
      layerElements.push(ELayer('GradationCurveGreen', convertCurve(toneCurveGreen)));
    }

    const toneCurveBlue = (aiAdjustments as any).tone_curve_blue;
    if (toneCurveBlue && Array.isArray(toneCurveBlue)) {
      layerElements.push(ELayer('GradationCurveBlue', convertCurve(toneCurveBlue)));
    }
  }

  /**
   * ColorCorrections field - Capture One's HSL Color Editor
   *
   * This field controls the 9 color zones in Capture One's Color Editor panel.
   * Format: 9 zones separated by semicolons, each with 18 comma-separated parameters
   *
   * Zone order: Red, Orange, Yellow, Green, Cyan, Blue, Purple, Pink, Rainbow
   *
   * Parameter structure per zone (18 values):
   * 0: enabled (1=enabled, 0=disabled)
   * 1-2: always "1,1" (unknown purpose)
   * 3-5: H,S,L adjustments (Hue, Saturation, Luminance from Lightroom HSL)
   * 6-8: R,G,B hue center encoding (defines which color this zone represents)
   * 9-10: Hue symmetry values (derived from hue adjustment, format: -H, +H)
   * 11-12: Range bounds (always -100, 100)
   * 13: Feather (always 15)
   * 14-17: Unused (always 0,0,0,0)
   *
   * RGB Hue Center Encoding (parameters 6-8):
   * These values encode the hue angle of the color zone's center point using a
   * custom RGB-space representation. The encoding uses a sawtooth pattern where
   * one channel is 255, one is 0, and one varies linearly based on the angle.
   *
   * Example encodings:
   * - Red (0°):     255, 0, 255
   * - Orange (30°): 255, 0, 127.5
   * - Yellow (60°): 255, 0, 0
   * - Green (120°): 0, 255, 255
   * - Cyan (180°):  0, 255, 0
   * - Blue (240°):  255, 0, 0
   * - Purple (270°): 255, 127.5, 0
   * - Pink (300°):  255, 0, 0
   *
   * @see example/coloreditor.costyle for real-world example
   */
  const buildColorZone = (hue: number | undefined, sat: number | undefined, lum: number | undefined, hueAngleDegrees: number): string => {
    const h = hue || 0;
    const s = sat || 0;
    const l = lum || 0;

    // Always enable zones (Capture One shows all colors even with 0 adjustments)
    const enabled = 1;

    // Encode hue angle as RGB-like triplet (reverse engineered from C1 examples)
    // This determines which color icon appears in the Color Editor UI
    const angle = hueAngleDegrees;
    let r: number, g: number, b: number;

    // RGB encoding uses a sawtooth pattern across the color wheel
    if (angle >= 0 && angle < 60) {
      // Red to Yellow range
      r = 255;
      g = 0;
      b = 255 - (angle / 60) * 255;
    } else if (angle >= 60 && angle < 120) {
      // Yellow to Green range
      r = 255 - ((angle - 60) / 60) * 255;
      g = (angle - 60) / 60 * 255;
      b = 255;
    } else if (angle >= 120 && angle < 180) {
      // Green to Cyan range
      r = 0;
      g = 255;
      b = 255 - ((angle - 120) / 60) * 255;
    } else if (angle >= 180 && angle < 240) {
      // Cyan to Blue range
      r = ((angle - 180) / 60) * 255;
      g = 255;
      b = 0;
    } else if (angle >= 240 && angle < 300) {
      // Blue to Magenta range
      r = 255;
      g = 255 - ((angle - 240) / 60) * 255;
      b = 0;
    } else {
      // Magenta to Red range
      r = 255;
      g = 0;
      b = ((angle - 300) / 60) * 255;
    }

    // Symmetry values derived from hue adjustment
    const hueSymmetry = h * 1.0;

    return `${enabled},1,1,${h},${s},${l},${r},${g},${b},${-hueSymmetry},${hueSymmetry},-100,100,15,0,0,0,0`;
  };

  // Map 8 Lightroom colors to 9 Capture One zones with their hue angles
  const zones = [
    buildColorZone(aiAdjustments.hue_red, aiAdjustments.sat_red, aiAdjustments.lum_red, 0),         // Red
    buildColorZone(aiAdjustments.hue_orange, aiAdjustments.sat_orange, aiAdjustments.lum_orange, 30), // Orange
    buildColorZone(aiAdjustments.hue_yellow, aiAdjustments.sat_yellow, aiAdjustments.lum_yellow, 60), // Yellow
    buildColorZone(aiAdjustments.hue_green, aiAdjustments.sat_green, aiAdjustments.lum_green, 120),   // Green
    buildColorZone(aiAdjustments.hue_aqua, aiAdjustments.sat_aqua, aiAdjustments.lum_aqua, 180),     // Cyan
    buildColorZone(aiAdjustments.hue_blue, aiAdjustments.sat_blue, aiAdjustments.lum_blue, 240),     // Blue
    buildColorZone(aiAdjustments.hue_purple, aiAdjustments.sat_purple, aiAdjustments.lum_purple, 270), // Purple
    buildColorZone(aiAdjustments.hue_magenta, aiAdjustments.sat_magenta, aiAdjustments.lum_magenta, 300), // Pink
    '0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0' // Rainbow zone - always disabled
  ];

  layerElements.push(ELayer('ColorCorrections', zones.join(';')));

  // Opacity (in layer)
  layerElements.push(ELayer('Opacity', '100'));

  // Sort elements alphabetically by key (required by Capture One)
  baseElements.sort((a, b) => {
    const keyA = a.match(/K="([^"]+)"/)?.[1] || '';
    const keyB = b.match(/K="([^"]+)"/)?.[1] || '';
    return keyA.localeCompare(keyB);
  });

  layerElements.sort((a, b) => {
    const keyA = a.match(/K="([^"]+)"/)?.[1] || '';
    const keyB = b.match(/K="([^"]+)"/)?.[1] || '';
    return keyA.localeCompare(keyB);
  });

  // Build the XML
  let xml = `<?xml version="1.0"?>\n<SL Engine="1300">\n`;
  xml += baseElements.join('\n') + '\n';
  xml += `</SL>\n`;

  // Add local adjustments (masks) section
  const masks = include?.masks !== false ? convertRecipeToMasks(aiAdjustments) : [];
  xml += generateMasksXML(masks, layerElements, presetName);

  return xml;
}

/**
 * Generates XML for local adjustments (masks) in Capture One format
 * First layer = main adjustments layer
 * Subsequent layers = mask layers (without adjustments)
 */
function generateMasksXML(masks: any[], mainLayerElements: string[], mainLayerName: string): string {

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

  // Always add the main layer with all adjustments (MaskType 1 = global)
  xml += '\t<LD>\n';
  xml += '\t\t<LA>\n';
  xml += mainLayerElements.join('\n') + '\n';
  xml += '\t\t</LA>\n';
  xml += '\t\t<MD>\n';
  xml += '\t\t\t<E K="Density" V="1" />\n';
  xml += '\t\t\t<E K="MaskType" V="1" />\n';
  xml += '\t\t</MD>\n';
  xml += '\t</LD>\n';

  // If no masks, return with just the main layer
  if (!masks.length) {
    xml += '</LDS>\n';
    return xml;
  }

  // Filter out unsupported landscape masks - Capture One only supports person/face masks and background
  const unsupportedMaskTypes = ['sky', 'vegetation', 'water', 'architecture', 'mountains', 'natural_ground', 'artificial_ground'];
  const supportedMasks = masks.filter(mask => {
    const maskType = normalizeMaskType(mask.type || 'subject');
    return !unsupportedMaskTypes.includes(maskType);
  });

  supportedMasks.forEach((mask, index) => {
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

    // Add local adjustments from the mask data (normalized 0-1 values -> percentages)
    if (typeof adjustments.contrast === 'number') {
      localElements.push(E('Contrast', adjustments.contrast * 100));
    }

    if (typeof adjustments.highlights === 'number') {
      localElements.push(E('HighlightRecoveryEx', -adjustments.highlights * 100)); // Inverted
    }

    if (typeof adjustments.shadows === 'number') {
      localElements.push(E('ShadowRecovery', adjustments.shadows * 100));
    }

    if (typeof adjustments.whites === 'number') {
      localElements.push(E('WhiteRecovery', adjustments.whites * 100));
    }

    if (typeof adjustments.blacks === 'number') {
      localElements.push(E('BlackRecovery', adjustments.blacks * 100));
    }

    if (typeof adjustments.saturation === 'number') {
      localElements.push(E('Saturation', adjustments.saturation * 100));
    }

    if (typeof adjustments.vibrance === 'number') {
      localElements.push(E('Vibrance', adjustments.vibrance * 100));
    }

    if (typeof adjustments.clarity === 'number') {
      localElements.push(E('Clarity', adjustments.clarity * 100));
    }

    if (typeof adjustments.dehaze === 'number') {
      localElements.push(E('Haze', adjustments.dehaze * 100));
    }

    if (typeof adjustments.texture === 'number') {
      localElements.push(E('Structure', adjustments.texture * 100));
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
