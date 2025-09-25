import { contextBridge, ipcRenderer } from 'electron';

// Define the API that will be exposed to the renderer process
const electronAPI = {
  // File operations
  selectFiles: (options: any) => ipcRenderer.invoke('select-files', options),
  openPath: (path: string) => ipcRenderer.invoke('open-path', path),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  processDroppedFiles: (files: { name: string; data: string }[]) =>
    ipcRenderer.invoke('process-dropped-files', files),

  // Image processing
  processImages: (data: any) => ipcRenderer.invoke('process-images', data),
  processWithStoredImages: (data: {
    processId: string;
    targetIndex?: number;
    baseImageData?: string | string[];
    targetImageData?: string[];
    prompt?: string;
    styleOptions?: any;
  }) => ipcRenderer.invoke('process-with-stored-images', data),
  processImage: (data: any) => ipcRenderer.invoke('process-image', data),
  analyzeColors: (imagePath: string) => ipcRenderer.invoke('analyze-colors', imagePath),
  matchStyle: (data: any) => ipcRenderer.invoke('match-style', data),
  generatePreset: (data: any) => ipcRenderer.invoke('generate-preset', data),
  downloadXMP: (data: any) => ipcRenderer.invoke('download-xmp', data),
  generateLUT: (data: any) => ipcRenderer.invoke('generate-lut', data),
  generateXmpContent: (data: { adjustments: any; include?: any; recipeName?: string }) =>
    ipcRenderer.invoke('generate-xmp-content', data),
  exportProfile: (data: { adjustments: any; recipeIndex?: number }) =>
    ipcRenderer.invoke('export-profile', data),
  exportPresetToLightroom: (data: { adjustments: any; recipeName?: string }) =>
    ipcRenderer.invoke('export-preset-to-lightroom', data),
  exportProfileToLightroom: (data: { adjustments: any; recipeName?: string }) =>
    ipcRenderer.invoke('export-profile-to-lightroom', data),
  // Recipe import/export
  exportRecipe: (processId: string) => ipcRenderer.invoke('export-recipe', processId),
  exportAllRecipes: () => ipcRenderer.invoke('export-all-recipes'),
  importRecipe: () => ipcRenderer.invoke('import-recipe'),
  importXMP: (data: { filePath?: string; fileContent?: string; title?: string; description?: string }) =>
    ipcRenderer.invoke('import-xmp', data),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),

  // Progress monitoring
  onProcessingProgress: (callback: (progress: number, status: string) => void) => {
    ipcRenderer.on('processing-progress', (_event, progress, status) => callback(progress, status));
  },
  onStreamingUpdate: (callback: (update: { type: string; content: string; step?: string; progress?: number; toolName?: string; toolArgs?: any }) => void) => {
    ipcRenderer.on('streaming-update', (_event, update) => callback(update));
  },
  onProcessingComplete: (callback: (results: any[]) => void) => {
    ipcRenderer.on('processing-complete', (_event, results) => callback(results));
  },
  onProcessUpdated: (callback: (payload: { processId: string; updates: any }) => void) => {
    ipcRenderer.on('process-updated', (_event, payload) => callback(payload));
  },

  // Preview generation
  generatePreview: (args: { path?: string; dataUrl?: string }) =>
    ipcRenderer.invoke('generate-preview', args),

  // Storage operations
  loadHistory: () => ipcRenderer.invoke('load-recipes'),
  saveProcess: (processData: any) => ipcRenderer.invoke('save-process', processData),
  updateProcess: (processId: string, updates: any) =>
    ipcRenderer.invoke('update-process', processId, updates),
  deleteProcess: (processId: string) => ipcRenderer.invoke('delete-process', processId),
  deleteMultipleProcesses: (processIds: string[]) => ipcRenderer.invoke('delete-multiple-processes', processIds),
  duplicateProcess: (processId: string) => ipcRenderer.invoke('duplicate-process', processId),
  getProcess: (processId: string) => ipcRenderer.invoke('get-process', processId),
  getImageDataUrls: (processId: string) => ipcRenderer.invoke('get-image-data-urls', processId),
  setBaseImage: (processId: string, filePath: string) =>
    ipcRenderer.invoke('set-base-image', processId, filePath),
  addBaseImages: (processId: string, filePaths: string[]) =>
    ipcRenderer.invoke('add-base-images', processId, filePaths),
  removeBaseImage: (processId: string, index: number) =>
    ipcRenderer.invoke('remove-base-image', processId, index),
  clearHistory: () => ipcRenderer.invoke('clear-history'),

  // Chat operations
  chatRecipe: (data: { messages: Array<{ role: string; content: string }>; recipe: any }) =>
    ipcRenderer.invoke('chat-recipe', data),
  clearPendingRecipes: () => ipcRenderer.invoke('clear-pending-recipes'),

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
  }) => ipcRenderer.invoke('generate-ai-recipe-image', options),
  saveBase64ToTempFile: (base64Data: string, filename: string) => ipcRenderer.invoke('save-base64-to-temp-file', base64Data, filename),

  // Settings operations
  selectStorageFolder: () => ipcRenderer.invoke('select-storage-folder'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  updateSettings: (settings: any) => ipcRenderer.invoke('update-settings', settings),

  // Utility functions
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
