import { app } from 'electron';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { imageProcessingService } from '../services/image-processing-service';
import { AppSettings, DEFAULT_STORAGE_FOLDER, ProcessHistory } from '../shared/types';

export class StorageService {
  private storageFile: string;
  private backupDir: string;
  private initialized = false;
  private settingsFile: string | null = null;
  private storageLocation: string;
  private savingInProgress = false;

  private getSettingsFilePath(): string {
    if (!this.settingsFile) {
      const userDataPath = app.getPath('userData');
      this.settingsFile = path.join(userDataPath, 'settings.json');
    }
    return this.settingsFile;
  }

  constructor() {
    // Default storage location (will be overridden by settings if configured)
    const homeDir = os.homedir();
    this.storageLocation = path.join(homeDir, DEFAULT_STORAGE_FOLDER);
    this.storageFile = path.join(this.storageLocation, 'recipes.json');
    this.backupDir = path.join(this.storageLocation, 'backups');
  }

  async setStorageLocation(location: string): Promise<void> {
    this.storageLocation = location;
    this.storageFile = path.join(this.storageLocation, 'recipes.json');
    this.backupDir = path.join(this.storageLocation, 'backups');

    // Ensure the new directories exist
    try {
      await fs.mkdir(this.storageLocation, { recursive: true });
      await fs.mkdir(this.backupDir, { recursive: true });

      // Verify directories were created
      await fs.access(this.storageLocation);
      await fs.access(this.backupDir);
    } catch (error) {
      console.error('[STORAGE] Failed to create storage location directories:', { location, error });
      throw new Error(`Failed to create storage location directories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSettings(): Promise<AppSettings> {
    try {
      const settingsFilePath = this.getSettingsFilePath();
      const data = await fs.readFile(settingsFilePath, 'utf8');
      const settings = JSON.parse(data);

      // Apply storage location from settings if available
      if (settings.storageLocation) {
        await this.setStorageLocation(settings.storageLocation);
      }

      // Always return current storage location (either from settings or default)
      return { ...settings, storageLocation: this.storageLocation };
    } catch {
      // Return default storage location if no settings file exists
      return { storageLocation: this.storageLocation };
    }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const settingsFilePath = this.getSettingsFilePath();
    const settingsDir = path.dirname(settingsFilePath);
    await fs.mkdir(settingsDir, { recursive: true });
    await fs.writeFile(settingsFilePath, JSON.stringify(settings, null, 2), 'utf8');

    // Apply storage location if it changed
    if (settings.storageLocation) {
      await this.setStorageLocation(settings.storageLocation);
    }
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load settings to get storage location
      await this.getSettings();

      // Ensure both the main storage directory and backup directory exist
      const storageDir = path.dirname(this.storageFile);
      console.log('[STORAGE] Creating storage directory:', storageDir);

      // Create directories with explicit error handling
      try {
        await fs.mkdir(storageDir, { recursive: true });
        await fs.mkdir(this.backupDir, { recursive: true });
      } catch (mkdirError) {
        console.error('[STORAGE] Failed to create directories:', mkdirError);
        throw new Error(`Failed to create storage directories: ${mkdirError instanceof Error ? mkdirError.message : 'Unknown error'}`);
      }

      // Verify directories were created and are accessible
      try {
        await fs.access(storageDir);
        await fs.access(this.backupDir);
        console.log('[STORAGE] Storage directories verified:', { storageDir, backupDir: this.backupDir });
      } catch (error) {
        console.error('[STORAGE] Failed to access created directories:', { storageDir, backupDir: this.backupDir }, error);
        throw new Error(`Failed to access storage directories: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Clean up any stale temp history file from a previous interrupted save
      try {
        const tmp = `${this.storageFile}.tmp`;
        await fs.rm(tmp, { force: true });
      } catch {
        // Ignore errors when removing temp file
      }

      this.initialized = true;
    } catch (error) {
      console.error('[STORAGE] Initialization failed:', error);
      throw error;
    }
  }

  private async backupHistoryFile(): Promise<void> {
    try {
      // Create a timestamped backup of the current history file, if it exists
      try {
        await fs.stat(this.storageFile);
      } catch {
        return; // Nothing to back up
      }

      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `history-${ts}.json`);
      const contents = await fs.readFile(this.storageFile);
      await fs.writeFile(backupPath, contents);

      // Prune old backups, keep the most recent N
      const maxBackups = 20;
      try {
        const entries = await fs.readdir(this.backupDir);
        const files = entries
          .filter(f => f.startsWith('history-') && f.endsWith('.json'))
          .map(f => ({
            name: f,
            time: (() => {
              const m = f.match(/history-(.*)\.json$/);
              return m ? m[1] : f;
            })(),
          }))
          .sort((a, b) => (a.time < b.time ? 1 : -1));
        for (let i = maxBackups; i < files.length; i++) {
          try {
            await fs.rm(path.join(this.backupDir, files[i].name));
          } catch {
            // Ignore errors when removing old backups
          }
        }
      } catch {
        // Ignore errors when accessing backup directory
      }
    } catch (e) {
      console.warn('[STORAGE] Failed to create history backup:', e);
    }
  }

  private async loadFromBackups(): Promise<ProcessHistory[] | null> {
    try {
      const entries = await fs.readdir(this.backupDir);
      const backups = entries
        .filter(f => f.startsWith('history-') && f.endsWith('.json'))
        .sort()
        .reverse();
      for (const f of backups) {
        try {
          const data = await fs.readFile(path.join(this.backupDir, f), 'utf8');
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            console.warn('[STORAGE] Restored history from backup:', f);
            // Restore backup to primary file for future use
            await fs.writeFile(this.storageFile, JSON.stringify(parsed, null, 2), 'utf8');
            return parsed as ProcessHistory[];
          }
        } catch {
          // Try next backup
        }
      }
    } catch {
      // No backups yet
    }
    return null;
  }

  async loadRecipes(): Promise<ProcessHistory[]> {
    try {
      await this.initialize();

      const data = await fs.readFile(this.storageFile, 'utf8');
      const raw: any[] = JSON.parse(data);
      const history: ProcessHistory[] = (raw || []).map((p: any) => ({
        id: p.id,
        timestamp: p.timestamp,
        name: p.name,
        prompt: p.prompt,
        userOptions: p.userOptions,
        results: Array.isArray(p.results) ? p.results : [],
        author: p.author,
        // Persisted recipe image (single) — maintain backward compatibility
        recipeImageData:
          typeof p.recipeImageData === 'string'
            ? p.recipeImageData
            : typeof p.baseImageData === 'string'
              ? p.baseImageData
              : Array.isArray(p.baseImagesData) && typeof p.baseImagesData[0] === 'string'
                ? p.baseImagesData[0]
                : undefined,
        status: p.status,
      }));
      // Normalize entries (backfill missing ids or timestamps)
      let changed = false;
      const nowIso = new Date().toISOString();
      for (const rec of history) {
        if (!rec.id || typeof rec.id !== 'string' || rec.id.trim().length === 0) {
          rec.id = this.generateProcessId();
          changed = true;
        }
        if (!rec.timestamp || typeof rec.timestamp !== 'string') {
          rec.timestamp = nowIso;
          changed = true;
        }
        if (!rec.status) {
          rec.status = 'completed';
          changed = true;
        }
      }
      if (changed) {
        // Persist normalized history to avoid future issues (e.g., deletion not working)
        await this.saveRecipes(history);
      }
      return history;
    } catch {
      // File doesn't exist or is invalid, try backups
      console.warn('[STORAGE] Failed to load history; attempting backup restore');
      const fromBackup = await this.loadFromBackups();
      if (fromBackup) {
        return fromBackup;
      }
      return [];
    }
  }

  async saveRecipes(history: ProcessHistory[]): Promise<void> {
    // Prevent recursive calls
    if (this.savingInProgress) {
      console.log('[STORAGE] Save already in progress, skipping recursive call');
      return;
    }

    this.savingInProgress = true;
    try {
      await this.initialize();
      await this.backupHistoryFile();

      // Ensure the target directory exists before any file operations
      const storageDir = path.dirname(this.storageFile);
      await fs.mkdir(storageDir, { recursive: true });

      // Verify the directory was created successfully
      try {
        await fs.access(storageDir);
      } catch (error) {
        console.error('[STORAGE] Storage directory does not exist after creation:', storageDir, error);
        throw new Error(`Failed to create storage directory: ${storageDir}`);
      }

      const data = JSON.stringify(history, null, 2);
      // Atomic write: write to temp then rename
      const tmp = `${this.storageFile}.tmp`;

      console.log('[STORAGE] Writing temporary file:', tmp);
      await fs.writeFile(tmp, data, 'utf8');

      // Verify the temp file was created
      try {
        await fs.access(tmp);
        console.log('[STORAGE] Temporary file created successfully:', tmp);
      } catch (error) {
        console.error('[STORAGE] Temporary file was not created:', tmp, error);
        throw new Error(`Failed to create temporary file: ${tmp}`);
      }

      console.log('[STORAGE] Renaming temporary file to:', this.storageFile);
      await fs.rename(tmp, this.storageFile);
      console.log('[STORAGE] File rename completed successfully');
    } catch (error) {
      console.error('[STORAGE] Failed to save history:', error);
      // Clean up temp file if it exists
      try {
        await fs.rm(`${this.storageFile}.tmp`, { force: true });
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    } finally {
      this.savingInProgress = false;
    }
  }

  async addProcess(process: ProcessHistory): Promise<void> {
    const history = await this.loadRecipes();
    history.unshift(process); // Add to beginning for most recent first

    // Keep only last N processes to prevent file from growing too large
    const maxHistory = 200;
    if (history.length > maxHistory) {
      history.splice(maxHistory);
    }

    await this.saveRecipes(history);
  }

  async updateProcess(processId: string, updates: Partial<ProcessHistory>): Promise<void> {
    const history = await this.loadRecipes();
    const index = history.findIndex(p => p.id === processId);

    if (index >= 0) {
      history[index] = { ...history[index], ...updates };
      await this.saveRecipes(history);
    } else {
      console.warn('[STORAGE] Process not found for update:', processId);
    }
  }

  async deleteProcess(processId: string): Promise<void> {
    const history = await this.loadRecipes();
    const filteredHistory = history.filter(p => p.id !== processId);
    await this.saveRecipes(filteredHistory);

    // Clean up any temporary files (optional)
    await this.cleanupTempFiles();
  }

  async deleteMultipleProcesses(processIds: string[]): Promise<void> {
    const history = await this.loadRecipes();
    const filteredHistory = history.filter(p => !processIds.includes(p.id));
    await this.saveRecipes(filteredHistory);

    // Clean up any temporary files (optional)
    await this.cleanupTempFiles();
  }

  async getProcess(processId: string): Promise<ProcessHistory | null> {
    const history = await this.loadRecipes();
    return history.find(p => p.id === processId) || null;
  }

  generateProcessId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  async clearRecipes(): Promise<void> {
    await this.initialize();
    await this.backupHistoryFile();

    // Write empty history
    const emptyHistory: ProcessHistory[] = [];
    const temp = `${this.storageFile}.tmp`;

    await fs.writeFile(temp, JSON.stringify(emptyHistory, null, 2));
    await fs.rename(temp, this.storageFile);

    await this.cleanupTempFiles();
  }

  async clearPendingRecipes(): Promise<void> {
    await this.initialize();

    const history = await this.loadRecipes();
    const filteredHistory = history.filter(recipe => recipe.status !== 'generating');

    if (filteredHistory.length !== history.length) {
      console.log(`[STORAGE] Clearing ${history.length - filteredHistory.length} pending recipes`);
      await this.saveRecipes(filteredHistory);
    }
  }

  // Convert an image file to base64 JPEG data
  async convertImageToBase64(imagePath: string): Promise<string> {
    try {
      // Use the centralized image processing service
      return await imageProcessingService.convertToBase64Jpeg(imagePath);
    } catch (error) {
      console.error(`[STORAGE] Failed to convert image to base64: ${imagePath}`, error);
      throw new Error(
        `Failed to convert image to base64: ${error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  // Convert base64 data back to a temporary file path for processing
  async base64ToTempFile(base64Data: string, filename: string = 'temp.jpg'): Promise<string> {
    const os = await import('os');
    const tmpDir = path.join(os.tmpdir(), 'film-recipe-wizard-base64');
    await fs.mkdir(tmpDir, { recursive: true });

    const tempPath = path.join(tmpDir, `${Date.now()}-${filename}`);
    const buffer = Buffer.from(base64Data, 'base64');

    await fs.writeFile(tempPath, buffer);

    return tempPath;
  }

  // Generate a data URL from base64 data for UI preview
  getImageDataUrl(base64Data: string): string {
    return `data:image/jpeg;base64,${base64Data}`;
  }

  // Clean up temporary files
  async cleanupTempFiles(): Promise<void> {
    try {
      const os = await import('os');
      const tmpDir = path.join(os.tmpdir(), 'film-recipe-wizard-base64');
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Directory might not exist, which is fine
    }
  }
}
