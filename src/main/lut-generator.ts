import { AIColorAdjustments } from '../services/openai-color-analyzer';

export function generateLUTContent(aiAdjustments: AIColorAdjustments, size: number = 33, format: string = 'cube'): string {
  console.log('[LUT] Generating LUT content:', { size, format, hasAdjustments: !!aiAdjustments });

  // Sanitize and clamp adjustment values with sensible defaults
  const isNum = (v: any): v is number => typeof v === 'number' && Number.isFinite(v);
  const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));
  const withDefault = (v: any, def: number) => (isNum(v) ? v : def);

  // Extract and normalize key adjustments
  const adjustments = {
    // Defaults mirror neutral processing so LUT doesn't tint unexpectedly
    exposure: clamp(withDefault(aiAdjustments.exposure, 0), -5, 5),
    // Use D65 (6500K) as neutral baseline
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
  let lut = `# Created by FotoRecipeWizard
# LUT size: ${size}
# Description: AI-generated color grading

LUT_3D_SIZE ${size}

`;

  // Generate 3D LUT entries
  for (let r = 0; r < size; r++) {
    for (let g = 0; g < size; g++) {
      for (let b = 0; b < size; b++) {
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
  for (let r = 0; r < size; r++) {
    for (let g = 0; g < size; g++) {
      for (let b = 0; b < size; b++) {
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
  let lut = `# Created by FotoRecipeWizard
# DaVinci Resolve LUT
# Size: ${size}x${size}x${size}

`;

  // Generate entries in DaVinci format
  for (let r = 0; r < size; r++) {
    for (let g = 0; g < size; g++) {
      for (let b = 0; b < size; b++) {
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

function applyColorTransform(r: number, g: number, b: number, adjustments: any): [number, number, number] {
  let newR = r;
  let newG = g;
  let newB = b;

  // Apply white balance (temperature and tint) first
  if (adjustments.temperature !== 6500 || adjustments.tint !== 0) {
    // Convert temperature to color temperature multipliers
    // Simplified approximation - cooler temps increase blue, warmer increase red/yellow
    // Clamp normalization to [-1, 1] to avoid extreme color casts
    // Normalize around 6500K; divide by 3000 for a gentler slope
    const tempNormalized = Math.max(-1, Math.min(1, (adjustments.temperature - 6500) / 3000));
    const tintNormalized = Math.max(-1, Math.min(1, adjustments.tint / 150));

    // Apply temperature correction (simplified)
    if (tempNormalized < 0) {
      // Cooler - reduce red, increase blue
      newR *= 1 + tempNormalized * 0.2;
      newB *= 1 - tempNormalized * 0.1;
    } else {
      // Warmer - increase red/yellow, reduce blue
      newR *= 1 + tempNormalized * 0.1;
      newG *= 1 + tempNormalized * 0.05;
      newB *= 1 - tempNormalized * 0.1;
    }

    // Apply tint correction (green-magenta)
    if (tintNormalized > 0) {
      // More magenta
      newR *= 1 + tintNormalized * 0.05;
      newB *= 1 + tintNormalized * 0.05;
      newG *= 1 - tintNormalized * 0.05;
    } else {
      // More green
      newG *= 1 - tintNormalized * 0.05;
    }
  }

  // Apply exposure adjustment
  if (adjustments.exposure !== 0) {
    const exposureFactor = Math.pow(2, adjustments.exposure);
    newR *= exposureFactor;
    newG *= exposureFactor;
    newB *= exposureFactor;
  }

  // Apply contrast adjustment (fixed power curve)
  if (adjustments.contrast !== 0) {
    const contrast = adjustments.contrast > 0 ? 1 + adjustments.contrast : 1 / (1 - adjustments.contrast);
    newR = Math.pow(Math.max(0, newR), contrast);
    newG = Math.pow(Math.max(0, newG), contrast);
    newB = Math.pow(Math.max(0, newB), contrast);
  }

  // Apply highlight/shadow adjustments (improved)
  const luminance = 0.299 * newR + 0.587 * newG + 0.114 * newB;

  if (adjustments.highlights !== 0 && luminance > 0.5) {
    const highlightMask = Math.pow((luminance - 0.5) * 2, 2); // Smooth curve for highlights
    const factor = 1 + adjustments.highlights * highlightMask * 0.5;
    newR *= factor;
    newG *= factor;
    newB *= factor;
  }

  if (adjustments.shadows !== 0 && luminance < 0.5) {
    const shadowMask = Math.pow((0.5 - luminance) * 2, 2); // Smooth curve for shadows
    const factor = 1 + adjustments.shadows * shadowMask * 0.5;
    newR *= factor;
    newG *= factor;
    newB *= factor;
  }

  // Apply saturation
  if (adjustments.saturation !== 0) {
    const satFactor = 1 + adjustments.saturation;
    const gray = 0.299 * newR + 0.587 * newG + 0.114 * newB;
    newR = gray + (newR - gray) * satFactor;
    newG = gray + (newG - gray) * satFactor;
    newB = gray + (newB - gray) * satFactor;
  }

  // Apply vibrance (fixed calculation)
  if (adjustments.vibrance !== 0) {
    const gray = 0.299 * newR + 0.587 * newG + 0.114 * newB;
    const maxChannel = Math.max(newR, newG, newB);
    const minChannel = Math.min(newR, newG, newB);
    const currentSaturation = maxChannel > 0 ? (maxChannel - minChannel) / maxChannel : 0;

    // Vibrance affects less saturated colors more
    const vibranceEffect = (1 - currentSaturation) * adjustments.vibrance * 0.5;
    const vibFactor = 1 + vibranceEffect;

    newR = gray + (newR - gray) * vibFactor;
    newG = gray + (newG - gray) * vibFactor;
    newB = gray + (newB - gray) * vibFactor;
  }

  // Clamp values to valid range
  newR = Math.max(0, Math.min(1, newR));
  newG = Math.max(0, Math.min(1, newG));
  newB = Math.max(0, Math.min(1, newB));

  return [newR, newG, newB];
}
