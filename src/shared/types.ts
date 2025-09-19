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
    reasoning?: string;
    confidence?: number;
    presetName?: string;
    groupFolder?: string;
    usedSettings?: {
      preserveSkinTones?: boolean;
    };
  };
}

export interface StyleOptions {
  // 0-100 sliders; neutral around 50
  warmth?: number;
  tint?: number; // -50..50 where 0 is neutral; UI can map 0-100
  contrast?: number;
  vibrance?: number;
  moodiness?: number; // overall curve mood
  saturationBias?: number;
  filmGrain?: boolean;
  preserveSkinTones?: boolean;
  vibe?: string; // e.g., Cinematic, Soft Pastel
  // AI Function Selection - user chooses what features are available to AI
  aiFunctions?: {
    temperatureTint?: boolean; // Enable temperature/tint adjustments
    masks?: boolean; // Enable mask/local adjustments
    colorGrading?: boolean; // Enable color grading (shadows/midtones/highlights)
    hsl?: boolean; // Enable HSL adjustments
    curves?: boolean; // Enable tone curves
    grain?: boolean; // Enable film grain
    pointColor?: boolean; // Enable point color adjustments
  };
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
