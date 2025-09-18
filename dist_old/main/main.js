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
const electron_1 = require("electron");
const path = __importStar(require("path"));
const image_processor_1 = require("./image-processor");
const export_handlers_1 = require("./ipc-handlers/export-handlers");
const file_handlers_1 = require("./ipc-handlers/file-handlers");
const import_handlers_1 = require("./ipc-handlers/import-handlers");
const processing_handlers_1 = require("./ipc-handlers/processing-handlers");
const settings_handlers_1 = require("./ipc-handlers/settings-handlers");
const storage_handlers_1 = require("./ipc-handlers/storage-handlers");
const settings_service_1 = require("./settings-service");
const storage_service_1 = require("./storage-service");
class FilmRecipeWizardApp {
    constructor() {
        this.mainWindow = null;
        this.imageProcessor = new image_processor_1.ImageProcessor();
        this.storageService = new storage_service_1.StorageService();
        this.settingsService = new settings_service_1.SettingsService();
        // Initialize IPC handlers
        this.fileHandlers = new file_handlers_1.FileHandlers(() => this.mainWindow);
        this.importHandlers = new import_handlers_1.ImportHandlers(this.storageService);
        this.processingHandlers = new processing_handlers_1.ProcessingHandlers(() => this.mainWindow, this.imageProcessor, this.storageService);
        this.storageHandlers = new storage_handlers_1.StorageHandlers(this.storageService, this.settingsService, this.imageProcessor);
        this.settingsHandlers = new settings_handlers_1.SettingsHandlers(this.settingsService, this.imageProcessor, this.storageService);
        this.exportHandlers = new export_handlers_1.ExportHandlers(this.imageProcessor, this.storageService);
        this.setupApp();
        this.setupIPC();
    }
    setupApp() {
        electron_1.app.whenReady().then(() => {
            this.createWindow();
            this.createMenu();
            electron_1.app.on('activate', () => {
                if (electron_1.BrowserWindow.getAllWindows().length === 0) {
                    this.createWindow();
                }
            });
        });
        electron_1.app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                electron_1.app.quit();
            }
        });
    }
    createWindow() {
        this.mainWindow = new electron_1.BrowserWindow({
            width: 1200,
            height: 900,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js'),
                devTools: process.env.NODE_ENV === 'development',
            },
            titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
            show: false,
        });
        const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === '1' || !electron_1.app.isPackaged;
        if (isDev) {
            this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
            console.log('[MAIN] Development mode detected, use Ctrl+Shift+I to open dev tools');
        }
        else {
            this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
            // Block dev tools in production (but allow our custom shortcut)
            this.mainWindow.webContents.on('before-input-event', (event, input) => {
                // Handle our custom dev tools shortcut
                if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i') {
                    if (this.mainWindow?.webContents.isDevToolsOpened()) {
                        this.mainWindow.webContents.closeDevTools();
                    }
                    else {
                        this.mainWindow?.webContents.openDevTools();
                    }
                    event.preventDefault();
                    return;
                }
                // Block other dev tools shortcuts
                if (input.control && input.shift && input.key.toLowerCase() === 'j') {
                    event.preventDefault();
                }
                if (input.control && input.shift && input.key.toLowerCase() === 'c') {
                    event.preventDefault();
                }
                if (input.key === 'F12') {
                    event.preventDefault();
                }
                if (input.meta && input.alt && input.key.toLowerCase() === 'i') {
                    // Mac
                    event.preventDefault();
                }
            });
            // Block right-click context menu in production
            this.mainWindow.webContents.on('context-menu', event => {
                event.preventDefault();
            });
            // Block dev tools from being opened programmatically
            this.mainWindow.webContents.on('devtools-opened', () => {
                this.mainWindow?.webContents.closeDevTools();
            });
        }
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow?.show();
        });
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });
    }
    createMenu() {
        const template = [
            {
                label: 'File',
                submenu: [
                    {
                        label: 'Exit',
                        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                        click: () => electron_1.app.quit(),
                    },
                ],
            },
            {
                label: 'Edit',
                submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }],
            },
            {
                label: 'View',
                submenu: [
                    { role: 'reload' },
                    { role: 'forceReload' },
                    ...(process.env.NODE_ENV === 'development' ? [{ role: 'toggleDevTools' }] : []),
                    { type: 'separator' },
                    { role: 'resetZoom' },
                    { role: 'zoomIn' },
                    { role: 'zoomOut' },
                    { type: 'separator' },
                    { role: 'togglefullscreen' },
                ],
            },
            {
                label: 'Help',
                submenu: [
                    {
                        label: 'GitHub Repository',
                        click: () => {
                            try {
                                electron_1.shell.openExternal('https://github.com/tesenwein/filmRecipeWizard');
                            }
                            catch {
                                // Ignore shell open errors
                            }
                        },
                    },
                    {
                        label: 'Report Issues',
                        click: () => {
                            try {
                                electron_1.shell.openExternal('https://github.com/tesenwein/filmRecipeWizard/issues');
                            }
                            catch {
                                // Ignore shell open errors
                            }
                        },
                    },
                ],
            },
            {
                label: 'Window',
                submenu: [{ role: 'minimize' }, { role: 'close' }],
            },
        ];
        if (process.platform === 'darwin') {
            template.unshift({
                label: electron_1.app.getName(),
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'services' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideOthers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit' },
                ],
            });
        }
        const menu = electron_1.Menu.buildFromTemplate(template);
        electron_1.Menu.setApplicationMenu(menu);
    }
    setupIPC() {
        // Setup all IPC handlers
        this.fileHandlers.setupHandlers();
        this.importHandlers.setupHandlers();
        this.processingHandlers.setupHandlers();
        this.storageHandlers.setupHandlers();
        this.settingsHandlers.setupHandlers();
        this.exportHandlers.setupHandlers();
    }
}
// Create and start the application
new FilmRecipeWizardApp();
