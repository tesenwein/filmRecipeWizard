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
exports.FileHandlers = void 0;
const electron_1 = require("electron");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class FileHandlers {
    constructor(getMainWindow) {
        this.getMainWindow = getMainWindow;
    }
    setupHandlers() {
        // File selection handler
        electron_1.ipcMain.handle('select-files', async (_event, options) => {
            const mainWindow = this.getMainWindow();
            if (!mainWindow)
                return [];
            try {
                const result = await electron_1.dialog.showOpenDialog(mainWindow, {
                    title: options.title,
                    filters: options.filters,
                    properties: options.properties,
                });
                if (result.canceled)
                    return [];
                return result.filePaths;
            }
            catch (error) {
                console.error('[IPC] Error selecting files:', error);
                throw error;
            }
        });
        // Open path in system file manager
        electron_1.ipcMain.handle('open-path', async (_event, path) => {
            try {
                electron_1.shell.showItemInFolder(path);
                return { success: true };
            }
            catch (error) {
                console.error('[IPC] Error opening path:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
        // Handle dropped files - save to temp and return paths
        electron_1.ipcMain.handle('process-dropped-files', async (_event, files) => {
            const { app } = await Promise.resolve().then(() => __importStar(require('electron')));
            try {
                const tempDir = app.getPath('temp');
                const paths = [];
                for (const file of files) {
                    // Create temp file path with timestamp to avoid conflicts
                    const timestamp = Date.now() + Math.random().toString(36).substring(7);
                    const tempPath = path.join(tempDir, `dropped_${timestamp}_${file.name}`);
                    // Decode base64 and save to temp file
                    const buffer = Buffer.from(file.data.split(',')[1] || file.data, 'base64');
                    await fs.writeFile(tempPath, buffer);
                    paths.push(tempPath);
                }
                return paths;
            }
            catch (error) {
                console.error('[IPC] Error processing dropped files:', error);
                throw error;
            }
        });
        // Handle reading file content
        electron_1.ipcMain.handle('read-file', async (_event, filePath) => {
            try {
                const content = await fs.readFile(filePath, 'utf8');
                return content;
            }
            catch (error) {
                console.error('[IPC] Error reading file:', error);
                throw error;
            }
        });
        // Handle opening external URLs
        electron_1.ipcMain.handle('open-external', async (_event, url) => {
            try {
                await electron_1.shell.openExternal(url);
                return { success: true };
            }
            catch (error) {
                console.error('[IPC] Error opening external URL:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
    }
}
exports.FileHandlers = FileHandlers;
