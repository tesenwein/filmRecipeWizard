export {}

declare global {
  interface Window {
    electronAPI: {
      // File operations
      selectFiles: (options: {
        title: string;
        filters: Array<{ name: string; extensions: string[] }>;
        properties: string[];
      }) => Promise<string[]>;
      
      openPath: (path: string) => Promise<{ success: boolean; error?: string }>;

      // Image processing
      processImages: (data: {
        baseImagePath: string;
        targetImagePaths: string[];
        hint?: string;
        options: any;
      }) => Promise<any[]>;
      
      processImage: (data: any) => Promise<any>;
      analyzeColors: (imagePath: string) => Promise<any>;
      analyzeColorMatch: (data: any) => Promise<any>;
      matchStyle: (data: any) => Promise<any>;
      generatePreset: (data: any) => Promise<any>;
      downloadXMP: (data: any) => Promise<any>;
      
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

      // Utility functions
      removeAllListeners: (channel: string) => void;

      // Legacy operations (backward compatibility)
      onBaseImageSelected: (callback: (filePath: string) => void) => void;
      onTargetImagesSelected: (callback: (filePaths: string[]) => void) => void;
    };
  }
}
