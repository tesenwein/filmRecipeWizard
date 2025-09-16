import {
  app,
  BrowserWindow,
  Menu,
  MenuItemConstructorOptions,
  shell,
} from 'electron';
import * as path from 'path';
import { ImageProcessor } from './image-processor';
import { SettingsService } from './settings-service';
import { StorageService } from './storage-service';
import { ExportHandlers } from './ipc-handlers/export-handlers';
import { FileHandlers } from './ipc-handlers/file-handlers';
import { ProcessingHandlers } from './ipc-handlers/processing-handlers';
import { SettingsHandlers } from './ipc-handlers/settings-handlers';
import { StorageHandlers } from './ipc-handlers/storage-handlers';

class FilmRecipeWizardApp {
  private mainWindow: BrowserWindow | null = null;
  private imageProcessor: ImageProcessor;
  private storageService: StorageService;
  private settingsService: SettingsService;
  
  // IPC handlers
  private fileHandlers: FileHandlers;
  private processingHandlers: ProcessingHandlers;
  private storageHandlers: StorageHandlers;
  private settingsHandlers: SettingsHandlers;
  private exportHandlers: ExportHandlers;

  constructor() {
    this.imageProcessor = new ImageProcessor();
    this.storageService = new StorageService();
    this.settingsService = new SettingsService();
    
    // Initialize IPC handlers
    this.fileHandlers = new FileHandlers(() => this.mainWindow);
    this.processingHandlers = new ProcessingHandlers(() => this.mainWindow, this.imageProcessor, this.storageService);
    this.storageHandlers = new StorageHandlers(this.storageService);
    this.settingsHandlers = new SettingsHandlers(this.settingsService, this.imageProcessor, this.storageService);
    this.exportHandlers = new ExportHandlers(this.imageProcessor, this.storageService);
    
    this.setupApp();
    this.setupIPC();
  }

  private setupApp(): void {
    app.whenReady().then(() => {
      this.createWindow();
      this.createMenu();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
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

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
      
      // Block dev tools in production
      this.mainWindow.webContents.on('before-input-event', (event, input) => {
        // Block common dev tools shortcuts
        if (input.control && input.shift && input.key.toLowerCase() === 'i') {
          event.preventDefault();
        }
        if (input.control && input.shift && input.key.toLowerCase() === 'j') {
          event.preventDefault();
        }
        if (input.control && input.shift && input.key.toLowerCase() === 'c') {
          event.preventDefault();
        }
        if (input.key === 'F12') {
          event.preventDefault();
        }
        if (input.meta && input.alt && input.key.toLowerCase() === 'i') { // Mac
          event.preventDefault();
        }
      });

      // Block right-click context menu in production
      this.mainWindow.webContents.on('context-menu', (event) => {
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

  private createMenu(): void {
    const template: MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Exit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit(),
          },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          ...(process.env.NODE_ENV === 'development' ? [{ role: 'toggleDevTools' as const }] : []),
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
                shell.openExternal('https://github.com/tesenwein/filmRecipeWizard');
              } catch {
                // Ignore shell open errors
              }
            },
          },
          {
            label: 'Report Issues',
            click: () => {
              try {
                shell.openExternal('https://github.com/tesenwein/filmRecipeWizard/issues');
              } catch {
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
        label: app.getName(),
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

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupIPC(): void {
    // Setup all IPC handlers
    this.fileHandlers.setupHandlers();
    this.processingHandlers.setupHandlers();
    this.storageHandlers.setupHandlers();
    this.settingsHandlers.setupHandlers();
    this.exportHandlers.setupHandlers();
  }
}

// Create and start the application
new FilmRecipeWizardApp();