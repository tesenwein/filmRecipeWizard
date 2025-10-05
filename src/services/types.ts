export interface AIColorAdjustments {
  // Recipe metadata
  preset_name?: string;
  description?: string;

  // Rendering intent / profile
  treatment?: 'color' | 'black_and_white';
  camera_profile?: string;
  monochrome?: boolean;

  // Basic tone and color
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

  // Post-Crop Vignette
  vignette_amount?: number; // -100..100
  vignette_midpoint?: number; // 0..100
  vignette_feather?: number; // 0..100
  vignette_roundness?: number; // -100..100
  vignette_style?: number; // 0..2 (0=Highlight Priority, 1=Color Priority, 2=Paint Overlay)
  vignette_highlight_contrast?: number; // 0..100

  // Local masks - simplified structure
  masks?: Array<{
    name: string;
    type: 'face_skin' | 'iris_pupil' | 'eye_whites' | 'eyebrows' | 'lips' | 'teeth' | 'hair' | 'clothing' | 'body_skin' | 'sky' | 'vegetation' | 'water' | 'architecture' | 'natural_ground' | 'artificial_ground' | 'mountains' | 'background' | 'subject' | 'person' | 'radial' | 'linear' | 'brush' | 'range_color' | 'range_luminance';
    adjustments: {
      local_contrast?: number;
      local_highlights?: number;
      local_shadows?: number;
      local_whites?: number;
      local_blacks?: number;
      local_clarity?: number;
      local_dehaze?: number;
      local_texture?: number;
      local_saturation?: number;
    };
    // Common top-level geometry/params (supported in our generators/tests)
    // Radial geometry
    top?: number;
    left?: number;
    bottom?: number;
    right?: number;
    angle?: number;
    midpoint?: number;
    roundness?: number;
    feather?: number;
    // Linear geometry
    zeroX?: number;
    zeroY?: number;
    fullX?: number;
    fullY?: number;
    // Reference point for AI masks
    referenceX?: number;
    referenceY?: number;
    // Scene mask sub-category id
    subCategoryId?: number;
    // Range mask parameters
    colorAmount?: number;
    invert?: boolean;
    pointModels?: number[][];
    lumRange?: number[];
    luminanceDepthSampleInfo?: number[];
    // Brush parameters
    brushSize?: number;
    brushFlow?: number;
    brushDensity?: number;
    // Geometry for radial/linear masks
    geometry?: {
      // Radial
      top?: number;
      left?: number;
      bottom?: number;
      right?: number;
      angle?: number;
      midpoint?: number;
      roundness?: number;
      feather?: number;
      // Linear
      zeroX?: number;
      zeroY?: number;
      fullX?: number;
      fullY?: number;
      // Reference point for AI masks
      referenceX?: number;
      referenceY?: number;
    };
    // Range mask parameters
    rangeParams?: {
      colorAmount?: number;
      invert?: boolean;
      pointModels?: number[][];
      lumRange?: number[];
      luminanceDepthSampleInfo?: number[];
    };
    // Brush mask parameters
    brushParams?: {
      size?: number;
      flow?: number;
      density?: number;
    };
    // Common properties
    inverted?: boolean;
    flipped?: boolean;
    confidence?: number;
  }>;
}

export type { AIColorAdjustments as default };
