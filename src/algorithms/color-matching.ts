export interface ColorSpace {
  r: number;
  g: number;
  b: number;
}

export interface LABColor {
  l: number;
  a: number;
  b: number;
}

export interface HSVColor {
  h: number;
  s: number;
  v: number;
}

export class ColorMatcher {
  /**
   * Convert RGB to LAB color space for better color matching
   */
  static rgbToLab(rgb: ColorSpace): LABColor {
    // First convert RGB to XYZ
    let { r, g, b } = rgb;
    r = r / 255;
    g = g / 255;
    b = b / 255;

    // Apply gamma correction
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    // Observer = 2°, Illuminant = D65
    let x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
    let y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
    let z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;

    // Normalize by D65 illuminant
    x = (x / 0.95047) * 100;
    y = (y / 1.00000) * 100;
    z = (z / 1.08883) * 100;

    // Convert XYZ to LAB
    x = x > 8.856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
    y = y > 8.856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
    z = z > 8.856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);

    const l = 116 * y - 16;
    const a = 500 * (x - y);
    const b_lab = 200 * (y - z);

    return { l, a, b: b_lab };
  }

  /**
   * Convert RGB to HSV color space
   */
  static rgbToHsv(rgb: ColorSpace): HSVColor {
    let { r, g, b } = rgb;
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    let s = max === 0 ? 0 : diff / max;
    let v = max;

    if (diff !== 0) {
      switch (max) {
        case r:
          h = ((g - b) / diff) % 6;
          break;
        case g:
          h = (b - r) / diff + 2;
          break;
        case b:
          h = (r - g) / diff + 4;
          break;
      }
      h = Math.round(h * 60);
      if (h < 0) h += 360;
    }

    return { h, s: s * 100, v: v * 100 };
  }

  /**
   * Calculate color difference using Delta E 2000 formula
   */
  static deltaE2000(lab1: LABColor, lab2: LABColor): number {
    const kL = 1;
    const kC = 1;
    const kH = 1;

    const { l: l1, a: a1, b: b1 } = lab1;
    const { l: l2, a: a2, b: b2 } = lab2;

    const c1 = Math.sqrt(a1 * a1 + b1 * b1);
    const c2 = Math.sqrt(a2 * a2 + b2 * b2);
    const cBar = (c1 + c2) / 2;

    const g = 0.5 * (1 - Math.sqrt(Math.pow(cBar, 7) / (Math.pow(cBar, 7) + Math.pow(25, 7))));
    const a1Prime = a1 * (1 + g);
    const a2Prime = a2 * (1 + g);

    const c1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1);
    const c2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2);

    let h1Prime = Math.atan2(b1, a1Prime) * 180 / Math.PI;
    if (h1Prime < 0) h1Prime += 360;

    let h2Prime = Math.atan2(b2, a2Prime) * 180 / Math.PI;
    if (h2Prime < 0) h2Prime += 360;

    const deltaLPrime = l2 - l1;
    const deltaCPrime = c2Prime - c1Prime;

    let deltaHPrime = 0;
    if (c1Prime * c2Prime !== 0) {
      if (Math.abs(h2Prime - h1Prime) <= 180) {
        deltaHPrime = h2Prime - h1Prime;
      } else if (h2Prime - h1Prime > 180) {
        deltaHPrime = h2Prime - h1Prime - 360;
      } else {
        deltaHPrime = h2Prime - h1Prime + 360;
      }
    }

    const deltaH = 2 * Math.sqrt(c1Prime * c2Prime) * Math.sin((deltaHPrime * Math.PI / 180) / 2);

    const lBarPrime = (l1 + l2) / 2;
    const cBarPrime = (c1Prime + c2Prime) / 2;

    let hBarPrime = 0;
    if (c1Prime * c2Prime !== 0) {
      if (Math.abs(h1Prime - h2Prime) <= 180) {
        hBarPrime = (h1Prime + h2Prime) / 2;
      } else if (Math.abs(h1Prime - h2Prime) > 180 && (h1Prime + h2Prime) < 360) {
        hBarPrime = (h1Prime + h2Prime + 360) / 2;
      } else {
        hBarPrime = (h1Prime + h2Prime - 360) / 2;
      }
    }

    const t = 1 - 0.17 * Math.cos((hBarPrime - 30) * Math.PI / 180) +
              0.24 * Math.cos(2 * hBarPrime * Math.PI / 180) +
              0.32 * Math.cos((3 * hBarPrime + 6) * Math.PI / 180) -
              0.20 * Math.cos((4 * hBarPrime - 63) * Math.PI / 180);

    const deltaTheta = 30 * Math.exp(-Math.pow((hBarPrime - 275) / 25, 2));
    const rc = 2 * Math.sqrt(Math.pow(cBarPrime, 7) / (Math.pow(cBarPrime, 7) + Math.pow(25, 7)));
    const sl = 1 + (0.015 * Math.pow(lBarPrime - 50, 2)) / Math.sqrt(20 + Math.pow(lBarPrime - 50, 2));
    const sc = 1 + 0.045 * cBarPrime;
    const sh = 1 + 0.015 * cBarPrime * t;
    const rt = -Math.sin(2 * deltaTheta * Math.PI / 180) * rc;

    return Math.sqrt(
      Math.pow(deltaLPrime / (kL * sl), 2) +
      Math.pow(deltaCPrime / (kC * sc), 2) +
      Math.pow(deltaH / (kH * sh), 2) +
      rt * (deltaCPrime / (kC * sc)) * (deltaH / (kH * sh))
    );
  }

  /**
   * Match histogram distribution between two images
   */
  static matchHistogram(sourceHist: number[], targetHist: number[]): number[] {
    // Calculate cumulative distribution functions
    const sourceCDF = this.calculateCDF(sourceHist);
    const targetCDF = this.calculateCDF(targetHist);

    // Create lookup table for histogram matching
    const lut = new Array(256);
    for (let i = 0; i < 256; i++) {
      let bestMatch = 0;
      let minDiff = Math.abs(sourceCDF[i] - targetCDF[0]);
      
      for (let j = 1; j < 256; j++) {
        const diff = Math.abs(sourceCDF[i] - targetCDF[j]);
        if (diff < minDiff) {
          minDiff = diff;
          bestMatch = j;
        }
      }
      lut[i] = bestMatch;
    }

    return lut;
  }

  /**
   * Calculate cumulative distribution function from histogram
   */
  private static calculateCDF(histogram: number[]): number[] {
    const cdf = new Array(256);
    const total = histogram.reduce((sum, val) => sum + val, 0);
    
    if (total === 0) {
      return histogram.map(() => 0);
    }

    let cumulative = 0;
    for (let i = 0; i < 256; i++) {
      cumulative += histogram[i];
      cdf[i] = cumulative / total;
    }

    return cdf;
  }

  /**
   * Apply color correction based on reference image
   */
  static calculateColorCorrection(
    sourceAvg: ColorSpace,
    targetAvg: ColorSpace
  ): { gain: ColorSpace; offset: ColorSpace } {
    // Calculate gain factors
    const gain: ColorSpace = {
      r: targetAvg.r > 0 ? sourceAvg.r / targetAvg.r : 1,
      g: targetAvg.g > 0 ? sourceAvg.g / targetAvg.g : 1,
      b: targetAvg.b > 0 ? sourceAvg.b / targetAvg.b : 1,
    };

    // Clamp gain values to reasonable range
    gain.r = Math.max(0.1, Math.min(10, gain.r));
    gain.g = Math.max(0.1, Math.min(10, gain.g));
    gain.b = Math.max(0.1, Math.min(10, gain.b));

    // Calculate offset (currently zero, but could be expanded)
    const offset: ColorSpace = { r: 0, g: 0, b: 0 };

    return { gain, offset };
  }

  /**
   * Calculate color temperature from RGB values
   */
  static calculateColorTemperature(rgb: ColorSpace): number {
    // Convert to chromaticity coordinates
    const sum = rgb.r + rgb.g + rgb.b;
    if (sum === 0) return 6500; // Default daylight temperature

    const x = rgb.r / sum;
    const y = rgb.g / sum;

    // McCamy's approximation for CCT calculation
    const n = (x - 0.3320) / (0.1858 - y);
    const cct = 449 * Math.pow(n, 3) + 3525 * Math.pow(n, 2) + 6823.3 * n + 5520.33;

    // Clamp to reasonable range
    return Math.max(1000, Math.min(25000, Math.round(cct)));
  }

  /**
   * Analyze color balance and suggest corrections
   */
  static analyzeColorBalance(dominantColors: Array<{ color: ColorSpace; percentage: number }>): {
    temperature: number;
    tint: number;
    colorCast: string;
  } {
    if (dominantColors.length === 0) {
      return { temperature: 6500, tint: 0, colorCast: 'neutral' };
    }

    // Weight average by color dominance
    let weightedR = 0, weightedG = 0, weightedB = 0, totalWeight = 0;

    dominantColors.forEach(({ color, percentage }) => {
      const weight = percentage / 100;
      weightedR += color.r * weight;
      weightedG += color.g * weight;
      weightedB += color.b * weight;
      totalWeight += weight;
    });

    if (totalWeight > 0) {
      weightedR /= totalWeight;
      weightedG /= totalWeight;
      weightedB /= totalWeight;
    }

    const avgColor = { r: weightedR, g: weightedG, b: weightedB };
    const temperature = this.calculateColorTemperature(avgColor);

    // Calculate tint (magenta-green shift)
    const tint = ((weightedR + weightedB) / 2 - weightedG) / 2.55;

    // Determine color cast
    let colorCast = 'neutral';
    if (Math.abs(tint) > 10) {
      colorCast = tint > 0 ? 'magenta' : 'green';
    } else if (temperature < 3000) {
      colorCast = 'warm';
    } else if (temperature > 8000) {
      colorCast = 'cool';
    }

    return {
      temperature: Math.round(temperature),
      tint: Math.round(tint),
      colorCast,
    };
  }
}