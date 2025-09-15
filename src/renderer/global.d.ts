export {}

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

      // Image processing
      processImages: (data: {
        baseImagePath: string;
        targetImagePaths: string[];
        hint?: string;
        options: any;
        processId?: string;
      }) => Promise<any[]>;
      processWithStoredImages: (data: { processId: string; targetIndex?: number; baseImageData?: string | string[]; targetImageData?: string[]; prompt?: string }) => Promise<any>;
      
      processImage: (data: any) => Promise<any>;
      analyzeColors: (imagePath: string) => Promise<any>;
      analyzeColorMatch: (data: any) => Promise<any>;
      matchStyle: (data: any) => Promise<any>;
      generatePreset: (data: any) => Promise<any>;
      downloadXMP: (data: any) => Promise<any>;
      generateLUT: (data: any) => Promise<any>;
      exportProfile: (data: { sourceXmpPath: string; outputDir?: string }) => Promise<{ success: boolean; outputPath?: string; error?: string }>;

      // Recipe import/export
      exportRecipe: (processId: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      importRecipe: () => Promise<{ success: boolean; count?: number; error?: string }>;
      
      // Progress monitoring
      onProcessingProgress?: (callback: (progress: number, status: string) => void) => void;
      onProcessingComplete?: (callback: (results: any[]) => void) => void;

      // Preview generation
      generatePreview: (args: { path?: string; dataUrl?: string }) => Promise<any>;
      generateAdjustedPreview: (args: { path: string; adjustments: any }) => Promise<any>;

      // Storage operations
      loadHistory: () => Promise<{ success: boolean; history?: any[]; error?: string }>;
      saveProcess: (processData: any) => Promise<{ success: boolean; process?: any; error?: string }>;
      updateProcess: (processId: string, updates: any) => Promise<{ success: boolean; error?: string }>;
      deleteProcess: (processId: string) => Promise<{ success: boolean; error?: string }>;
      getProcess: (processId: string) => Promise<{ success: boolean; process?: any; error?: string }>;
      getImageDataUrls: (processId: string) => Promise<{ success: boolean; baseImageUrls: string[]; targetImageUrls: string[]; error?: string }>;
      setBaseImage: (processId: string, filePath: string) => Promise<{ success: boolean; error?: string }>;
      addBaseImages: (processId: string, filePaths: string[]) => Promise<{ success: boolean; count?: number; error?: string }>;
      removeBaseImage: (processId: string, index: number) => Promise<{ success: boolean; error?: string }>;

      // Settings operations
      getSettings: () => Promise<{ success: boolean; settings?: { openaiKey?: string }; error?: string }>;
      saveSettings: (
        settings: { openaiKey?: string }
      ) => Promise<{ success: boolean; settings?: { openaiKey?: string }; error?: string }>;

      // Utility functions
      removeAllListeners: (channel: string) => void;

      // Legacy operations (backward compatibility)
      onBaseImageSelected: (callback: (filePath: string) => void) => void;
      onTargetImagesSelected: (callback: (filePaths: string[]) => void) => void;
    };
  }
}
