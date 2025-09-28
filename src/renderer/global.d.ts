import { ExportResult, ImportResult, ProcessingResult, StyleOptions } from '../shared/types';

// Additional type definitions for better type safety
interface ProcessingRequest {
  baseImagePath: string;
  targetImagePaths: string[];
  hint?: string;
  options: StyleOptions;
  processId?: string;
}

interface ColorAnalysis {
  dominantColors: string[];
  colorPalette: string[];
  brightness: number;
  contrast: number;
}

interface StyleMatchRequest {
  imagePath: string;
  targetStyle: string;
}

interface StyleMatchResult {
  confidence: number;
  matchedStyle: string;
  adjustments: Record<string, number>;
}

interface PresetGenerationRequest {
  adjustments: Record<string, number>;
  name: string;
  description?: string;
}

interface PresetResult {
  success: boolean;
  presetPath?: string;
  error?: string;
}

interface XMPDownloadRequest {
  adjustments: Record<string, number>;
  include: Record<string, boolean>;
  recipeName?: string;
}

interface XMPResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export { };

declare global {
  // Add CSS properties for Electron and modern browsers
  namespace React {
    interface CSSProperties {
      WebkitAppRegion?: 'drag' | 'no-drag';
      WebkitBackdropFilter?: string;
      backdropFilter?: string;
    }
  }
  interface Window {
    electronAPI: {
      // File operations
      selectFiles: (options: {
        title: string;
        filters: Array<{ name: string; extensions: string[] }>;
        properties: string[];
      }) => Promise<string[]>;

      openPath: (path: string) => Promise<{ success: boolean; error?: string }>;
      openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
      processDroppedFiles: (files: { name: string; data: string }[]) => Promise<string[]>;

      // Image processing
      processImages: (data: {
        baseImagePath: string;
        targetImagePaths: string[];
        hint?: string;
        options: StyleOptions;
        processId?: string;
      }) => Promise<any[]>;
      processWithStoredImages: (data: {
        processId: string;
        targetIndex?: number;
        baseImageData?: string | string[];
        targetImageData?: string[];
        prompt?: string;
        styleOptions?: StyleOptions;
      }) => Promise<any>;

      processImage: (data: ProcessingRequest) => Promise<ProcessingResult>;
      analyzeColors: (imagePath: string) => Promise<ColorAnalysis>;
      matchStyle: (data: StyleMatchRequest) => Promise<StyleMatchResult>;
      generatePreset: (data: PresetGenerationRequest) => Promise<PresetResult>;
      downloadXMP: (data: XMPDownloadRequest) => Promise<XMPResult>;
      importXMP: (data: { filePath?: string; fileContent?: string; title?: string; description?: string }) => Promise<any>;
      readFile: (filePath: string) => Promise<string>;
      generateLUT: (data: any) => Promise<any>;
      exportProfile: (data: {
        adjustments: any;
        recipeIndex?: number;
        recipeName?: string;
      }) => Promise<{ success: boolean; outputPath?: string; error?: string }>;
      exportPresetToLightroom: (data: { adjustments: any; recipeName?: string }) => Promise<{ success: boolean; outputPath?: string; error?: string }>;
      exportProfileToLightroom: (data: { adjustments: any; recipeName?: string }) => Promise<{ success: boolean; outputPath?: string; error?: string }>;

      // Recipe import/export
      exportRecipe: (processId: string) => Promise<ExportResult>;
      exportAllRecipes: () => Promise<ExportResult>;
      exportSelectedRecipes: (recipeIds: string[]) => Promise<ExportResult>;
      importRecipe: () => Promise<ImportResult>;

      // AI Image generation
      generateAIRecipeImage: (options: {
        recipeName?: string;
        prompt?: string;
        artistStyle?: { name: string; description?: string };
        filmStyle?: { name: string; description?: string };
        userOptions?: {
          contrast?: number;
          vibrance?: number;
          saturationBias?: number;
        };
      }) => Promise<{ success: boolean; imageUrl?: string; error?: string }>;
      saveBase64ToTempFile: (base64Data: string, filename: string) => Promise<string | null>;


      // Progress monitoring
      onProcessingProgress?: (callback: (progress: number, status: string) => void) => void;
      onStreamingUpdate?: (callback: (update: { type: string; content: string; step?: string; progress?: number; toolName?: string; toolArgs?: any }) => void) => void;
      onProcessingComplete?: (callback: (results: any[]) => void) => void;
      onProcessUpdated?: (callback: (payload: { processId: string; updates: any }) => void) => void;

      // Preview generation
      generatePreview: (args: { path?: string; dataUrl?: string }) => Promise<any>;

      // Storage operations
      loadHistory: () => Promise<{ success: boolean; recipes?: any[]; error?: string }>;
      clearHistory: () => Promise<void>;
      clearPendingRecipes: () => Promise<{ success: boolean; error?: string }>;
      saveProcess: (
        processData: any
      ) => Promise<{ success: boolean; process?: any; error?: string }>;
      updateProcess: (
        processId: string,
        updates: any
      ) => Promise<{ success: boolean; error?: string }>;
      deleteProcess: (processId: string) => Promise<{ success: boolean; error?: string }>;
      deleteMultipleProcesses: (processIds: string[]) => Promise<{ success: boolean; error?: string }>;
      duplicateProcess: (processId: string) => Promise<{ success: boolean; process?: any; error?: string }>;
      getProcess: (
        processId: string
      ) => Promise<{ success: boolean; process?: any; error?: string }>;
      getImageDataUrls: (processId: string) => Promise<{
        success: boolean;
        baseImageUrls: string[];
        targetImageUrls: string[];
        error?: string;
      }>;
      setBaseImage: (
        processId: string,
        filePath: string
      ) => Promise<{ success: boolean; error?: string }>;
      addBaseImages: (
        processId: string,
        filePaths: string[]
      ) => Promise<{ success: boolean; count?: number; error?: string }>;
      removeBaseImage: (
        processId: string,
        index: number
      ) => Promise<{ success: boolean; error?: string }>;

      // Settings operations
      selectStorageFolder: () => Promise<{ success: boolean; path?: string; error?: string }>;
      getSettings: () => Promise<{
        success: boolean;
        settings?: {
          openaiKey?: string;
          setupCompleted?: boolean;
          storageLocation?: string;
          userProfile?: {
            firstName: string;
            lastName: string;
            email?: string;
            website?: string;
            instagram?: string;
          };
        };
        error?: string;
      }>;
      saveSettings: (settings: {
        openaiKey?: string;
        setupCompleted?: boolean;
        storageLocation?: string;
        lightroomProfilePath?: string;
        userProfile?: {
          firstName: string;
          lastName: string;
          email?: string;
          website?: string;
          instagram?: string;
        };
      }) => Promise<{
        success: boolean;
        settings?: {
          openaiKey?: string;
          setupCompleted?: boolean;
          storageLocation?: string;
          lightroomProfilePath?: string;
          userProfile?: {
            firstName: string;
            lastName: string;
            email?: string;
            website?: string;
            instagram?: string;
          };
        };
        error?: string;
      }>;
      updateSettings: (settings: {
        openaiKey?: string;
        setupCompleted?: boolean;
        storageLocation?: string;
        lightroomProfilePath?: string;
        userProfile?: {
          firstName: string;
          lastName: string;
          email?: string;
          website?: string;
          instagram?: string;
        };
      }) => Promise<{
        success: boolean;
        settings?: {
          openaiKey?: string;
          setupCompleted?: boolean;
          storageLocation?: string;
          lightroomProfilePath?: string;
          userProfile?: {
            firstName: string;
            lastName: string;
            email?: string;
            website?: string;
            instagram?: string;
          };
        };
        error?: string;
      }>;

      // Utility functions
      removeAllListeners: (channel: string) => void;

      // App info
      getAppVersion: () => Promise<{ success: boolean; version?: string; error?: string }>;
    };
  }
}
