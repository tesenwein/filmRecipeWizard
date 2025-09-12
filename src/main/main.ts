import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import * as path from 'path';
import { ImageProcessor } from './image-processor';

class ImageMatchApp {
  private mainWindow: BrowserWindow | null = null;
  private imageProcessor: ImageProcessor;

  constructor() {
    this.imageProcessor = new ImageProcessor();
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
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
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
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private createMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Open Base Image',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.openBaseImage(),
          },
          {
            label: 'Add Target Images',
            accelerator: 'CmdOrCtrl+Shift+O',
            click: () => this.openTargetImages(),
          },
          { type: 'separator' },
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
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
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

  private async openBaseImage(): Promise<void> {
    if (!this.mainWindow) return;

    const result = await dialog.showOpenDialog(this.mainWindow, {
      properties: ['openFile'],
      filters: [
        {
          name: 'Images',
          extensions: ['dng', 'jpg', 'jpeg', 'png', 'tiff', 'tif', 'cr2', 'nef', 'arw'],
        },
      ],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      this.mainWindow.webContents.send('base-image-selected', result.filePaths[0]);
    }
  }

  private async openTargetImages(): Promise<void> {
    if (!this.mainWindow) return;

    const result = await dialog.showOpenDialog(this.mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Images',
          extensions: ['dng', 'jpg', 'jpeg', 'png', 'tiff', 'tif', 'cr2', 'nef', 'arw'],
        },
      ],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      this.mainWindow.webContents.send('target-images-selected', result.filePaths);
    }
  }

  private setupIPC(): void {
    // Handle image processing requests
    ipcMain.handle('process-image', async (event, data) => {
      try {
        return await this.imageProcessor.processImage(data);
      } catch (error) {
        console.error('Error processing image:', error);
        throw error;
      }
    });

    // Handle color analysis requests
    ipcMain.handle('analyze-colors', async (event, imagePath) => {
      try {
        return await this.imageProcessor.analyzeColors(imagePath);
      } catch (error) {
        console.error('Error analyzing colors:', error);
        throw error;
      }
    });

    // Handle style matching requests
    ipcMain.handle('match-style', async (event, data) => {
      try {
        return await this.imageProcessor.matchStyle(data);
      } catch (error) {
        console.error('Error matching style:', error);
        throw error;
      }
    });

    // Handle preset generation
    ipcMain.handle('generate-preset', async (event, data) => {
      try {
        return await this.imageProcessor.generateLightroomPreset(data);
      } catch (error) {
        console.error('Error generating preset:', error);
        throw error;
      }
    });
  }
}

// Create and start the application
new ImageMatchApp();