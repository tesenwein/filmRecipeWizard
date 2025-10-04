import type { AIColorAdjustments } from '../services/types';

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

    elements.push(E('BwRed', typeof gray_red === 'number' ? gray_red + (typeof gray_orange === 'number' ? gray_orange * 0.5 : 0) : 0));
    elements.push(E('BwGreen', typeof gray_green === 'number' ? gray_green : 0));
    elements.push(E('BwBlue', typeof gray_blue === 'number' ? gray_blue + (typeof gray_purple === 'number' ? gray_purple * 0.5 : 0) : 0));
    elements.push(E('BwYellow', typeof gray_yellow === 'number' ? gray_yellow + (typeof gray_orange === 'number' ? gray_orange * 0.5 : 0) : 0));
    elements.push(E('BwCyan', typeof gray_cyan === 'number' ? gray_cyan : 0));
    elements.push(E('BwMagenta', typeof gray_magenta === 'number' ? gray_magenta + (typeof gray_purple === 'number' ? gray_purple * 0.5 : 0) : 0));
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

  const colorBalanceValue = (hue?: number, sat?: number) => {
    if (!includeColorGrading) return '1;1;1';
    if (typeof hue !== 'number' && typeof sat !== 'number') return '1;1;1';
    return hueToRgb(hue, sat);
  };

  elements.push(E('ColorBalanceShadow', colorBalanceValue(shadowHue, shadowSat)));
  elements.push(E('ColorBalanceMidtone', colorBalanceValue(midtoneHue, midtoneSat)));
  elements.push(E('ColorBalanceHighlight', colorBalanceValue(highlightHue, highlightSat)));

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

  // NOTE: Vignette field is NOT included in working Capture One styles
  // This appears to prevent import when present

  // Tone curves
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
      elements.push(E('GradationCurve', convertCurve(toneCurve)));
    }

    const toneCurveRed = (aiAdjustments as any).tone_curve_red;
    if (toneCurveRed && Array.isArray(toneCurveRed)) {
      elements.push(E('GradationCurveRed', convertCurve(toneCurveRed)));
    }

    const toneCurveGreen = (aiAdjustments as any).tone_curve_green;
    if (toneCurveGreen && Array.isArray(toneCurveGreen)) {
      elements.push(E('GradationCurveGreen', convertCurve(toneCurveGreen)));
    }

    const toneCurveBlue = (aiAdjustments as any).tone_curve_blue;
    if (toneCurveBlue && Array.isArray(toneCurveBlue)) {
      elements.push(E('GradationCurveBlue', convertCurve(toneCurveBlue)));
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


  // NOTE: Highlight, Midtone, Shadow fields are NOT included in working Capture One styles
  // These appear to conflict with ColorCorrections field and prevent import

  // Add ColorCorrections field (required by Capture One)
  // Format: 9 semicolon-separated color correction zones, each with 18 parameters
  // Parameters: [enabled, ?, ?, lum, ?, hue, rangeMin1, rangeMin2, rangeMin3, rangeMax1, rangeMax2, limitMin, limitMax, smoothness, ?, ?, ?, ?]
  // Zones map to 8 color bands + 1 disabled zone:
  // Red(0°), Orange(30°), Yellow(60°), Green(120°), Cyan(180°), Blue(240°), Purple(270°), Magenta(300°), Disabled
  const buildColorZone = (enabled: boolean, hueShift: number, satShift: number, lumShift: number, hueCenter: number, hueRange: number): string => {
    if (!enabled) return '0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0';

    // Format the zone with HSL adjustments
    // Hue range defines the color band this zone affects
    const rangeSpread = hueRange / 2;

    return `1,1,1,${formatNumber(lumShift)},0,${formatNumber(hueShift)},0,0,${formatNumber(hueCenter)},${formatNumber(-rangeSpread)},${formatNumber(rangeSpread)},-100,100,15,0,0,0,0`;
  };

  // Map HSL adjustments to color zones
  const hueRed = clamp(aiAdjustments.hue_red, -100, 100) || 0;
  const hueOrange = clamp(aiAdjustments.hue_orange, -100, 100) || 0;
  const hueYellow = clamp(aiAdjustments.hue_yellow, -100, 100) || 0;
  const hueGreen = clamp(aiAdjustments.hue_green, -100, 100) || 0;
  const hueAqua = clamp(aiAdjustments.hue_aqua, -100, 100) || 0;
  const hueBlue = clamp(aiAdjustments.hue_blue, -100, 100) || 0;
  const huePurple = clamp(aiAdjustments.hue_purple, -100, 100) || 0;
  const hueMagenta = clamp(aiAdjustments.hue_magenta, -100, 100) || 0;

  const satRed = clamp((aiAdjustments as any).sat_red, -100, 100) || 0;
  const satOrange = clamp((aiAdjustments as any).sat_orange, -100, 100) || 0;
  const satYellow = clamp((aiAdjustments as any).sat_yellow, -100, 100) || 0;
  const satGreen = clamp((aiAdjustments as any).sat_green, -100, 100) || 0;
  const satAqua = clamp((aiAdjustments as any).sat_aqua, -100, 100) || 0;
  const satBlue = clamp((aiAdjustments as any).sat_blue, -100, 100) || 0;
  const satPurple = clamp((aiAdjustments as any).sat_purple, -100, 100) || 0;
  const satMagenta = clamp((aiAdjustments as any).sat_magenta, -100, 100) || 0;

  const lumRed = clamp((aiAdjustments as any).lum_red, -100, 100) || 0;
  const lumOrange = clamp((aiAdjustments as any).lum_orange, -100, 100) || 0;
  const lumYellow = clamp((aiAdjustments as any).lum_yellow, -100, 100) || 0;
  const lumGreen = clamp((aiAdjustments as any).lum_green, -100, 100) || 0;
  const lumAqua = clamp((aiAdjustments as any).lum_aqua, -100, 100) || 0;
  const lumBlue = clamp((aiAdjustments as any).lum_blue, -100, 100) || 0;
  const lumPurple = clamp((aiAdjustments as any).lum_purple, -100, 100) || 0;
  const lumMagenta = clamp((aiAdjustments as any).lum_magenta, -100, 100) || 0;

  // Define standard hue range for each color band (degrees)
  const standardRange = 30;

  const colorZones = [
    buildColorZone(hueRed !== 0 || satRed !== 0 || lumRed !== 0, hueRed, satRed, lumRed, 0, standardRange),
    buildColorZone(hueOrange !== 0 || satOrange !== 0 || lumOrange !== 0, hueOrange, satOrange, lumOrange, 30, standardRange),
    buildColorZone(hueYellow !== 0 || satYellow !== 0 || lumYellow !== 0, hueYellow, satYellow, lumYellow, 60, standardRange),
    buildColorZone(hueGreen !== 0 || satGreen !== 0 || lumGreen !== 0, hueGreen, satGreen, lumGreen, 120, standardRange),
    buildColorZone(hueAqua !== 0 || satAqua !== 0 || lumAqua !== 0, hueAqua, satAqua, lumAqua, 180, standardRange),
    buildColorZone(hueBlue !== 0 || satBlue !== 0 || lumBlue !== 0, hueBlue, satBlue, lumBlue, 240, standardRange),
    buildColorZone(huePurple !== 0 || satPurple !== 0 || lumPurple !== 0, huePurple, satPurple, lumPurple, 270, standardRange),
    buildColorZone(hueMagenta !== 0 || satMagenta !== 0 || lumMagenta !== 0, hueMagenta, satMagenta, lumMagenta, 300, standardRange),
    '0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0' // Zone 9 always disabled
  ];

  const colorCorrections = colorZones.join(';');
  elements.push(E('ColorCorrections', colorCorrections));

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

  // NOTE: Mask support disabled - ColorCorrections format is incompatible with mask adjustments
  // and Capture One rejects imports with local adjustment values.
  // Users must create masks manually in Capture One.
  xml += '<LDS>\n</LDS>\n';

  return xml;
}

// NOTE: Mask generation removed - Capture One format is too complex and incompatible
// Users must create masks manually in Capture One

/**
 * Generates a Capture One style file with basic adjustments only
 */
export function generateCaptureOneBasicStyle(aiAdjustments: AIColorAdjustments, include: any): string {
  const basicInclude = {
    ...include,
    colorGrading: false,
    grain: false,
    vignette: false,
    masks: false,
  };

  return generateCaptureOneStyle(aiAdjustments, basicInclude);
}
