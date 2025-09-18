"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Define the API that will be exposed to the renderer process
const electronAPI = {
    // File operations
    selectFiles: (options) => electron_1.ipcRenderer.invoke('select-files', options),
    readFile: (filePath) => electron_1.ipcRenderer.invoke('read-file', filePath),
    openPath: (path) => electron_1.ipcRenderer.invoke('open-path', path),
    openExternal: (url) => electron_1.ipcRenderer.invoke('open-external', url),
    processDroppedFiles: (files) => electron_1.ipcRenderer.invoke('process-dropped-files', files),
    // Image processing
    processImages: (data) => electron_1.ipcRenderer.invoke('process-images', data),
    processWithStoredImages: (data) => electron_1.ipcRenderer.invoke('process-with-stored-images', data),
    processImage: (data) => electron_1.ipcRenderer.invoke('process-image', data),
    analyzeColors: (imagePath) => electron_1.ipcRenderer.invoke('analyze-colors', imagePath),
    matchStyle: (data) => electron_1.ipcRenderer.invoke('match-style', data),
    generatePreset: (data) => electron_1.ipcRenderer.invoke('generate-preset', data),
    downloadXMP: (data) => electron_1.ipcRenderer.invoke('download-xmp', data),
    generateLUT: (data) => electron_1.ipcRenderer.invoke('generate-lut', data),
    exportProfile: (data) => electron_1.ipcRenderer.invoke('export-profile', data),
    // Recipe import/export
    exportRecipe: (processId) => electron_1.ipcRenderer.invoke('export-recipe', processId),
    exportAllRecipes: () => electron_1.ipcRenderer.invoke('export-all-recipes'),
    importRecipe: () => electron_1.ipcRenderer.invoke('import-recipe'),
    importXMP: (data) => electron_1.ipcRenderer.invoke('import-xmp', data),
    // Progress monitoring
    onProcessingProgress: (callback) => {
        electron_1.ipcRenderer.on('processing-progress', (_event, progress, status) => callback(progress, status));
    },
    onStreamingUpdate: (callback) => {
        electron_1.ipcRenderer.on('streaming-update', (_event, update) => callback(update));
    },
    onProcessingComplete: (callback) => {
        electron_1.ipcRenderer.on('processing-complete', (_event, results) => callback(results));
    },
    onProcessUpdated: (callback) => {
        electron_1.ipcRenderer.on('process-updated', (_event, payload) => callback(payload));
    },
    // Preview generation
    generatePreview: (args) => electron_1.ipcRenderer.invoke('generate-preview', args),
    // Storage operations
    loadHistory: () => electron_1.ipcRenderer.invoke('load-recipes'),
    saveProcess: (processData) => electron_1.ipcRenderer.invoke('save-process', processData),
    updateProcess: (processId, updates) => electron_1.ipcRenderer.invoke('update-process', processId, updates),
    deleteProcess: (processId) => electron_1.ipcRenderer.invoke('delete-process', processId),
    getProcess: (processId) => electron_1.ipcRenderer.invoke('get-process', processId),
    getImageDataUrls: (processId) => electron_1.ipcRenderer.invoke('get-image-data-urls', processId),
    setBaseImage: (processId, filePath) => electron_1.ipcRenderer.invoke('set-base-image', processId, filePath),
    addBaseImages: (processId, filePaths) => electron_1.ipcRenderer.invoke('add-base-images', processId, filePaths),
    removeBaseImage: (processId, index) => electron_1.ipcRenderer.invoke('remove-base-image', processId, index),
    clearHistory: () => electron_1.ipcRenderer.invoke('clear-recipes'),
    clearPendingRecipes: () => electron_1.ipcRenderer.invoke('clear-pending-recipes'),
    // Settings operations
    selectStorageFolder: () => electron_1.ipcRenderer.invoke('select-storage-folder'),
    getSettings: () => electron_1.ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => electron_1.ipcRenderer.invoke('save-settings', settings),
    updateSettings: (settings) => electron_1.ipcRenderer.invoke('update-settings', settings),
    // Utility functions
    removeAllListeners: (channel) => {
        electron_1.ipcRenderer.removeAllListeners(channel);
    },
    // App info
    getAppVersion: () => electron_1.ipcRenderer.invoke('get-app-version'),
};
// Expose the API to the renderer process
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
