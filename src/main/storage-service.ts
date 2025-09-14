import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';
import sharp from 'sharp';
import { ProcessHistory } from '../shared/types';

export class StorageService {
  private storageFile: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.storageFile = path.join(userDataPath, 'imageMatch-history.json');
  }

  async loadHistory(): Promise<ProcessHistory[]> {
    try {
      const data = await fs.readFile(this.storageFile, 'utf8');
      const raw: any[] = JSON.parse(data);
      const history: ProcessHistory[] = (raw || []).map((p: any) => ({
        id: p.id,
        timestamp: p.timestamp,
        name: p.name,
        prompt: p.prompt,
        results: Array.isArray(p.results) ? p.results : [],
        // Preserve stored base64 image data if present
        baseImageData: typeof p.baseImageData === 'string' ? p.baseImageData : undefined,
        targetImageData: Array.isArray(p.targetImageData) ? p.targetImageData : undefined,
      }));
      return history;
    } catch (error) {
      // File doesn't exist or is invalid, return empty array
      console.log('[STORAGE] No existing history file, starting fresh');
      return [];
    }
  }

  async saveHistory(history: ProcessHistory[]): Promise<void> {
    try {
      const data = JSON.stringify(history, null, 2);
      await fs.writeFile(this.storageFile, data, 'utf8');
      console.log('[STORAGE] History saved successfully');
    } catch (error) {
      console.error('[STORAGE] Failed to save history:', error);
      throw error;
    }
  }

  async addProcess(process: ProcessHistory): Promise<void> {
    const history = await this.loadHistory();
    history.unshift(process); // Add to beginning for most recent first
    
    // Keep only last 50 processes to prevent file from growing too large
    const maxHistory = 50;
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

      // Convert any supported image format to JPEG and resize for storage efficiency
      const jpegBuffer = await sharp(imagePath)
        .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
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
    const tmpDir = path.join(os.tmpdir(), 'image-match-base64');
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
      const tmpDir = path.join(os.tmpdir(), 'image-match-base64');
      await fs.rm(tmpDir, { recursive: true, force: true });
      console.log(`[STORAGE] Cleaned up temp files: ${tmpDir}`);
    } catch (error) {
      // Directory might not exist, which is fine
      console.log(`[STORAGE] Temp directory already cleaned or doesn't exist`);
    }
  }
}
