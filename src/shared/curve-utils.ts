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
  // Normalize, clamp and then sort by input ascending
  const normalized = points
    .map(processCurvePoint)
    .filter(p => Number.isFinite(p.input) && Number.isFinite(p.output));

  // Sort by input so interpolation behaves predictably
  normalized.sort((a, b) => a.input - b.input);

  // De-duplicate identical input entries to avoid zero-length segments
  const deduped: CurvePoint[] = [];
  for (const p of normalized) {
    const last = deduped[deduped.length - 1];
    if (!last || last.input !== p.input) {
      deduped.push(p);
    } else {
      // If duplicate input exists, keep the most recent output value
      deduped[deduped.length - 1] = p;
    }
  }

  return deduped;
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
  // Sanitize to avoid color casts and LR parsing quirks
  const clean = sanitizeCurveData(curveData, { neutralPreserve: false, ensureEndpoints: true });
  const curves: string[] = [];

  if (clean.tone_curve && clean.tone_curve.length > 0) {
    curves.push(generateToneCurveXML('ToneCurvePV2012', clean.tone_curve));
  }

  if (clean.tone_curve_red && clean.tone_curve_red.length > 0) {
    curves.push(generateToneCurveXML('ToneCurvePV2012Red', clean.tone_curve_red));
  }

  if (clean.tone_curve_green && clean.tone_curve_green.length > 0) {
    curves.push(generateToneCurveXML('ToneCurvePV2012Green', clean.tone_curve_green));
  }

  if (clean.tone_curve_blue && clean.tone_curve_blue.length > 0) {
    curves.push(generateToneCurveXML('ToneCurvePV2012Blue', clean.tone_curve_blue));
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
  const raw = {
    tone_curve: parseToneCurveFromXMP(xmpContent, 'ToneCurvePV2012'),
    tone_curve_red: parseToneCurveFromXMP(xmpContent, 'ToneCurvePV2012Red'),
    tone_curve_green: parseToneCurveFromXMP(xmpContent, 'ToneCurvePV2012Green'),
    tone_curve_blue: parseToneCurveFromXMP(xmpContent, 'ToneCurvePV2012Blue'),
  };
  return sanitizeCurveData(raw, { neutralPreserve: false, ensureEndpoints: true });
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
  const raw: CurveData = {
    tone_curve: processCurvePoints(adjustments.tone_curve),
    tone_curve_red: processCurvePoints(adjustments.tone_curve_red),
    tone_curve_green: processCurvePoints(adjustments.tone_curve_green),
    tone_curve_blue: processCurvePoints(adjustments.tone_curve_blue),
  };
  return sanitizeCurveData(raw, { neutralPreserve: false, ensureEndpoints: true });
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
      // Guard against zero-length segments
      if (p2.input === p1.input) {
        return p2.output / 255;
      }
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

/**
 * Evaluate a curve at a specific 0..255 input (no side effects)
 */
function evalCurveAt255(curve: CurvePoint[] | undefined, input255: number): number | undefined {
  if (!curve || curve.length === 0) return undefined;
  const v01 = Math.max(0, Math.min(1, input255 / 255));
  return applyCurveToValue(v01, curve) * 255;
}

/**
 * Ensure endpoints exist and are sane, optionally add identity endpoints.
 */
function ensureEndpoints(points: CurvePoint[] | undefined): CurvePoint[] | undefined {
  if (!points || points.length === 0) return points;
  const arr = processCurvePoints(points);
  const first = arr[0];
  const last = arr[arr.length - 1];
  const out: CurvePoint[] = [...arr];
  if (first.input > 0) {
    out.unshift({ input: 0, output: 0 });
  }
  if (last.input < 255) {
    out.push({ input: 255, output: 255 });
  }
  // Re-run process to sort/dedupe after potential inserts
  return processCurvePoints(out);
}

/**
 * Sanitize curves to avoid color casts and LR quirks:
 * - clamp/sort/dedupe
 * - optionally ensure endpoints at 0,0 and 255,255
 * - optionally neutral-preserve mid-gray by aligning per-channel outputs to composite/average
 */
export function sanitizeCurveData(curveData: CurveData, opts?: { neutralPreserve?: boolean; ensureEndpoints?: boolean }): CurveData {
  const ensureEP = opts?.ensureEndpoints !== false;
  const neutralPreserve = opts?.neutralPreserve === true;

  // Normalize all
  let tone = processCurvePoints(curveData.tone_curve || []);
  let r = processCurvePoints(curveData.tone_curve_red || []);
  let g = processCurvePoints(curveData.tone_curve_green || []);
  let b = processCurvePoints(curveData.tone_curve_blue || []);

  if (ensureEP) {
    tone = ensureEndpoints(tone) || [];
    r = ensureEndpoints(r) || [];
    g = ensureEndpoints(g) || [];
    b = ensureEndpoints(b) || [];
  }

  // Neutral preservation: align per-channel mid-gray to composite or their average
  const hasRGBChannels = (r.length + g.length + b.length) > 0;
  if (neutralPreserve && hasRGBChannels) {
    const mid = 128;
    const tMid = evalCurveAt255(tone, mid);
    const rMid = evalCurveAt255(r, mid) ?? mid;
    const gMid = evalCurveAt255(g, mid) ?? mid;
    const bMid = evalCurveAt255(b, mid) ?? mid;
    const target = (typeof tMid === 'number' ? tMid : (rMid + gMid + bMid) / 3);

    const shift = (pts: CurvePoint[], delta: number): CurvePoint[] => {
      if (!pts || pts.length === 0 || Math.abs(delta) < 1e-6) return pts;
      return pts.map(p => ({ input: p.input, output: clampCurveValue(p.output - delta) }));
    };

    const dR = (rMid ?? mid) - target;
    const dG = (gMid ?? mid) - target;
    const dB = (bMid ?? mid) - target;

    // Only apply a small correction to avoid altering intended looks too much
    const limit = (d: number) => Math.max(-12, Math.min(12, d)); // cap at +/-12 levels
    r = shift(r, limit(dR));
    g = shift(g, limit(dG));
    b = shift(b, limit(dB));

    // Re-ensure endpoints and sort after shifts
    if (ensureEP) {
      r = ensureEndpoints(r) || [];
      g = ensureEndpoints(g) || [];
      b = ensureEndpoints(b) || [];
    }
  }

  return {
    tone_curve: tone.length ? tone : undefined,
    tone_curve_red: r.length ? r : undefined,
    tone_curve_green: g.length ? g : undefined,
    tone_curve_blue: b.length ? b : undefined,
  };
}
