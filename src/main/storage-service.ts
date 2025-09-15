import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import { ProcessHistory } from '../shared/types';

export class StorageService {
  private storageFile: string;
  private backupDir: string;
  private initialized = false;
  private migrated = false;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.storageFile = path.join(userDataPath, 'fotoRecipeWizard-history.json');
    this.backupDir = path.join(userDataPath, 'history-backups');
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    // Ensure both the main storage directory and backup directory exist
    const storageDir = path.dirname(this.storageFile);
    await fs.mkdir(storageDir, { recursive: true });
    await fs.mkdir(this.backupDir, { recursive: true });
    // Clean up any stale temp history file from a previous interrupted save
    try {
      const tmp = `${this.storageFile}.tmp`;
      await fs.rm(tmp, { force: true });
    } catch {
      // Ignore errors when removing temp file
    }

    // Mark initialized BEFORE running migration to avoid re-entrant initialize() during saveRecipes()
    this.initialized = true;

    // Run migration only once on startup
    if (!this.migrated) {
      await this.migrateStatusField();
      this.migrated = true;
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

  // Migration to add status field to existing recipes (runs only once on startup)
  private async migrateStatusField(): Promise<void> {
    try {
      const data = await fs.readFile(this.storageFile, 'utf8');
      const raw: any[] = JSON.parse(data);

      // Check if migration is needed
      const needsMigration = raw.some((p: any) => p.status === undefined);
      if (!needsMigration) return;

      // Update processes without status field
      const migrated = raw.map((p: any) => ({
        ...p,
        status:
          p.status ||
          (Array.isArray(p.results) && p.results.length > 0 ? 'completed' : 'generating'),
      }));

      // Save the migrated data
      await this.saveRecipes(migrated);
    } catch {
      // If file doesn't exist or is corrupt, no migration needed
      console.log('[STORAGE] No migration needed - file not found or invalid');
    }
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
      return history;
    } catch {
      // File doesn't exist or is invalid, try backups
      console.warn('[STORAGE] Failed to load history; attempting backup restore');
      const fromBackup = await this.loadFromBackups();
      if (fromBackup) {
        // Migrate backup data and save to main file
        const migratedBackup = (fromBackup as any[]).map((p: any) => ({
          id: p.id,
          timestamp: p.timestamp,
          name: p.name,
          prompt: p.prompt,
          userOptions: p.userOptions,
          results: Array.isArray(p.results) ? p.results : [],
          recipeImageData:
            typeof p.recipeImageData === 'string'
              ? p.recipeImageData
              : typeof p.baseImageData === 'string'
              ? p.baseImageData
              : Array.isArray(p.baseImagesData) && typeof p.baseImagesData[0] === 'string'
              ? p.baseImagesData[0]
              : undefined,
          status:
            p.status ||
            (Array.isArray(p.results) && p.results.length > 0 ? 'completed' : 'generating'),
        }));

        // Save migrated backup to main file
        await this.saveRecipes(migratedBackup);
        return migratedBackup;
      }
      return [];
    }
  }

  async saveRecipes(history: ProcessHistory[]): Promise<void> {
    try {
      await this.initialize();
      await this.backupHistoryFile();
      const data = JSON.stringify(history, null, 2);
      // Atomic write: write to temp then rename
      const tmp = `${this.storageFile}.tmp`;
      await fs.writeFile(tmp, data, 'utf8');
      await fs.rename(tmp, this.storageFile);
    } catch (error) {
      console.error('[STORAGE] Failed to save history:', error);
      throw error;
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

  // Convert an image file to base64 JPEG data
  async convertImageToBase64(imagePath: string): Promise<string> {
    try {
      // Convert any supported image format to JPEG and resize for storage efficiency (1024px max long side)
      const jpegBuffer = await sharp(imagePath)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();

      const base64Data = jpegBuffer.toString('base64');
      return base64Data;
    } catch (error) {
      console.error(`[STORAGE] Failed to convert image to base64: ${imagePath}`, error);
      throw new Error(
        `Failed to convert image to base64: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  // Convert base64 data back to a temporary file path for processing
  async base64ToTempFile(base64Data: string, filename: string = 'temp.jpg'): Promise<string> {
    const os = await import('os');
    const tmpDir = path.join(os.tmpdir(), 'foto-recipe-wizard-base64');
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
      const tmpDir = path.join(os.tmpdir(), 'foto-recipe-wizard-base64');
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Directory might not exist, which is fine
      console.log(`[STORAGE] Temp directory already cleaned or doesn't exist`);
    }
  }
}
