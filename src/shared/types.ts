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
  baseImage: string;
  targetImages: string[];
  results: ProcessingResult[];
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  status: string;
}
