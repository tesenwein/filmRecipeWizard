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

export interface ProcessHistory {
  id: string;
  timestamp: string;
  name?: string;
  baseImage: string;
  targetImages: string[];
  results: ProcessingResult[];
  // Base64 image data for offline storage
  baseImageData?: string; // base64 encoded image
  targetImageData?: string[]; // base64 encoded images
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  status: string;
}
