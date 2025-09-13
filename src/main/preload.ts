import { contextBridge, ipcRenderer } from 'electron';

// Define the API that will be exposed to the renderer process
const electronAPI = {
  // File operations
  selectFiles: (options: any) => ipcRenderer.invoke('select-files', options),
  openPath: (path: string) => ipcRenderer.invoke('open-path', path),

  // Legacy file operations (keep for backward compatibility)
  onBaseImageSelected: (callback: (filePath: string) => void) => {
    ipcRenderer.on('base-image-selected', (_event, filePath) => callback(filePath));
  },
  onTargetImagesSelected: (callback: (filePaths: string[]) => void) => {
    ipcRenderer.on('target-images-selected', (_event, filePaths) => callback(filePaths));
  },

  // Image processing
  processImages: (data: any) => ipcRenderer.invoke('process-images', data),
  processWithStoredImages: (data: any) => ipcRenderer.invoke('process-with-stored-images', data),
  processImage: (data: any) => ipcRenderer.invoke('process-image', data),
  analyzeColors: (imagePath: string) => ipcRenderer.invoke('analyze-colors', imagePath),
  analyzeColorMatch: (data: any) => ipcRenderer.invoke('analyze-color-match', data),
  matchStyle: (data: any) => ipcRenderer.invoke('match-style', data),
  generatePreset: (data: any) => ipcRenderer.invoke('generate-preset', data),
  downloadXMP: (data: any) => ipcRenderer.invoke('download-xmp', data),

  // Progress monitoring
  onProcessingProgress: (callback: (progress: number, status: string) => void) => {
    ipcRenderer.on('processing-progress', (_event, progress, status) => callback(progress, status));
  },
  onProcessingComplete: (callback: (results: any[]) => void) => {
    ipcRenderer.on('processing-complete', (_event, results) => callback(results));
  },

  // Preview generation
  generatePreview: (args: { path?: string; dataUrl?: string }) => ipcRenderer.invoke('generate-preview', args),
  generateAdjustedPreview: (args: { path: string; adjustments: any }) => ipcRenderer.invoke('generate-adjusted-preview', args),

  // Storage operations
  loadHistory: () => ipcRenderer.invoke('load-history'),
  saveProcess: (processData: any) => ipcRenderer.invoke('save-process', processData),
  updateProcess: (processId: string, updates: any) => ipcRenderer.invoke('update-process', processId, updates),
  deleteProcess: (processId: string) => ipcRenderer.invoke('delete-process', processId),
  getProcess: (processId: string) => ipcRenderer.invoke('get-process', processId),
  getImageDataUrls: (processId: string) => ipcRenderer.invoke('get-image-data-urls', processId),

  // Settings operations
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),

  // Utility functions
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
