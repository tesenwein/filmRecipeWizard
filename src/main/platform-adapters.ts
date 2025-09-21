import { AIColorAdjustments } from '../services/types';

export type PlatformType = 'lightroom' | 'capture-one';

export interface PlatformCapabilities {
  supportsAdvancedMasks: boolean;
  supportsCameraProfiles: boolean;
  supportsGrain: boolean;
  supportsVignette: boolean;
  supportsColorGrading: boolean;
  supportsHSL: boolean;
  supportsPointColor: boolean;
  supportsCurves: boolean;
  maskTypes: string[];
  cameraProfiles: string[];
  grainImplementation: 'lightroom' | 'capture-one' | 'none';
}

export interface PlatformAdjustments {
  // Common adjustments that work on both platforms
  exposure?: number;
  contrast?: number;
  saturation?: number;
  vibrance?: number;
  temperature?: number;
  tint?: number;
  highlights?: number;
  shadows?: number;
  whites?: number;
  blacks?: number;
  clarity?: number;
  
  // Platform-specific adjustments
  platformSpecific?: {
    lightroom?: LightroomSpecificAdjustments;
    captureOne?: CaptureOneSpecificAdjustments;
  };
}

export interface LightroomSpecificAdjustments {
  // Lightroom-specific features
  cameraProfile?: string;
  treatment?: 'color' | 'black_and_white';
  monochrome?: boolean;
  
  // Lightroom grain
  grainAmount?: number;
  grainSize?: number;
  grainRoughness?: number;
  
  // Lightroom vignette
  vignetteAmount?: number;
  vignetteMidpoint?: number;
  vignetteRoundness?: number;
  vignetteFeather?: number;
  
  // Lightroom color grading
  colorGrading?: {
    shadows?: { hue?: number; saturation?: number; lightness?: number };
    midtones?: { hue?: number; saturation?: number; lightness?: number };
    highlights?: { hue?: number; saturation?: number; lightness?: number };
  };
  
  // Lightroom HSL
  hsl?: {
    red?: { hue?: number; saturation?: number; lightness?: number };
    orange?: { hue?: number; saturation?: number; lightness?: number };
    yellow?: { hue?: number; saturation?: number; lightness?: number };
    green?: { hue?: number; saturation?: number; lightness?: number };
    aqua?: { hue?: number; saturation?: number; lightness?: number };
    blue?: { hue?: number; saturation?: number; lightness?: number };
    purple?: { hue?: number; saturation?: number; lightness?: number };
    magenta?: { hue?: number; saturation?: number; lightness?: number };
  };
  
  // Lightroom masks
  masks?: Array<{
    type: string;
    enabled: boolean;
    adjustments: any;
  }>;
}

export interface CaptureOneSpecificAdjustments {
  // Capture One-specific features
  structure?: number;
  
  // Capture One grain (different implementation)
  grain?: {
    amount?: number;
    size?: number;
    roughness?: number;
  };
  
  // Capture One vignette (different parameters)
  vignette?: {
    amount?: number;
    midpoint?: number;
    roundness?: number;
    feather?: number;
  };
  
  // Capture One color grading (similar but different structure)
  colorGrading?: {
    shadows?: { hue?: number; saturation?: number; lightness?: number };
    midtones?: { hue?: number; saturation?: number; lightness?: number };
    highlights?: { hue?: number; saturation?: number; lightness?: number };
  };
  
  // Capture One HSL (similar structure)
  hsl?: {
    red?: { hue?: number; saturation?: number; lightness?: number };
    orange?: { hue?: number; saturation?: number; lightness?: number };
    yellow?: { hue?: number; saturation?: number; lightness?: number };
    green?: { hue?: number; saturation?: number; lightness?: number };
    aqua?: { hue?: number; saturation?: number; lightness?: number };
    blue?: { hue?: number; saturation?: number; lightness?: number };
    purple?: { hue?: number; saturation?: number; lightness?: number };
    magenta?: { hue?: number; saturation?: number; lightness?: number };
  };
  
  // Capture One masks (different types and structure)
  masks?: Array<{
    type: string;
    enabled: boolean;
    adjustments: any;
  }>;
}

export class PlatformAdapter {
  private static capabilities: Record<PlatformType, PlatformCapabilities> = {
    lightroom: {
      supportsAdvancedMasks: true,
      supportsCameraProfiles: true,
      supportsGrain: true,
      supportsVignette: true,
      supportsColorGrading: true,
      supportsHSL: true,
      supportsPointColor: true,
      supportsCurves: true,
      maskTypes: ['subject', 'sky', 'background', 'person', 'face', 'landscape'],
      cameraProfiles: ['Adobe Color', 'Adobe Portrait', 'Adobe Landscape', 'Adobe Monochrome', 'Flat Profile'],
      grainImplementation: 'lightroom',
    },
  'capture-one': {
    supportsAdvancedMasks: true,
    supportsCameraProfiles: false, // Uses ICC profiles instead
    supportsGrain: true,
    supportsVignette: true,
    supportsColorGrading: true,
    supportsHSL: true,
    supportsPointColor: false, // Not directly supported
    supportsCurves: false, // Different curve implementation
    maskTypes: ['subject', 'sky', 'background', 'person', 'face', 'landscape', 'brush', 'gradient'],
    cameraProfiles: [], // ICC profiles instead
    grainImplementation: 'capture-one',
  },
  };

  static getCapabilities(platform: PlatformType): PlatformCapabilities {
    return this.capabilities[platform];
  }

  static convertAIAdjustmentsToPlatform(
    aiAdjustments: AIColorAdjustments,
    platform: PlatformType
  ): PlatformAdjustments {
    const capabilities = this.getCapabilities(platform);
    const adjustments: PlatformAdjustments = {};

    // Convert common adjustments
    if (aiAdjustments.exposure !== undefined) {
      const clamped = this.clamp(aiAdjustments.exposure, -5, 5);
      if (clamped !== undefined) adjustments.exposure = clamped;
    }
    if (aiAdjustments.contrast !== undefined) {
      const clamped = this.clamp(aiAdjustments.contrast, -100, 100);
      if (clamped !== undefined) adjustments.contrast = clamped;
    }
    if (aiAdjustments.saturation !== undefined) {
      const clamped = this.clamp(aiAdjustments.saturation, -100, 100);
      if (clamped !== undefined) adjustments.saturation = clamped;
    }
    if (aiAdjustments.vibrance !== undefined) {
      const clamped = this.clamp(aiAdjustments.vibrance, -100, 100);
      if (clamped !== undefined) adjustments.vibrance = clamped;
    }
    // White balance - these properties don't exist in AIColorAdjustments, skip for now
    // if (aiAdjustments.temperature !== undefined) {
    //   adjustments.temperature = this.clamp(aiAdjustments.temperature, -50, 50);
    // }
    // if (aiAdjustments.tint !== undefined) {
    //   adjustments.tint = this.clamp(aiAdjustments.tint, -50, 50);
    // }
    if (aiAdjustments.highlights !== undefined) {
      const clamped = this.clamp(aiAdjustments.highlights, -100, 100);
      if (clamped !== undefined) adjustments.highlights = clamped;
    }
    if (aiAdjustments.shadows !== undefined) {
      const clamped = this.clamp(aiAdjustments.shadows, -100, 100);
      if (clamped !== undefined) adjustments.shadows = clamped;
    }
    if (aiAdjustments.whites !== undefined) {
      const clamped = this.clamp(aiAdjustments.whites, -100, 100);
      if (clamped !== undefined) adjustments.whites = clamped;
    }
    if (aiAdjustments.blacks !== undefined) {
      const clamped = this.clamp(aiAdjustments.blacks, -100, 100);
      if (clamped !== undefined) adjustments.blacks = clamped;
    }
    if (aiAdjustments.clarity !== undefined) {
      const clamped = this.clamp(aiAdjustments.clarity, -100, 100);
      if (clamped !== undefined) adjustments.clarity = clamped;
    }

    // Convert platform-specific adjustments
    adjustments.platformSpecific = {};
    
    if (platform === 'lightroom') {
      adjustments.platformSpecific.lightroom = this.convertToLightroomSpecific(aiAdjustments, capabilities);
    } else if (platform === 'capture-one') {
      adjustments.platformSpecific.captureOne = this.convertToCaptureOneSpecific(aiAdjustments, capabilities);
    }

    return adjustments;
  }

  private static convertToLightroomSpecific(
    aiAdjustments: AIColorAdjustments,
    capabilities: PlatformCapabilities
  ): LightroomSpecificAdjustments {
    const lightroom: LightroomSpecificAdjustments = {};

    // Camera profile
    if (capabilities.supportsCameraProfiles) {
      lightroom.cameraProfile = this.normalizeCameraProfile(aiAdjustments.camera_profile);
      lightroom.treatment = aiAdjustments.treatment;
      lightroom.monochrome = aiAdjustments.monochrome;
    }

    // Grain (Lightroom implementation)
    if (capabilities.supportsGrain && capabilities.grainImplementation === 'lightroom') {
      if (aiAdjustments.grain_amount !== undefined) {
        lightroom.grainAmount = this.clamp(aiAdjustments.grain_amount, 0, 100);
      }
      if (aiAdjustments.grain_size !== undefined) {
        lightroom.grainSize = this.clamp(aiAdjustments.grain_size, 0, 100);
      }
      if (aiAdjustments.grain_frequency !== undefined) {
        lightroom.grainRoughness = this.clamp(aiAdjustments.grain_frequency, 0, 100);
      }
    }

    // Vignette
    if (capabilities.supportsVignette) {
      if (aiAdjustments.vignette_amount !== undefined) {
        lightroom.vignetteAmount = this.clamp(aiAdjustments.vignette_amount, -100, 100);
      }
      if (aiAdjustments.vignette_midpoint !== undefined) {
        lightroom.vignetteMidpoint = this.clamp(aiAdjustments.vignette_midpoint, 0, 100);
      }
      if (aiAdjustments.vignette_roundness !== undefined) {
        lightroom.vignetteRoundness = this.clamp(aiAdjustments.vignette_roundness, -100, 100);
      }
      if (aiAdjustments.vignette_feather !== undefined) {
        lightroom.vignetteFeather = this.clamp(aiAdjustments.vignette_feather, 0, 100);
      }
    }

    // Color grading
    if (capabilities.supportsColorGrading) {
      lightroom.colorGrading = {};
      if (aiAdjustments.color_grade_shadow_hue !== undefined || 
          aiAdjustments.color_grade_shadow_sat !== undefined || 
          aiAdjustments.color_grade_shadow_lum !== undefined) {
        lightroom.colorGrading.shadows = {
          hue: aiAdjustments.color_grade_shadow_hue !== undefined ? this.clamp(aiAdjustments.color_grade_shadow_hue, 0, 360) : undefined,
          saturation: aiAdjustments.color_grade_shadow_sat !== undefined ? this.clamp(aiAdjustments.color_grade_shadow_sat, 0, 100) : undefined,
          lightness: aiAdjustments.color_grade_shadow_lum !== undefined ? this.clamp(aiAdjustments.color_grade_shadow_lum, -100, 100) : undefined,
        };
      }
      if (aiAdjustments.color_grade_midtone_hue !== undefined || 
          aiAdjustments.color_grade_midtone_sat !== undefined || 
          aiAdjustments.color_grade_midtone_lum !== undefined) {
        lightroom.colorGrading.midtones = {
          hue: aiAdjustments.color_grade_midtone_hue !== undefined ? this.clamp(aiAdjustments.color_grade_midtone_hue, 0, 360) : undefined,
          saturation: aiAdjustments.color_grade_midtone_sat !== undefined ? this.clamp(aiAdjustments.color_grade_midtone_sat, 0, 100) : undefined,
          lightness: aiAdjustments.color_grade_midtone_lum !== undefined ? this.clamp(aiAdjustments.color_grade_midtone_lum, -100, 100) : undefined,
        };
      }
      if (aiAdjustments.color_grade_highlight_hue !== undefined || 
          aiAdjustments.color_grade_highlight_sat !== undefined || 
          aiAdjustments.color_grade_highlight_lum !== undefined) {
        lightroom.colorGrading.highlights = {
          hue: aiAdjustments.color_grade_highlight_hue !== undefined ? this.clamp(aiAdjustments.color_grade_highlight_hue, 0, 360) : undefined,
          saturation: aiAdjustments.color_grade_highlight_sat !== undefined ? this.clamp(aiAdjustments.color_grade_highlight_sat, 0, 100) : undefined,
          lightness: aiAdjustments.color_grade_highlight_lum !== undefined ? this.clamp(aiAdjustments.color_grade_highlight_lum, -100, 100) : undefined,
        };
      }
    }

    // HSL
    if (capabilities.supportsHSL) {
      lightroom.hsl = this.convertHSLAdjustments(aiAdjustments);
    }

    // Masks
    if (capabilities.supportsAdvancedMasks && Array.isArray((aiAdjustments as any).masks)) {
      lightroom.masks = this.convertMasks((aiAdjustments as any).masks, capabilities.maskTypes);
    }

    return lightroom;
  }

  private static convertToCaptureOneSpecific(
    aiAdjustments: AIColorAdjustments,
    capabilities: PlatformCapabilities
  ): CaptureOneSpecificAdjustments {
    const captureOne: CaptureOneSpecificAdjustments = {};

    // Structure (Capture One specific) - this property doesn't exist in AIColorAdjustments, skip for now
    // if (aiAdjustments.structure !== undefined) {
    //   captureOne.structure = this.clamp(aiAdjustments.structure, -100, 100);
    // }

    // Grain (Capture One implementation)
    if (capabilities.supportsGrain && capabilities.grainImplementation === 'capture-one') {
      captureOne.grain = {};
      if (aiAdjustments.grain_amount !== undefined) {
        captureOne.grain.amount = this.clamp(aiAdjustments.grain_amount, 0, 100);
      }
      if (aiAdjustments.grain_size !== undefined) {
        captureOne.grain.size = this.clamp(aiAdjustments.grain_size, 0, 100);
      }
      if (aiAdjustments.grain_frequency !== undefined) {
        captureOne.grain.roughness = this.clamp(aiAdjustments.grain_frequency, 0, 100);
      }
    }

    // Vignette (Capture One parameters)
    if (capabilities.supportsVignette) {
      captureOne.vignette = {};
      if (aiAdjustments.vignette_amount !== undefined) {
        captureOne.vignette.amount = this.clamp(aiAdjustments.vignette_amount, -100, 100);
      }
      if (aiAdjustments.vignette_midpoint !== undefined) {
        captureOne.vignette.midpoint = this.clamp(aiAdjustments.vignette_midpoint, 0, 100);
      }
      if (aiAdjustments.vignette_roundness !== undefined) {
        captureOne.vignette.roundness = this.clamp(aiAdjustments.vignette_roundness, -100, 100);
      }
      if (aiAdjustments.vignette_feather !== undefined) {
        captureOne.vignette.feather = this.clamp(aiAdjustments.vignette_feather, 0, 100);
      }
    }

    // Color grading (similar structure but different implementation)
    if (capabilities.supportsColorGrading) {
      captureOne.colorGrading = {};
      if (aiAdjustments.color_grade_shadow_hue !== undefined || 
          aiAdjustments.color_grade_shadow_sat !== undefined || 
          aiAdjustments.color_grade_shadow_lum !== undefined) {
        captureOne.colorGrading.shadows = {
          hue: aiAdjustments.color_grade_shadow_hue !== undefined ? this.clamp(aiAdjustments.color_grade_shadow_hue, 0, 360) : undefined,
          saturation: aiAdjustments.color_grade_shadow_sat !== undefined ? this.clamp(aiAdjustments.color_grade_shadow_sat, 0, 100) : undefined,
          lightness: aiAdjustments.color_grade_shadow_lum !== undefined ? this.clamp(aiAdjustments.color_grade_shadow_lum, -100, 100) : undefined,
        };
      }
      if (aiAdjustments.color_grade_midtone_hue !== undefined || 
          aiAdjustments.color_grade_midtone_sat !== undefined || 
          aiAdjustments.color_grade_midtone_lum !== undefined) {
        captureOne.colorGrading.midtones = {
          hue: aiAdjustments.color_grade_midtone_hue !== undefined ? this.clamp(aiAdjustments.color_grade_midtone_hue, 0, 360) : undefined,
          saturation: aiAdjustments.color_grade_midtone_sat !== undefined ? this.clamp(aiAdjustments.color_grade_midtone_sat, 0, 100) : undefined,
          lightness: aiAdjustments.color_grade_midtone_lum !== undefined ? this.clamp(aiAdjustments.color_grade_midtone_lum, -100, 100) : undefined,
        };
      }
      if (aiAdjustments.color_grade_highlight_hue !== undefined || 
          aiAdjustments.color_grade_highlight_sat !== undefined || 
          aiAdjustments.color_grade_highlight_lum !== undefined) {
        captureOne.colorGrading.highlights = {
          hue: aiAdjustments.color_grade_highlight_hue !== undefined ? this.clamp(aiAdjustments.color_grade_highlight_hue, 0, 360) : undefined,
          saturation: aiAdjustments.color_grade_highlight_sat !== undefined ? this.clamp(aiAdjustments.color_grade_highlight_sat, 0, 100) : undefined,
          lightness: aiAdjustments.color_grade_highlight_lum !== undefined ? this.clamp(aiAdjustments.color_grade_highlight_lum, -100, 100) : undefined,
        };
      }
    }

    // HSL (similar structure)
    if (capabilities.supportsHSL) {
      captureOne.hsl = this.convertHSLAdjustments(aiAdjustments);
    }

    // Masks (different types and structure)
    if (capabilities.supportsAdvancedMasks && Array.isArray((aiAdjustments as any).masks)) {
      captureOne.masks = this.convertMasks((aiAdjustments as any).masks, capabilities.maskTypes);
    }

    return captureOne;
  }

  private static convertHSLAdjustments(aiAdjustments: AIColorAdjustments): any {
    const hsl: any = {};
    const colors = ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'];
    
    colors.forEach(color => {
      const hue = (aiAdjustments as any)[`hue_${color}`];
      const sat = (aiAdjustments as any)[`sat_${color}`];
      const lum = (aiAdjustments as any)[`lum_${color}`];
      
      if (hue !== undefined || sat !== undefined || lum !== undefined) {
        hsl[color] = {
          hue: hue !== undefined ? this.clamp(hue, -100, 100) : undefined,
          saturation: sat !== undefined ? this.clamp(sat, -100, 100) : undefined,
          lightness: lum !== undefined ? this.clamp(lum, -100, 100) : undefined,
        };
      }
    });
    
    return Object.keys(hsl).length > 0 ? hsl : undefined;
  }

  private static convertMasks(masks: any[], supportedTypes: string[]): any[] {
    return masks
      .filter(mask => supportedTypes.includes(mask.type))
      .map(mask => ({
        type: mask.type,
        enabled: mask.enabled !== false,
        adjustments: mask.adjustments || {},
      }));
  }

  private static normalizeCameraProfile(profile?: string): string {
    if (!profile) return 'Adobe Color';
    const n = String(profile).toLowerCase();
    if (/mono|black\s*&?\s*white|b\s*&\s*w/.test(n)) return 'Adobe Monochrome';
    if (/portrait|people|skin/.test(n)) return 'Adobe Portrait';
    if (/landscape|sky|mountain|nature/.test(n)) return 'Adobe Landscape';
    if (/color|standard|default|auto/.test(n)) return 'Adobe Color';
    return 'Adobe Color';
  }

  private static clamp(value: number, min: number, max: number): number | undefined {
    // Handle NaN and Infinity values
    if (!Number.isFinite(value)) {
      return undefined; // Return undefined for invalid values
    }
    return Math.max(min, Math.min(max, value));
  }
}
