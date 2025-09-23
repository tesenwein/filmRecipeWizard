/**
 * Shared curve utilities for Film Recipe Wizard
 * 
 * These utilities provide consistent curve generation and parsing behavior
 * across all generators, eliminating code duplication.
 */

export interface CurvePoint {
  input: number;
  output: number;
}

export interface CurveData {
  tone_curve?: CurvePoint[];
  tone_curve_red?: CurvePoint[];
  tone_curve_green?: CurvePoint[];
  tone_curve_blue?: CurvePoint[];
}

/**
 * Clamp and round a curve point value to valid range (0-255)
 */
export function clampCurveValue(value: any): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Process a curve point to ensure valid input/output values
 */
export function processCurvePoint(point: any): CurvePoint {
  return {
    input: clampCurveValue(point?.input),
    output: clampCurveValue(point?.output)
  };
}

/**
 * Process an array of curve points
 */
export function processCurvePoints(points: any[]): CurvePoint[] {
  if (!Array.isArray(points)) {
    return [];
  }
  return points.map(processCurvePoint);
}

/**
 * Generate XMP tone curve XML for a single curve
 */
export function generateToneCurveXML(curveName: string, points: CurvePoint[]): string {
  if (!points || points.length === 0) {
    return '';
  }

  const pointStrings = points
    .map(p => `${p.input}, ${p.output}`)
    .join('</rdf:li>\n          <rdf:li>');

  return `<crs:${curveName}>
        <rdf:Seq>
          <rdf:li>${pointStrings}</rdf:li>
        </rdf:Seq>
      </crs:${curveName}>`;
}

/**
 * Generate all tone curves XML from curve data
 */
export function generateAllToneCurvesXML(curveData: CurveData): string {
  const curves: string[] = [];

  if (curveData.tone_curve) {
    curves.push(generateToneCurveXML('ToneCurvePV2012', curveData.tone_curve));
  }

  if (curveData.tone_curve_red) {
    curves.push(generateToneCurveXML('ToneCurvePV2012Red', curveData.tone_curve_red));
  }

  if (curveData.tone_curve_green) {
    curves.push(generateToneCurveXML('ToneCurvePV2012Green', curveData.tone_curve_green));
  }

  if (curveData.tone_curve_blue) {
    curves.push(generateToneCurveXML('ToneCurvePV2012Blue', curveData.tone_curve_blue));
  }

  return curves.join('\n');
}

/**
 * Parse tone curve from XMP content
 */
export function parseToneCurveFromXMP(xmpContent: string, curveName: string): CurvePoint[] {
  const curveMatch = xmpContent.match(new RegExp(`<crs:${curveName}>\\s*<rdf:Seq>\\s*([\\s\\S]*?)\\s*</rdf:Seq>\\s*</crs:${curveName}>`));
  if (!curveMatch) {
    return [];
  }

  const curveContent = curveMatch[1];
  const pointMatches = curveContent.match(/<rdf:li>([^<]*)<\/rdf:li>/g);
  if (!pointMatches) {
    return [];
  }

  return pointMatches.map(match => {
    const coords = match.replace(/<\/?rdf:li>/g, '').split(',').map(s => parseFloat(s.trim()));
    return {
      input: clampCurveValue(coords[0]),
      output: clampCurveValue(coords[1])
    };
  }).filter(p => !isNaN(p.input) && !isNaN(p.output));
}

/**
 * Parse all tone curves from XMP content
 */
export function parseAllToneCurvesFromXMP(xmpContent: string): CurveData {
  return {
    tone_curve: parseToneCurveFromXMP(xmpContent, 'ToneCurvePV2012'),
    tone_curve_red: parseToneCurveFromXMP(xmpContent, 'ToneCurvePV2012Red'),
    tone_curve_green: parseToneCurveFromXMP(xmpContent, 'ToneCurvePV2012Green'),
    tone_curve_blue: parseToneCurveFromXMP(xmpContent, 'ToneCurvePV2012Blue'),
  };
}

/**
 * Validate curve data
 */
export function validateCurveData(curveData: CurveData): boolean {
  const curves = [curveData.tone_curve, curveData.tone_curve_red, curveData.tone_curve_green, curveData.tone_curve_blue];
  
  return curves.some(curve => curve && curve.length > 0);
}

/**
 * Get curve data from adjustments object
 */
export function extractCurveData(adjustments: any): CurveData {
  return {
    tone_curve: processCurvePoints(adjustments.tone_curve),
    tone_curve_red: processCurvePoints(adjustments.tone_curve_red),
    tone_curve_green: processCurvePoints(adjustments.tone_curve_green),
    tone_curve_blue: processCurvePoints(adjustments.tone_curve_blue),
  };
}

/**
 * Apply curve transformations to RGB values (for LUT generation)
 */
export function applyCurveToRGB(r: number, g: number, b: number, curveData: CurveData): [number, number, number] {
  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
  
  let R = r, G = g, B = b;

  // Apply main tone curve to all channels
  if (curveData.tone_curve && curveData.tone_curve.length > 0) {
    R = applyCurveToValue(R, curveData.tone_curve);
    G = applyCurveToValue(G, curveData.tone_curve);
    B = applyCurveToValue(B, curveData.tone_curve);
  }

  // Apply individual channel curves
  if (curveData.tone_curve_red && curveData.tone_curve_red.length > 0) {
    R = applyCurveToValue(R, curveData.tone_curve_red);
  }
  if (curveData.tone_curve_green && curveData.tone_curve_green.length > 0) {
    G = applyCurveToValue(G, curveData.tone_curve_green);
  }
  if (curveData.tone_curve_blue && curveData.tone_curve_blue.length > 0) {
    B = applyCurveToValue(B, curveData.tone_curve_blue);
  }

  return [clamp01(R), clamp01(G), clamp01(B)];
}

/**
 * Apply a curve to a single value using linear interpolation
 */
function applyCurveToValue(value: number, curve: CurvePoint[]): number {
  if (!curve || curve.length === 0) {
    return value;
  }

  // Convert 0-1 range to 0-255 range
  const input = value * 255;
  
  // Find the two points to interpolate between
  for (let i = 0; i < curve.length - 1; i++) {
    const p1 = curve[i];
    const p2 = curve[i + 1];
    
    if (input >= p1.input && input <= p2.input) {
      // Linear interpolation
      const t = (input - p1.input) / (p2.input - p1.input);
      const output = p1.output + t * (p2.output - p1.output);
      return output / 255; // Convert back to 0-1 range
    }
  }
  
  // If input is outside the curve range, use the closest endpoint
  if (input <= curve[0].input) {
    return curve[0].output / 255;
  } else {
    return curve[curve.length - 1].output / 255;
  }
}

