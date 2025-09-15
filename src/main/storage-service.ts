import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';
import sharp from 'sharp';
import { ProcessHistory } from '../shared/types';

export class StorageService {
  private storageFile: string;
  private backupDir: string;
  private initialized = false;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.storageFile = path.join(userDataPath, 'fotoRecipeWizard-history.json');
    this.backupDir = path.join(userDataPath, 'history-backups');
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      // Ensure backup directory exists
      await fs.mkdir(this.backupDir, { recursive: true });
      // Clean up any stale temp history file from a previous interrupted save
      try {
        const tmp = `${this.storageFile}.tmp`;
        await fs.rm(tmp, { force: true });
      } catch {
        // Ignore errors when removing temp file
      }
    } finally {
      this.initialized = true;
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

  async loadHistory(): Promise<ProcessHistory[]> {
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
      }));
      return history;
    } catch {
      // File doesn't exist or is invalid, try backups
      console.warn('[STORAGE] Failed to load history; attempting backup restore');
      const fromBackup = await this.loadFromBackups();
      if (fromBackup) {
        return (fromBackup as any[]).map((p: any) => ({
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
        }));
      }
      console.log('[STORAGE] No existing history or valid backup, starting fresh');
      return [];
    }
  }

  async saveHistory(history: ProcessHistory[]): Promise<void> {
    try {
      await this.initialize();
      await this.backupHistoryFile();
      const data = JSON.stringify(history, null, 2);
      // Atomic write: write to temp then rename
      const tmp = `${this.storageFile}.tmp`;
      await fs.writeFile(tmp, data, 'utf8');
      await fs.rename(tmp, this.storageFile);
      console.log('[STORAGE] History saved successfully');
    } catch (error) {
      console.error('[STORAGE] Failed to save history:', error);
      throw error;
    }
  }

  async addProcess(process: ProcessHistory): Promise<void> {
    const history = await this.loadHistory();
    history.unshift(process); // Add to beginning for most recent first

    // Keep only last N processes to prevent file from growing too large
    const maxHistory = 200;
    if (history.length > maxHistory) {
      history.splice(maxHistory);
    }

    await this.saveHistory(history);
  }

  async updateProcess(processId: string, updates: Partial<ProcessHistory>): Promise<void> {
    const history = await this.loadHistory();
    const index = history.findIndex(p => p.id === processId);
    
    if (index >= 0) {
      history[index] = { ...history[index], ...updates };
      await this.saveHistory(history);
    } else {
      console.warn('[STORAGE] Process not found for update:', processId);
    }
  }

  async deleteProcess(processId: string): Promise<void> {
    const history = await this.loadHistory();
    const filteredHistory = history.filter(p => p.id !== processId);
    await this.saveHistory(filteredHistory);

    // Clean up any temporary files (optional)
    await this.cleanupTempFiles();
  }

  async getProcess(processId: string): Promise<ProcessHistory | null> {
    const history = await this.loadHistory();
    return history.find(p => p.id === processId) || null;
  }

  generateProcessId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Convert an image file to base64 JPEG data
  async convertImageToBase64(imagePath: string): Promise<string> {
    try {
      console.log(`[STORAGE] Converting image to base64: ${path.basename(imagePath)}`);

      // Convert any supported image format to JPEG and resize for storage efficiency (1024px max long side)
      const jpegBuffer = await sharp(imagePath)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();

      const base64Data = jpegBuffer.toString('base64');
      console.log(`[STORAGE] Converted image to base64 (${Math.round(base64Data.length / 1024)}KB)`);

      return base64Data;
    } catch (error) {
      console.error(`[STORAGE] Failed to convert image to base64: ${imagePath}`, error);
      throw new Error(`Failed to convert image to base64: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    console.log(`[STORAGE] Created temp file from base64: ${tempPath}`);

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
      console.log(`[STORAGE] Cleaned up temp files: ${tmpDir}`);
    } catch {
      // Directory might not exist, which is fine
      console.log(`[STORAGE] Temp directory already cleaned or doesn't exist`);
    }
  }
}
