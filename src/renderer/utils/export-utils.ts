// Unified export utility for the frontend
export type ExportType =
  | 'lightroom-preset'
  | 'lightroom-profile'
  | 'capture-one-style';

export type ExportAction = 'download' | 'save-to-folder';

export interface ExportRequest {
  type: ExportType;
  action: ExportAction;
  adjustments: any;
  include?: any;
  recipeName?: string;
  userRating?: number;
}

export interface ExportResponse {
  success: boolean;
  filePath?: string;
  outputPath?: string;
  error?: string;
}

// Unified export function that can replace all individual export handlers
export async function unifiedExport(request: ExportRequest): Promise<ExportResponse> {
  try {
    const response = await (window.electronAPI as any).unifiedExport(request);
    return response;
  } catch (error) {
    console.error('Unified export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed'
    };
  }
}

// Convenience functions for common export operations
export async function downloadLightroomPreset(adjustments: any, recipeName?: string, userRating?: number, includeMasks?: boolean): Promise<ExportResponse> {
  return unifiedExport({
    type: 'lightroom-preset',
    action: 'download',
    adjustments,
    include: {
      basic: true,
      hsl: true,
      colorGrading: true,
      curves: true,
      pointColor: true,
      grain: true,
      vignette: true,
      masks: includeMasks !== false,
      exposure: false,
      sharpenNoise: false,
    },
    recipeName,
    userRating
  });
}

export async function downloadLightroomProfile(adjustments: any, recipeName?: string, userRating?: number): Promise<ExportResponse> {
  return unifiedExport({
    type: 'lightroom-profile',
    action: 'download',
    adjustments,
    include: {
      basic: true,
      hsl: true,
      colorGrading: true,
      curves: true,
      pointColor: true,
      grain: true,
      vignette: true,
      masks: false, // Profiles don't support masks
      exposure: false,
      sharpenNoise: false,
    },
    recipeName,
    userRating
  });
}

export async function downloadCaptureOneStyle(adjustments: any, include?: any, recipeName?: string, userRating?: number, includeMasks?: boolean): Promise<ExportResponse> {
  const finalInclude = include || {
    basic: true,
    hsl: true,
    colorGrading: true,
    curves: true,
    pointColor: true,
    grain: true,
    vignette: true,
    masks: includeMasks !== false,
    exposure: false,
    sharpenNoise: false,
  };

  // Override masks if includeMasks is explicitly provided
  if (includeMasks !== undefined) {
    finalInclude.masks = includeMasks;
  }

  return unifiedExport({
    type: 'capture-one-style',
    action: 'download',
    adjustments,
    include: finalInclude,
    recipeName,
    userRating
  });
}


export async function saveLightroomPresetToFolder(adjustments: any, recipeName?: string, userRating?: number, includeMasks?: boolean): Promise<ExportResponse> {
  return unifiedExport({
    type: 'lightroom-preset',
    action: 'save-to-folder',
    adjustments,
    include: {
      basic: true,
      hsl: true,
      colorGrading: true,
      curves: true,
      pointColor: true,
      grain: true,
      vignette: true,
      masks: includeMasks !== false,
      exposure: false,
      sharpenNoise: false,
    },
    recipeName,
    userRating
  });
}

export async function saveLightroomProfileToFolder(adjustments: any, recipeName?: string, userRating?: number): Promise<ExportResponse> {
  return unifiedExport({
    type: 'lightroom-profile',
    action: 'save-to-folder',
    adjustments,
    include: {
      basic: true,
      hsl: true,
      colorGrading: true,
      curves: true,
      pointColor: true,
      grain: true,
      vignette: true,
      masks: false, // Profiles don't support masks
      exposure: false,
      sharpenNoise: false,
    },
    recipeName,
    userRating
  });
}

export async function saveCaptureOneStyleToFolder(adjustments: any, include?: any, recipeName?: string, userRating?: number, includeMasks?: boolean): Promise<ExportResponse> {
  const finalInclude = include || {
    basic: true,
    hsl: true,
    colorGrading: true,
    curves: true,
    pointColor: true,
    grain: true,
    vignette: true,
    masks: includeMasks !== false,
    exposure: false,
    sharpenNoise: false,
  };

  // Override masks if includeMasks is explicitly provided
  if (includeMasks !== undefined) {
    finalInclude.masks = includeMasks;
  }

  return unifiedExport({
    type: 'capture-one-style',
    action: 'save-to-folder',
    adjustments,
    include: finalInclude,
    recipeName,
    userRating
  });
}

