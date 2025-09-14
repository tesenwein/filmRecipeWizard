import { AIColorAdjustments } from '../services/openai-color-analyzer';

export interface ProcessingResult {
  inputPath: string;
  outputPath?: string;
  success: boolean;
  error?: string;
  metadata?: {
    aiAdjustments?: AIColorAdjustments;
    processingTime?: number;
    reasoning?: string;
    confidence?: number;
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
  vibe?: string; // e.g., Cinematic, Soft Pastel
  // Optional artist and film selections
  artistStyle?: { key: string; name: string; category: string; blurb: string };
  filmStyle?: { key: string; name: string; category: string; blurb: string };
}

export interface ProcessHistory {
  id: string;
  timestamp: string;
  name?: string;
  // Optional freeform text prompt used instead of a reference image
  prompt?: string;
  baseImage?: string;
  targetImages?: string[];
  results: ProcessingResult[];
  // Base64 image data for offline storage
  baseImageData?: string; // base64 encoded image
  targetImageData?: string[]; // base64 encoded images
  // User-selected style options (sliders/toggles)
  userOptions?: StyleOptions;
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  status: string;
}
