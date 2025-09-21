import type { AIColorAdjustments } from '../services/types';

// Default storage location for recipes
export const DEFAULT_STORAGE_FOLDER = '.film-recipes-wizard';


export interface ProcessingResult {
  inputPath?: string;
  outputPath?: string;
  success: boolean;
  error?: string;
  metadata?: {
    aiAdjustments?: AIColorAdjustments;
    processingTime?: number;
    confidence?: number;
    presetName?: string;
    groupFolder?: string;
  };
}

export interface StyleOptions {
  contrast?: number;
  vibrance?: number;
  saturationBias?: number;
  vibe?: string; // e.g., Cinematic, Soft Pastel (legacy support)
  styleCategories?: string[]; // Multiple style categories like ['Cinematic', 'Portrait', 'Street']
  
  // Soft parameters for mood and style
  moodiness?: number; // 0-100: 0=neutral, 50=balanced, 100=very moody/dramatic
  warmth?: number; // 0-100: 0=cool, 50=neutral, 100=warm
  coolness?: number; // 0-100: 0=warm, 50=neutral, 100=cool
  drama?: number; // 0-100: 0=subtle, 50=balanced, 100=high drama
  softness?: number; // 0-100: 0=sharp/harsh, 50=balanced, 100=very soft/dreamy
  intensity?: number; // 0-100: 0=muted, 50=balanced, 100=high intensity
  vintage?: number; // 0-100: 0=modern, 50=neutral, 100=very vintage
  cinematic?: number; // 0-100: 0=documentary, 50=balanced, 100=very cinematic
  faded?: number; // 0-100: 0=vibrant, 50=balanced, 100=very faded/washed out
  
  // Optional artist and film selections
  artistStyle?: { key: string; name: string; category: string; blurb: string };
  filmStyle?: { key: string; name: string; category: string; blurb: string };
}

export interface Recipe {
  id: string;
  timestamp: string;
  name?: string;
  // Optional freeform text prompt used instead of a reference image
  prompt?: string;
  // Optional description of the recipe
  description?: string;
  results: ProcessingResult[];
  // Recipe image (single) to show in detail view; do not persist full reference/target sets
  recipeImageData?: string; // base64 encoded image
  // User-selected style options (sliders/toggles)
  userOptions?: StyleOptions;
  // Optional mask overrides proposed/accepted via chat; used to guide next generation
  maskOverrides?: any[];
  // Optional global adjustment overrides accepted via chat (e.g., grain, vignette)
  aiAdjustmentOverrides?: { [key: string]: number };
  // Optional embedded XMP preset generated from the current effective adjustments
  xmpPreset?: string;
  xmpCreatedAt?: string;
  // Processing status to track if generation is still in progress
  status?: 'generating' | 'completed' | 'failed';
  // Optional author/creator profile attached to the recipe
  author?: UserProfile;
}

// Type alias for recipes in storage/persistence context
export type ProcessHistory = Recipe;

export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  status: string;
}

export interface ProfileExportResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  metadata?: { profileName?: string };
}

export interface AppSettings {
  openaiKey?: string;
  setupCompleted?: boolean;
  userProfile?: UserProfile;
  storageLocation?: string; // Path to the recipe storage folder
  // Optional UX: show generating spinner during reprocessing after Accept
  reprocessShowsGenerating?: boolean;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  count?: number;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  count?: number;
  replaced?: number;
  error?: string;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email?: string;
  website?: string;
  instagram?: string;
}
