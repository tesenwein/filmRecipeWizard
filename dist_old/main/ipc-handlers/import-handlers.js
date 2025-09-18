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
exports.ImportHandlers = void 0;
const electron_1 = require("electron");
const fs = __importStar(require("fs/promises"));
const xmp_parser_1 = require("../xmp-parser");
class ImportHandlers {
    constructor(storageService) {
        this.storageService = storageService;
    }
    setupHandlers() {
        // Import recipe(s) from ZIP
        electron_1.ipcMain.handle('import-recipe', async () => {
            try {
                const openRes = await electron_1.dialog.showOpenDialog({
                    title: 'Import Recipe(s) (ZIP)',
                    filters: [
                        { name: 'ZIP Files', extensions: ['zip'] },
                        { name: 'All Files', extensions: ['*'] },
                    ],
                    properties: ['openFile'],
                });
                if (openRes.canceled || openRes.filePaths.length === 0) {
                    return { success: false, error: 'Import canceled' };
                }
                const filePath = openRes.filePaths[0];
                const AdmZip = require('adm-zip');
                const zip = new AdmZip(filePath);
                // Check for bulk export (all-recipes.json) - try both at root and in subdirectories
                let bulkEntry = zip.getEntry('all-recipes.json');
                // If not found at root, search in subdirectories
                if (!bulkEntry) {
                    const entries = zip.getEntries();
                    for (const entry of entries) {
                        if (entry.entryName.endsWith('all-recipes.json')) {
                            bulkEntry = entry;
                            break;
                        }
                    }
                }
                if (bulkEntry) {
                    // Handle bulk import
                    const json = bulkEntry.getData().toString('utf8');
                    const parsed = JSON.parse(json);
                    if (parsed.schema !== 'film-recipe-wizard-bulk@1' || !Array.isArray(parsed.processes)) {
                        throw new Error('Invalid bulk recipe manifest');
                    }
                    // Import recipes, replacing existing ones if they match
                    let importedCount = 0;
                    let replacedCount = 0;
                    const existingRecipes = await this.storageService.loadRecipes();
                    for (const recipe of parsed.processes) {
                        if (recipe && Array.isArray(recipe.results)) {
                            // Check if a recipe with the same name and timestamp already exists
                            const existingRecipe = existingRecipes.find(existing => existing.name === recipe.name && existing.timestamp === recipe.timestamp);
                            if (existingRecipe) {
                                // Replace existing recipe
                                const updated = {
                                    ...existingRecipe,
                                    name: recipe.name,
                                    prompt: recipe.prompt,
                                    userOptions: recipe.userOptions,
                                    results: recipe.results,
                                    recipeImageData: recipe.recipeImageData,
                                    author: recipe.author,
                                };
                                await this.storageService.updateProcess(existingRecipe.id, updated);
                                replacedCount++;
                            }
                            else {
                                // Add new recipe
                                const newId = this.storageService.generateProcessId();
                                const imported = {
                                    id: newId,
                                    timestamp: recipe.timestamp || new Date().toISOString(), // Preserve original timestamp
                                    name: recipe.name,
                                    prompt: recipe.prompt,
                                    userOptions: recipe.userOptions,
                                    results: recipe.results,
                                    recipeImageData: recipe.recipeImageData,
                                    author: recipe.author,
                                };
                                await this.storageService.addProcess(imported);
                                importedCount++;
                            }
                        }
                    }
                    return { success: true, count: importedCount + replacedCount, replaced: replacedCount };
                }
                else {
                    // Handle single recipe import - try both at root and in subdirectories
                    let entry = zip.getEntry('recipe.json');
                    // If not found at root, search in subdirectories
                    if (!entry) {
                        const entries = zip.getEntries();
                        for (const e of entries) {
                            if (e.entryName.endsWith('recipe.json')) {
                                entry = e;
                                break;
                            }
                        }
                    }
                    if (!entry) {
                        // Provide more helpful error message
                        const entries = zip.getEntries();
                        const fileList = entries.map((e) => e.entryName).join(', ');
                        throw new Error(`Invalid recipe file: neither recipe.json nor all-recipes.json found. ZIP contains: ${fileList}`);
                    }
                    const json = entry.getData().toString('utf8');
                    const parsed = JSON.parse(json);
                    const process = parsed?.process;
                    if (!process || !Array.isArray(process.results)) {
                        throw new Error('Invalid recipe manifest');
                    }
                    // Check if a recipe with the same name and timestamp already exists
                    const existingRecipes = await this.storageService.loadRecipes();
                    const existingRecipe = existingRecipes.find(existing => existing.name === process.name && existing.timestamp === process.timestamp);
                    if (existingRecipe) {
                        // Replace existing recipe
                        const updated = {
                            ...existingRecipe,
                            name: process.name,
                            prompt: process.prompt,
                            userOptions: process.userOptions,
                            results: process.results,
                            recipeImageData: process.recipeImageData,
                            author: process.author,
                        };
                        await this.storageService.updateProcess(existingRecipe.id, updated);
                        return { success: true, count: 1, replaced: 1 };
                    }
                    else {
                        // Add new recipe
                        const newId = this.storageService.generateProcessId();
                        const imported = {
                            id: newId,
                            timestamp: process.timestamp || new Date().toISOString(), // Preserve original timestamp
                            name: process.name,
                            prompt: process.prompt,
                            userOptions: process.userOptions,
                            results: process.results,
                            recipeImageData: process.recipeImageData,
                            author: process.author,
                        };
                        await this.storageService.addProcess(imported);
                        return { success: true, count: 1, replaced: 0 };
                    }
                }
            }
            catch (error) {
                console.error('[IPC] Error importing recipe:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
        // Import XMP file to create a recipe
        electron_1.ipcMain.handle('import-xmp', async (_event, data) => {
            try {
                let xmpPath;
                let xmpContent;
                if (data.filePath && data.fileContent) {
                    // Use provided file path and content
                    xmpPath = data.filePath;
                    xmpContent = data.fileContent;
                }
                else {
                    // Fallback to file selection dialog
                    const result = await electron_1.dialog.showOpenDialog({
                        title: 'Import XMP Preset',
                        filters: [
                            { name: 'XMP Presets', extensions: ['xmp'] },
                            { name: 'All Files', extensions: ['*'] },
                        ],
                        properties: ['openFile'],
                    });
                    if (result.canceled || !result.filePaths.length) {
                        return { success: false, error: 'Import canceled' };
                    }
                    xmpPath = result.filePaths[0];
                    xmpContent = await fs.readFile(xmpPath, 'utf8');
                }
                // Parse the XMP content
                const parseResult = (0, xmp_parser_1.parseXMPContent)(xmpContent);
                if (!parseResult.success) {
                    return { success: false, error: parseResult.error || 'Failed to parse XMP file' };
                }
                if (!parseResult.adjustments) {
                    return { success: false, error: 'No valid adjustments found in XMP file' };
                }
                // Create a new recipe from the XMP data
                const newId = this.storageService.generateProcessId();
                const recipe = {
                    id: newId,
                    timestamp: new Date().toISOString(),
                    name: data.title || parseResult.presetName || 'Imported XMP Preset',
                    prompt: data.description || 'Imported from XMP preset',
                    results: [
                        {
                            success: true,
                            outputPath: xmpPath,
                            metadata: {
                                presetName: parseResult.presetName || 'Imported Preset',
                                groupFolder: 'imported-xmp',
                                aiAdjustments: parseResult.adjustments,
                                sourceType: 'xmp-import',
                                originalXmpPath: xmpPath,
                                xmpDescription: parseResult.description, // Store XMP description in metadata
                            },
                        },
                    ],
                    status: 'completed',
                };
                await this.storageService.addProcess(recipe);
                return { success: true, count: 1 };
            }
            catch (error) {
                console.error('[IPC] Error importing XMP:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
    }
}
exports.ImportHandlers = ImportHandlers;
