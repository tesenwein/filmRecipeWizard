import { contextBridge, ipcRenderer } from 'electron';

// Define the API that will be exposed to the renderer process
const electronAPI = {
  // File operations
  onBaseImageSelected: (callback: (filePath: string) => void) => {
    ipcRenderer.on('base-image-selected', (_event, filePath) => callback(filePath));
  },
  onTargetImagesSelected: (callback: (filePaths: string[]) => void) => {
    ipcRenderer.on('target-images-selected', (_event, filePaths) => callback(filePaths));
  },

  // Image processing
  processImage: (data: any) => ipcRenderer.invoke('process-image', data),
  analyzeColors: (imagePath: string) => ipcRenderer.invoke('analyze-colors', imagePath),
  analyzeColorMatch: (data: any) => ipcRenderer.invoke('analyze-color-match', data),
  matchStyle: (data: any) => ipcRenderer.invoke('match-style', data),
  generatePreset: (data: any) => ipcRenderer.invoke('generate-preset', data),

  // Utility functions
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Define types for TypeScript support
export type ElectronAPI = typeof electronAPI;