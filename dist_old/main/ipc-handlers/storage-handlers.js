"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageHandlers = void 0;
const electron_1 = require("electron");
const fs = __importStar(require("fs/promises"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const types_1 = require("../../shared/types");
class StorageHandlers {
    constructor(storageService, settingsService, imageProcessor) {
        this.storageService = storageService;
        this.settingsService = settingsService;
        this.imageProcessor = imageProcessor;
    }
    setupHandlers() {
        // Load all recipes
        electron_1.ipcMain.handle('load-recipes', async () => {
            try {
                const [recipes, settings] = await Promise.all([
                    this.storageService.loadRecipes(),
                    this.settingsService
                        ? this.settingsService.loadSettings()
                        : Promise.resolve({}),
                ]);
                const author = settings.userProfile;
                let mutated = false;
                const withAuthors = recipes.map(r => {
                    if (!r.author && author) {
                        mutated = true;
                        return { ...r, author };
                    }
                    return r;
                });
                if (mutated && this.settingsService) {
                    try {
                        await this.storageService.saveRecipes(withAuthors);
                    }
                    catch {
                        // Ignore save errors
                    }
                }
                return { success: true, recipes: withAuthors };
            }
            catch (error) {
                console.error('[IPC] Error loading recipes:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
        // Save a new process/recipe
        electron_1.ipcMain.handle('save-process', async (_event, processData) => {
            try {
                const processId = this.storageService.generateProcessId();
                // If a reference image (base) was provided, convert the first one to base64 (no fallback)
                let recipeImageData;
                const baseImages = Array.isArray(processData.baseImages)
                    ? processData.baseImages
                    : undefined;
                const firstBase = baseImages && baseImages.length > 0 ? baseImages[0] : undefined;
                if (firstBase) {
                    try {
                        recipeImageData = await this.storageService.convertImageToBase64(firstBase);
                    }
                    catch {
                        console.warn('[IPC] save-process: convertImageToBase64 failed for recipe image');
                    }
                }
                // Prepare target images as base64 for immediate processing only (do not persist)
                let targetImageDataEphemeral = [];
                const targetImages = Array.isArray(processData.targetImages)
                    ? processData.targetImages
                    : undefined;
                if (targetImages && targetImages.length > 0) {
                    for (const t of targetImages.slice(0, 3)) {
                        try {
                            const b64 = await this.storageService.convertImageToBase64(t);
                            targetImageDataEphemeral.push(b64);
                            continue;
                        }
                        catch {
                            // Fallback only for targets: generate a JPEG preview and base64 it
                        }
                        try {
                            if (this.imageProcessor) {
                                const previewPath = await this.imageProcessor.generatePreview({
                                    path: t,
                                    processId,
                                    subdir: 'target',
                                });
                                const buf = await fs.readFile(previewPath);
                                targetImageDataEphemeral.push(buf.toString('base64'));
                            }
                        }
                        catch {
                            console.warn('[IPC] save-process: failed to prepare target image');
                        }
                    }
                }
                // Load author profile from settings, if available
                let authorProfile = undefined;
                try {
                    if (this.settingsService) {
                        const settings = await this.settingsService.loadSettings();
                        authorProfile = settings.userProfile;
                    }
                }
                catch {
                    // Ignore settings load errors
                }
                const process = {
                    id: processId,
                    timestamp: new Date().toISOString(),
                    name: processData?.name,
                    prompt: processData?.prompt,
                    userOptions: processData?.userOptions,
                    results: Array.isArray(processData.results) ? processData.results : [],
                    recipeImageData,
                    status: 'generating',
                    author: authorProfile,
                };
                await this.storageService.addProcess(process);
                return { success: true, process, targetImageData: targetImageDataEphemeral };
            }
            catch (error) {
                console.error('[IPC] Error saving process:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        });
        // Update an existing process
        electron_1.ipcMain.handle('update-process', async (_event, processId, updates) => {
            try {
                await this.storageService.updateProcess(processId, updates);
                // Notify renderer that a process has been updated (useful for background updates)
                try {
                    // Note: We don't have direct access to mainWindow here, but the calling code should handle this
                    // This is handled in the processing handlers when they call this
                }
                catch {
                    // Ignore IPC send errors
                }
                return { success: true };
            }
            catch (error) {
                console.error('[IPC] Error updating process:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        });
        // Delete a process
        electron_1.ipcMain.handle('delete-process', async (_event, processId) => {
            try {
                await this.storageService.deleteProcess(processId);
                return { success: true };
            }
            catch (error) {
                console.error('[IPC] Error deleting process:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
        // Get a specific process
        electron_1.ipcMain.handle('get-process', async (_event, processId) => {
            try {
                const process = await this.storageService.getProcess(processId);
                if (!process) {
                    return { success: false, error: 'Process not found' };
                }
                return { success: true, process };
            }
            catch (error) {
                console.error('[IPC] Error getting process:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
        // Get image data URLs for UI display from stored base64 data
        electron_1.ipcMain.handle('get-image-data-urls', async (_event, processId) => {
            try {
                const process = await this.storageService.getProcess(processId);
                if (!process) {
                    throw new Error('Process not found');
                }
                const result = {
                    baseImageUrls: [],
                    targetImageUrls: [],
                };
                if (process.recipeImageData) {
                    result.baseImageUrls = [
                        this.storageService.getImageDataUrl(process.recipeImageData),
                    ];
                }
                // Do not persist target images anymore; no target previews returned
                result.targetImageUrls = [];
                return { success: true, ...result };
            }
            catch (error) {
                console.error('[IPC] Error getting image data URLs:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
        // Set or replace the base image of an existing process (converts to base64 and persists)
        electron_1.ipcMain.handle('set-base-image', async (_event, processId, filePath) => {
            try {
                if (!processId || !filePath)
                    throw new Error('Invalid arguments');
                let baseImageData;
                try {
                    baseImageData = await this.storageService.convertImageToBase64(filePath);
                }
                catch (convErr) {
                    // Fallback: generate a JPEG preview then base64 it
                    try {
                        if (this.imageProcessor) {
                            const previewPath = await this.imageProcessor.generatePreview({
                                path: filePath,
                                processId,
                                subdir: 'base',
                            });
                            const buf = await fs.readFile(previewPath);
                            baseImageData = buf.toString('base64');
                        }
                        else {
                            throw convErr instanceof Error ? convErr : new Error('Failed to convert image');
                        }
                    }
                    catch {
                        throw convErr instanceof Error ? convErr : new Error('Failed to convert image');
                    }
                }
                await this.storageService.updateProcess(processId, {
                    recipeImageData: baseImageData,
                });
                return { success: true };
            }
            catch (error) {
                console.error('[IPC] Error setting base image:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
        // Add multiple base/reference images (appends and limits to 3)
        electron_1.ipcMain.handle('add-base-images', async (_event, processId, filePaths) => {
            try {
                if (!processId || !Array.isArray(filePaths))
                    throw new Error('Invalid arguments');
                const process = await this.storageService.getProcess(processId);
                if (!process)
                    throw new Error('Process not found');
                const existing = [];
                const converted = [];
                for (const fp of filePaths.slice(0, 3)) {
                    try {
                        const b64 = await this.storageService.convertImageToBase64(fp);
                        converted.push(b64);
                    }
                    catch (e) {
                        console.warn('[IPC] add-base-images: convert failed for', fp, e);
                    }
                }
                const merged = [...existing, ...converted].slice(0, 3);
                await this.storageService.updateProcess(processId, { recipeImageData: merged[0] });
                return { success: true, count: merged.length };
            }
            catch (error) {
                console.error('[IPC] Error adding base images:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
        // Remove a base/reference image by index
        electron_1.ipcMain.handle('remove-base-image', async (_event, processId, index) => {
            try {
                if (!processId || typeof index !== 'number')
                    throw new Error('Invalid arguments');
                const process = await this.storageService.getProcess(processId);
                if (!process)
                    throw new Error('Process not found');
                const existing = process.recipeImageData
                    ? [process.recipeImageData]
                    : [];
                if (index < 0 || index >= existing.length)
                    throw new Error('Index out of range');
                const next = existing.filter((_, i) => i !== index);
                const updates = { recipeImageData: next[0] || undefined };
                await this.storageService.updateProcess(processId, updates);
                return { success: true };
            }
            catch (error) {
                console.error('[IPC] Error removing base image:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
        // Handle folder selection for storage location
        electron_1.ipcMain.handle('select-storage-folder', async () => {
            try {
                const result = await electron_1.dialog.showOpenDialog({
                    title: 'Select Recipe Storage Folder',
                    properties: ['openDirectory', 'createDirectory'],
                    defaultPath: path.join(os.homedir(), types_1.DEFAULT_STORAGE_FOLDER),
                });
                if (!result.canceled && result.filePaths.length > 0) {
                    return { success: true, path: result.filePaths[0] };
                }
                return { success: false, error: 'Selection canceled' };
            }
            catch (error) {
                console.error('[IPC] Error selecting storage folder:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
        // Fast clear of all recipes
        electron_1.ipcMain.handle('clear-recipes', async () => {
            try {
                await this.storageService.clearRecipes();
                return { success: true };
            }
            catch (error) {
                console.error('[IPC] Error clearing recipes:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
        // Clear only pending/generating recipes
        electron_1.ipcMain.handle('clear-pending-recipes', async () => {
            try {
                await this.storageService.clearPendingRecipes();
                return { success: true };
            }
            catch (error) {
                console.error('[IPC] Error clearing pending recipes:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
    }
}
exports.StorageHandlers = StorageHandlers;
