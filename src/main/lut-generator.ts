import type { AIColorAdjustments } from '../services/types';

export function generateLUTContent(aiAdjustments: AIColorAdjustments, size: number = 33, format: string = 'cube'): string {

  // Sanitize and clamp adjustment values with sensible defaults
  const isNum = (v: any): v is number => typeof v === 'number' && Number.isFinite(v);
  const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));
  const withDefault = (v: any, def: number) => (isNum(v) ? v : def);

  // Extract and normalize ALL adjustments including color grading
  const adjustments = {
    // Basic adjustments
    exposure: clamp(withDefault(aiAdjustments.exposure, 0), -5, 5),
    temperature: clamp(withDefault(aiAdjustments.temperature, 6500), 2000, 50000),
    tint: clamp(withDefault(aiAdjustments.tint, 0), -150, 150),
    contrast: clamp(withDefault(aiAdjustments.contrast, 0), -100, 100) / 100,
    highlights: clamp(withDefault(aiAdjustments.highlights, 0), -100, 100) / 100,
    shadows: clamp(withDefault(aiAdjustments.shadows, 0), -100, 100) / 100,
    whites: clamp(withDefault(aiAdjustments.whites, 0), -100, 100) / 100,
    blacks: clamp(withDefault(aiAdjustments.blacks, 0), -100, 100) / 100,
    vibrance: clamp(withDefault(aiAdjustments.vibrance, 0), -100, 100) / 100,
    saturation: clamp(withDefault(aiAdjustments.saturation, 0), -100, 100) / 100,
    clarity: clamp(withDefault(aiAdjustments.clarity, 0), -100, 100) / 100,

    // Color grading
    shadowHue: clamp(withDefault(aiAdjustments.color_grade_shadow_hue, 0), 0, 360),
    shadowSat: clamp(withDefault(aiAdjustments.color_grade_shadow_sat, 0), 0, 100) / 100,
    shadowLum: clamp(withDefault(aiAdjustments.color_grade_shadow_lum, 0), -100, 100) / 100,
    midtoneHue: clamp(withDefault(aiAdjustments.color_grade_midtone_hue, 0), 0, 360),
    midtoneSat: clamp(withDefault(aiAdjustments.color_grade_midtone_sat, 0), 0, 100) / 100,
    midtoneLum: clamp(withDefault(aiAdjustments.color_grade_midtone_lum, 0), -100, 100) / 100,
    highlightHue: clamp(withDefault(aiAdjustments.color_grade_highlight_hue, 0), 0, 360),
    highlightSat: clamp(withDefault(aiAdjustments.color_grade_highlight_sat, 0), 0, 100) / 100,
    highlightLum: clamp(withDefault(aiAdjustments.color_grade_highlight_lum, 0), -100, 100) / 100,
    globalHue: clamp(withDefault(aiAdjustments.color_grade_global_hue, 0), 0, 360),
    globalSat: clamp(withDefault(aiAdjustments.color_grade_global_sat, 0), 0, 100) / 100,
    globalLum: clamp(withDefault(aiAdjustments.color_grade_global_lum, 0), -100, 100) / 100,
    gradeBlend: clamp(withDefault(aiAdjustments.color_grade_blending, 50), 0, 100) / 100,
    gradeBalance: clamp(withDefault(aiAdjustments.color_grade_balance, 0), -100, 100) / 100,

    // HSL adjustments (Lightroom scale -100..100)
    hue_red: clamp(withDefault(aiAdjustments.hue_red, 0), -100, 100),
    hue_orange: clamp(withDefault(aiAdjustments.hue_orange, 0), -100, 100),
    hue_yellow: clamp(withDefault(aiAdjustments.hue_yellow, 0), -100, 100),
    hue_green: clamp(withDefault(aiAdjustments.hue_green, 0), -100, 100),
    hue_aqua: clamp(withDefault(aiAdjustments.hue_aqua, 0), -100, 100),
    hue_blue: clamp(withDefault(aiAdjustments.hue_blue, 0), -100, 100),
    hue_purple: clamp(withDefault(aiAdjustments.hue_purple, 0), -100, 100),
    hue_magenta: clamp(withDefault(aiAdjustments.hue_magenta, 0), -100, 100),
    sat_red: clamp(withDefault(aiAdjustments.sat_red, 0), -100, 100) / 100,
    sat_orange: clamp(withDefault(aiAdjustments.sat_orange, 0), -100, 100) / 100,
    sat_yellow: clamp(withDefault(aiAdjustments.sat_yellow, 0), -100, 100) / 100,
    sat_green: clamp(withDefault(aiAdjustments.sat_green, 0), -100, 100) / 100,
    sat_aqua: clamp(withDefault(aiAdjustments.sat_aqua, 0), -100, 100) / 100,
    sat_blue: clamp(withDefault(aiAdjustments.sat_blue, 0), -100, 100) / 100,
    sat_purple: clamp(withDefault(aiAdjustments.sat_purple, 0), -100, 100) / 100,
    sat_magenta: clamp(withDefault(aiAdjustments.sat_magenta, 0), -100, 100) / 100,
    lum_red: clamp(withDefault(aiAdjustments.lum_red, 0), -100, 100) / 100,
    lum_orange: clamp(withDefault(aiAdjustments.lum_orange, 0), -100, 100) / 100,
    lum_yellow: clamp(withDefault(aiAdjustments.lum_yellow, 0), -100, 100) / 100,
    lum_green: clamp(withDefault(aiAdjustments.lum_green, 0), -100, 100) / 100,
    lum_aqua: clamp(withDefault(aiAdjustments.lum_aqua, 0), -100, 100) / 100,
    lum_blue: clamp(withDefault(aiAdjustments.lum_blue, 0), -100, 100) / 100,
    lum_purple: clamp(withDefault(aiAdjustments.lum_purple, 0), -100, 100) / 100,
    lum_magenta: clamp(withDefault(aiAdjustments.lum_magenta, 0), -100, 100) / 100,
  } as const;



  // Generate LUT based on format
  if (format === 'cube') {
    return generateCubeLUT(adjustments, size);
  } else if (format === '3dl') {
    return generate3DLLUT(adjustments, size);
  } else if (format === 'lut') {
    return generateDaVinciLUT(adjustments, size);
  } else {
    throw new Error(`Unsupported LUT format: ${format}`);
  }
}

function generateCubeLUT(adjustments: any, size: number): string {
  const description = adjustments.description || 'AI-generated color grading';
  let lut = `# Created by Film Recipe Wizard
# LUT size: ${size}
# Description: ${description}

LUT_3D_SIZE ${size}

`;

  // Generate 3D LUT entries with R fastest, then G, then B (as .cube expects)
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        // Normalize input values to [0,1]
        const inputR = r / (size - 1);
        const inputG = g / (size - 1);
        const inputB = b / (size - 1);

        // Apply color transformations
        const [outputR, outputG, outputB] = applyColorTransform(inputR, inputG, inputB, adjustments);

        // Write LUT entry
        lut += `${outputR.toFixed(6)} ${outputG.toFixed(6)} ${outputB.toFixed(6)}\n`;
      }
    }
  }

  return lut;
}

function generate3DLLUT(adjustments: any, size: number): string {
  let lut = `3DMESH
Mesh ${size} ${size} ${size}

`;

  // Generate 3D LUT entries for Autodesk format
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const inputR = r / (size - 1);
        const inputG = g / (size - 1);
        const inputB = b / (size - 1);

        const [outputR, outputG, outputB] = applyColorTransform(inputR, inputG, inputB, adjustments);

        lut += `${(outputR * 1023).toFixed(0)} ${(outputG * 1023).toFixed(0)} ${(outputB * 1023).toFixed(0)}\n`;
      }
    }
  }

  return lut;
}

function generateDaVinciLUT(adjustments: any, size: number): string {
  let lut = `# Created by Film Recipe Wizard
# DaVinci Resolve LUT
# Size: ${size}x${size}x${size}

`;

  // Generate entries in DaVinci format
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const inputR = r / (size - 1);
        const inputG = g / (size - 1);
        const inputB = b / (size - 1);

        const [outputR, outputG, outputB] = applyColorTransform(inputR, inputG, inputB, adjustments);

        lut += `${outputR.toFixed(6)} ${outputG.toFixed(6)} ${outputB.toFixed(6)}\n`;
      }
    }
  }

  return lut;
}

function applyColorTransform(r: number, g: number, b: number, A: any): [number, number, number] {
  // Per-point transform using AI adjustments. Keep operations gentle to avoid casts.
  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

  let R = r, G = g, B = b;

  // 1) White balance (Temperature + Tint) using Kelvin-to-RGB approximation
  const ref = kelvinToRgb(6500);
  const tgt = kelvinToRgb(A.temperature);
  const wb = [tgt[0] / ref[0], tgt[1] / ref[1], tgt[2] / ref[2]] as const;
  // Tint: positive -> magenta (increase R/B vs G), negative -> green (increase G)
  const tintN = A.tint / 150; // -1..1
  const tintR = 1 + tintN * 0.20;
  const tintG = 1 - tintN * 0.40;
  const tintB = 1 + tintN * 0.20;
  R *= wb[0] * tintR; G *= wb[1] * tintG; B *= wb[2] * tintB;

  // 2) Exposure in stops (map 4 UI units ≈ 1 stop)
  if (Math.abs(A.exposure) > 1e-3) {
    const factor = Math.pow(2, A.exposure * 0.25);
    R *= factor; G *= factor; B *= factor;
  }

  // 3) Basic tone curve: blacks/whites + shadows/highlights + contrast
  const luma = (0.299 * R + 0.587 * G + 0.114 * B);
  const shadowW = 1 - smoothstep(0.25, 0.65, luma);
  const highlightW = smoothstep(0.35, 0.85, luma);

  const toneDelta = (c: number) => {
    let v = c;
    // Blacks/Whites targeted by luma
    v += A.blacks * 0.20 * shadowW + A.whites * 0.20 * highlightW;
    // Shadows/Highlights targeted gently
    v += A.shadows * 0.25 * shadowW + A.highlights * 0.25 * highlightW;
    // Contrast around mid-gray
    const k = 1 + A.contrast * 0.8;
    v = 0.5 + (v - 0.5) * k;
    return v;
  };
  R = toneDelta(R); G = toneDelta(G); B = toneDelta(B);

  // 4) HSL global saturation/vibrance
  let { h, s, l } = rgbToHsl(R, G, B);
  if (Math.abs(A.saturation) > 1e-3 || Math.abs(A.vibrance) > 1e-3) {
    const s1 = s * (1 + A.saturation);
    const vib = 1 + (A.vibrance) * (1 - s);
    s = clamp01(s1 * vib);
  }

  // 5) Per-hue HSL tweaks (Lightroom bands)
  if (
    Math.abs(A.hue_red) + Math.abs(A.hue_orange) + Math.abs(A.hue_yellow) + Math.abs(A.hue_green) +
    Math.abs(A.hue_aqua) + Math.abs(A.hue_blue) + Math.abs(A.hue_purple) + Math.abs(A.hue_magenta) > 1e-3 ||
    Math.abs(A.sat_red) + Math.abs(A.sat_orange) + Math.abs(A.sat_yellow) + Math.abs(A.sat_green) +
    Math.abs(A.sat_aqua) + Math.abs(A.sat_blue) + Math.abs(A.sat_purple) + Math.abs(A.sat_magenta) > 1e-3 ||
    Math.abs(A.lum_red) + Math.abs(A.lum_orange) + Math.abs(A.lum_yellow) + Math.abs(A.lum_green) +
    Math.abs(A.lum_aqua) + Math.abs(A.lum_blue) + Math.abs(A.lum_purple) + Math.abs(A.lum_magenta) > 1e-3
  ) {
    const deg = h * 360;
    const w = hueBandWeights(deg);
    // Map Lightroom [-100..100] to gentle degrees and multipliers
    const hueShiftDeg = (
      w.red * A.hue_red + w.orange * A.hue_orange + w.yellow * A.hue_yellow + w.green * A.hue_green +
      w.aqua * A.hue_aqua + w.blue * A.hue_blue + w.purple * A.hue_purple + w.magenta * A.hue_magenta
    ) * 0.5; // max ~50°
    const satMul = 1 + (
      w.red * A.sat_red + w.orange * A.sat_orange + w.yellow * A.sat_yellow + w.green * A.sat_green +
      w.aqua * A.sat_aqua + w.blue * A.sat_blue + w.purple * A.sat_purple + w.magenta * A.sat_magenta
    ) * 0.6; // max +/-60%
    const lumAdd = (
      w.red * A.lum_red + w.orange * A.lum_orange + w.yellow * A.lum_yellow + w.green * A.lum_green +
      w.aqua * A.lum_aqua + w.blue * A.lum_blue + w.purple * A.lum_purple + w.magenta * A.lum_magenta
    ) * 0.15; // gentle +/-0.15

    h = ((deg + hueShiftDeg + 360) % 360) / 360;
    s = clamp01(s * satMul);
    l = clamp01(l + lumAdd);
  }

  // Recompose after HSL tweaks
  [R, G, B] = hslToRgb(h, s, l);

  // 6) Three-way color grading (shadows/mids/highs + global)
  if (A.shadowSat > 1e-3 || A.midtoneSat > 1e-3 || A.highlightSat > 1e-3 || A.globalSat > 1e-3) {
    const L = (0.299 * R + 0.587 * G + 0.114 * B);
    const balance = A.gradeBalance; // -1 shadows, +1 highlights preference
    const blend = A.gradeBlend; // 0..1

    const wS = clamp01((1 - smoothstep(0.2 - 0.3 * balance, 0.6, L)) * (1 - blend) + (1 - L) * blend);
    const wH = clamp01(smoothstep(0.3, 0.8 + 0.3 * balance, L) * (1 - blend) + L * blend);
    const wM = clamp01(1 - Math.max(wS, wH));

    const applyWheel = (w: number, hueDeg: number, sat: number, lum: number) => {
      if (w < 1e-3 || sat < 1e-3) return;
      const color = hslToRgb(((hueDeg % 360 + 360) % 360) / 360, sat, 0.5);
      const t = w * sat * 0.5; // gentle blend
      R = R * (1 - t) + color[0] * t;
      G = G * (1 - t) + color[1] * t;
      B = B * (1 - t) + color[2] * t;
      const lumT = w * lum * 0.20; // small luminance offset
      R += lumT; G += lumT; B += lumT;
    };

    applyWheel(wS, A.shadowHue, A.shadowSat, A.shadowLum);
    applyWheel(wM, A.midtoneHue, A.midtoneSat, A.midtoneLum);
    applyWheel(wH, A.highlightHue, A.highlightSat, A.highlightLum);

    // Global wheel last
    if (A.globalSat > 1e-3) {
      const color = hslToRgb(((A.globalHue % 360 + 360) % 360) / 360, A.globalSat, 0.5);
      const t = A.globalSat * 0.25;
      R = R * (1 - t) + color[0] * t;
      G = G * (1 - t) + color[1] * t;
      B = B * (1 - t) + color[2] * t;
      const lumT = A.globalLum * 0.15;
      R += lumT; G += lumT; B += lumT;
    }
  }

  // Final clamp
  R = clamp01(R); G = clamp01(G); B = clamp01(B);
  return [R, G, B];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [r, g, b];
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h, s, l };
}

// Smooth Hermite interpolation
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Approximate CCT (Kelvin) to normalized RGB multipliers (D65 referenced)
function kelvinToRgb(kelvin: number): [number, number, number] {
  const temp = Math.max(1000, Math.min(40000, kelvin)) / 100;
  let r: number, g: number, b: number;
  // Red
  r = temp <= 66 ? 255 : 329.698727446 * Math.pow(temp - 60, -0.1332047592);
  // Green
  g = temp <= 66 ? 99.4708025861 * Math.log(temp) - 161.1195681661 : 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
  // Blue
  if (temp >= 66) b = 255; else if (temp <= 19) b = 0; else b = 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return [r / 255, g / 255, b / 255];
}

// Compute soft membership weights for 8 Lightroom HSL bands
function hueBandWeights(hDeg: number): { red: number; orange: number; yellow: number; green: number; aqua: number; blue: number; purple: number; magenta: number } {
  const wrap = (x: number) => (x % 360 + 360) % 360;
  const tri = (x: number, c: number, w: number) => {
    const d = Math.abs(wrap(x - c));
    const v = 1 - Math.min(1, d / w);
    return Math.max(0, v);
  };
  // Centers and half-widths approximating Lightroom bands
  const weights = {
    red: tri(hDeg, 0, 25) + tri(hDeg, 360, 25),
    orange: tri(hDeg, 30, 25),
    yellow: tri(hDeg, 60, 25),
    green: tri(hDeg, 120, 35),
    aqua: tri(hDeg, 180, 25),
    blue: tri(hDeg, 220, 30),
    purple: tri(hDeg, 280, 25),
    magenta: tri(hDeg, 320, 25),
  } as any;
  // Normalize so sum<=1 (softmax-like)
  const sum = (Object.values(weights) as number[]).reduce((a: number, v: number) => a + v, 0) || 1;
  for (const k of Object.keys(weights)) weights[k] /= sum;
  return weights as any;
}
