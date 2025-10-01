// Unified export utility for the frontend
export type ExportType = 
  | 'lightroom-preset' 
  | 'lightroom-profile' 
  | 'capture-one-style' 
  | 'capture-one-basic-style';

export type ExportAction = 'download' | 'save-to-folder';

export interface ExportRequest {
  type: ExportType;
  action: ExportAction;
  adjustments: any;
  include?: any;
  recipeName?: string;
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
export async function downloadLightroomPreset(adjustments: any, recipeName?: string): Promise<ExportResponse> {
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
      masks: true,
      exposure: false,
      sharpenNoise: false,
    },
    recipeName
  });
}

export async function downloadLightroomProfile(adjustments: any, recipeName?: string): Promise<ExportResponse> {
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
      masks: true,
      exposure: false,
      sharpenNoise: false,
    },
    recipeName
  });
}

export async function downloadCaptureOneStyle(adjustments: any, include?: any, recipeName?: string): Promise<ExportResponse> {
  return unifiedExport({
    type: 'capture-one-style',
    action: 'download',
    adjustments,
    include: include || {
      basic: true,
      hsl: true,
      colorGrading: true,
      curves: true,
      pointColor: true,
      grain: true,
      vignette: true,
      masks: true,
      exposure: false,
      sharpenNoise: false,
    },
    recipeName
  });
}

export async function downloadCaptureOneBasicStyle(adjustments: any, include?: any, recipeName?: string): Promise<ExportResponse> {
  return unifiedExport({
    type: 'capture-one-basic-style',
    action: 'download',
    adjustments,
    include: include || {
      basic: true,
      hsl: true,
      colorGrading: true,
      curves: true,
      pointColor: true,
      grain: true,
      vignette: true,
      masks: true,
      exposure: false,
      sharpenNoise: false,
    },
    recipeName
  });
}

export async function saveLightroomPresetToFolder(adjustments: any, recipeName?: string): Promise<ExportResponse> {
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
      masks: true,
      exposure: false,
      sharpenNoise: false,
    },
    recipeName
  });
}

export async function saveLightroomProfileToFolder(adjustments: any, recipeName?: string): Promise<ExportResponse> {
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
      masks: true,
      exposure: false,
      sharpenNoise: false,
    },
    recipeName
  });
}

export async function saveCaptureOneStyleToFolder(adjustments: any, include?: any, recipeName?: string): Promise<ExportResponse> {
  return unifiedExport({
    type: 'capture-one-style',
    action: 'save-to-folder',
    adjustments,
    include: include || {
      basic: true,
      hsl: true,
      colorGrading: true,
      curves: true,
      pointColor: true,
      grain: true,
      vignette: true,
      masks: true,
      exposure: false,
      sharpenNoise: false,
    },
    recipeName
  });
}

export async function saveCaptureOneBasicStyleToFolder(adjustments: any, include?: any, recipeName?: string): Promise<ExportResponse> {
  return unifiedExport({
    type: 'capture-one-basic-style',
    action: 'save-to-folder',
    adjustments,
    include: include || {
      basic: true,
      hsl: true,
      colorGrading: true,
      curves: true,
      pointColor: true,
      grain: true,
      vignette: true,
      masks: true,
      exposure: false,
      sharpenNoise: false,
    },
    recipeName
  });
}
