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
exports.ExportHandlers = void 0;
const electron_1 = require("electron");
const fs = __importStar(require("fs/promises"));
const xmp_generator_1 = require("../xmp-generator");
class ExportHandlers {
    constructor(imageProcessor, storageService) {
        this.imageProcessor = imageProcessor;
        this.storageService = storageService;
    }
    setupHandlers() {
        // Handle XMP download - generate XMP and show save dialog
        electron_1.ipcMain.handle('download-xmp', async (_event, processId) => {
            try {
                const process = await this.storageService.getProcess(processId);
                if (!process) {
                    return { success: false, error: 'Process not found' };
                }
                const result = process.results?.[0];
                if (!result?.success || !result.metadata?.aiAdjustments) {
                    return { success: false, error: 'No valid processing results found' };
                }
                // Generate XMP content
                const xmpContent = (0, xmp_generator_1.generateXMPContent)(result.metadata.aiAdjustments, result.metadata.aiAdjustments, result.metadata.usedSettings?.preserveSkinTones);
                // Suggest a friendly default filename
                const aiName = process?.results?.[0]?.metadata?.aiAdjustments?.preset_name;
                const rawName = (process.name || aiName || `Recipe-${process.id || 'export'}`).toString();
                const safeName = rawName
                    .replace(/[^A-Za-z0-9 _-]+/g, '')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .replace(/\s/g, '-');
                const saveRes = await electron_1.dialog.showSaveDialog({
                    title: 'Export XMP Preset',
                    defaultPath: `${safeName || 'Recipe'}.xmp`,
                    filters: [
                        { name: 'XMP Presets', extensions: ['xmp'] },
                        { name: 'All Files', extensions: ['*'] },
                    ],
                });
                if (saveRes.canceled || !saveRes.filePath) {
                    return { success: false, error: 'Export canceled' };
                }
                await fs.writeFile(saveRes.filePath, xmpContent, 'utf8');
                return { success: true, filePath: saveRes.filePath };
            }
            catch (error) {
                console.error('[IPC] Error exporting XMP:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
        // Export single recipe to ZIP
        electron_1.ipcMain.handle('export-recipe', async (_event, processId) => {
            try {
                const process = await this.storageService.getProcess(processId);
                if (!process) {
                    return { success: false, error: 'Process not found' };
                }
                // Suggest a friendly default filename
                const aiName = process?.results?.[0]?.metadata?.aiAdjustments?.preset_name;
                const rawName = (process.name || aiName || `Recipe-${process.id || 'export'}`).toString();
                const safeName = rawName
                    .replace(/[^A-Za-z0-9 _-]+/g, '')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .replace(/\s/g, '-');
                const saveRes = await electron_1.dialog.showSaveDialog({
                    title: 'Export Recipe (ZIP)',
                    defaultPath: `${safeName || 'Recipe'}.frw.zip`,
                    filters: [
                        { name: 'Film Recipe Wizard Zip', extensions: ['zip'] },
                        { name: 'All Files', extensions: ['*'] },
                    ],
                });
                if (saveRes.canceled || !saveRes.filePath) {
                    return { success: false, error: 'Export canceled' };
                }
                // Build ZIP contents
                const AdmZip = require('adm-zip');
                const zip = new AdmZip();
                // Clean up process to remove absolute paths
                const cleanedProcess = { ...process };
                if (cleanedProcess.results) {
                    cleanedProcess.results = cleanedProcess.results.map(result => {
                        const cleanedResult = { ...result };
                        // Remove absolute paths - these are temporary/local paths that won't be valid on import
                        delete cleanedResult.inputPath;
                        delete cleanedResult.outputPath;
                        return cleanedResult;
                    });
                }
                // Write manifest with embedded base64 images and results
                const manifest = {
                    schema: 'film-recipe-wizard@1',
                    exportedAt: new Date().toISOString(),
                    process: cleanedProcess,
                };
                zip.addFile('recipe.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));
                // Also export recipe image if available
                if (process.recipeImageData) {
                    const buf = Buffer.from(process.recipeImageData, 'base64');
                    zip.addFile('images/recipe.jpg', buf);
                }
                // Write ZIP file
                await fs.writeFile(saveRes.filePath, zip.toBuffer());
                return { success: true, filePath: saveRes.filePath };
            }
            catch (error) {
                console.error('[IPC] Error exporting recipe:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
        // Export all recipes to a ZIP file
        electron_1.ipcMain.handle('export-all-recipes', async () => {
            try {
                const processes = await this.storageService.loadRecipes();
                if (!processes || processes.length === 0) {
                    return { success: false, error: 'No recipes found to export' };
                }
                const saveRes = await electron_1.dialog.showSaveDialog({
                    title: 'Export All Recipes (ZIP)',
                    defaultPath: `Film-Recipe-Wizard-All-Recipes-${new Date().toISOString().split('T')[0]}.frw.zip`,
                    filters: [
                        { name: 'Film Recipe Wizard Zip', extensions: ['zip'] },
                        { name: 'All Files', extensions: ['*'] },
                    ],
                });
                if (saveRes.canceled || !saveRes.filePath) {
                    return { success: false, error: 'Export canceled' };
                }
                // Build ZIP contents
                const AdmZip = require('adm-zip');
                const zip = new AdmZip();
                // Clean up processes to remove absolute paths
                const cleanedProcesses = processes.map(process => {
                    const cleanedProcess = { ...process };
                    if (cleanedProcess.results) {
                        cleanedProcess.results = cleanedProcess.results.map(result => {
                            const cleanedResult = { ...result };
                            // Remove absolute paths - these are temporary/local paths that won't be valid on import
                            delete cleanedResult.inputPath;
                            delete cleanedResult.outputPath;
                            return cleanedResult;
                        });
                    }
                    return cleanedProcess;
                });
                // Write bulk manifest
                const manifest = {
                    schema: 'film-recipe-wizard-bulk@1',
                    exportedAt: new Date().toISOString(),
                    processes: cleanedProcesses,
                };
                zip.addFile('all-recipes.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));
                // Also export recipe images if available
                for (let i = 0; i < processes.length; i++) {
                    const process = processes[i];
                    if (process.recipeImageData) {
                        const buf = Buffer.from(process.recipeImageData, 'base64');
                        zip.addFile(`images/recipe-${i}.jpg`, buf);
                    }
                }
                // Write ZIP file
                await fs.writeFile(saveRes.filePath, zip.toBuffer());
                return { success: true, filePath: saveRes.filePath, count: processes.length };
            }
            catch (error) {
                console.error('[IPC] Error exporting all recipes:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
    }
}
exports.ExportHandlers = ExportHandlers;
