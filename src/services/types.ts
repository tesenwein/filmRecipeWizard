export interface AIColorAdjustments {
  // Recipe metadata
  preset_name?: string;
  description?: string;

  // Rendering intent / profile
  treatment?: 'color' | 'black_and_white';
  camera_profile?: string;
  monochrome?: boolean;

  // Basic tone and color
  exposure?: number; // -5.0 to +5.0
  temperature?: number; // 2000..50000
  tint?: number; // -150..150
  highlights?: number; // -100..100
  shadows?: number; // -100..100
  whites?: number; // -100..100
  blacks?: number; // -100..100
  brightness?: number; // -100..100
  contrast?: number; // -100..100
  clarity?: number; // -100..100
  vibrance?: number; // -100..100
  saturation?: number; // -100..100

  // Black & White Mix (applies when monochrome/treatment is B&W)
  gray_red?: number; gray_orange?: number; gray_yellow?: number; gray_green?: number; gray_aqua?: number; gray_blue?: number; gray_purple?: number; gray_magenta?: number;

  // HSL hue
  hue_red?: number; hue_orange?: number; hue_yellow?: number; hue_green?: number; hue_aqua?: number; hue_blue?: number; hue_purple?: number; hue_magenta?: number;
  // HSL sat
  sat_red?: number; sat_orange?: number; sat_yellow?: number; sat_green?: number; sat_aqua?: number; sat_blue?: number; sat_purple?: number; sat_magenta?: number;
  // HSL lum
  lum_red?: number; lum_orange?: number; lum_yellow?: number; lum_green?: number; lum_aqua?: number; lum_blue?: number; lum_purple?: number; lum_magenta?: number;

  // Color grading
  color_grade_shadow_hue?: number; color_grade_shadow_sat?: number; color_grade_shadow_lum?: number;
  color_grade_midtone_hue?: number; color_grade_midtone_sat?: number; color_grade_midtone_lum?: number;
  color_grade_highlight_hue?: number; color_grade_highlight_sat?: number; color_grade_highlight_lum?: number;
  color_grade_global_hue?: number; color_grade_global_sat?: number; color_grade_global_lum?: number;
  color_grade_blending?: number; color_grade_balance?: number;

  // Tone curves
  tone_curve?: Array<{ input: number; output: number }>;
  tone_curve_red?: Array<{ input: number; output: number }>;
  tone_curve_green?: Array<{ input: number; output: number }>;
  tone_curve_blue?: Array<{ input: number; output: number }>;

  // Parametric curves
  parametric_shadows?: number;
  parametric_darks?: number;
  parametric_lights?: number;
  parametric_highlights?: number;
  parametric_shadow_split?: number;
  parametric_midtone_split?: number;
  parametric_highlight_split?: number;

  // Confidence
  confidence?: number;

  // Optional point color corrections
  point_colors?: number[][];
  color_variance?: number[];

  // Film Grain
  grain_amount?: number; grain_size?: number; grain_frequency?: number;

  // Local masks proposed by AI
  masks?: Array<{
    name?: string;
    // Mask type: geometric, AI-detected subjects, scene parts, or range masks
    // 'person' or 'subject' -> Lightroom Subject/People (MaskSubType=1)
    // 'background' -> Background (MaskSubType=0)
    // 'sky' -> Sky (MaskSubType=2)
    // 'range_color' and 'range_luminance' -> CorrectionRangeMask structures
    type: 'radial' | 'linear' | 'person' | 'subject' | 'background' | 'sky' | 'range_color' | 'range_luminance' | 'brush' | 'face' | 'eye' | 'skin' | 'hair' | 'clothing' | 'landscape' | 'water' | 'vegetation' | 'mountain' | 'building' | 'vehicle' | 'animal' | 'object';
    adjustments?: {
      local_exposure?: number; local_contrast?: number; local_highlights?: number; local_shadows?: number;
      local_whites?: number; local_blacks?: number; local_clarity?: number; local_dehaze?: number;
      local_temperature?: number; local_tint?: number; local_texture?: number; local_saturation?: number;
    };
    // Optional sub-category for background masks and other AI masks
    subCategoryId?: number;
    // Radial geometry
    top?: number; left?: number; bottom?: number; right?: number; angle?: number; midpoint?: number; roundness?: number; feather?: number;
    inverted?: boolean; flipped?: boolean;
    // Linear geometry
    zeroX?: number; zeroY?: number; fullX?: number; fullY?: number;
    // Person/subject reference point
    referenceX?: number; referenceY?: number;
    // Range mask parameters
    colorAmount?: number; invert?: boolean; pointModels?: number[][];
    lumRange?: number[]; luminanceDepthSampleInfo?: number[];
    // Brush mask parameters
    brushSize?: number; brushFlow?: number; brushDensity?: number;
    // AI mask specific parameters
    confidence?: number; detectionQuality?: number;
  }>;
}

export type { AIColorAdjustments as default };
