import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';

export interface ProcessHistory {
  id: string;
  timestamp: string;
  baseImage: string;
  targetImages: string[];
  results: ProcessResult[];
  status: 'completed' | 'failed' | 'in_progress';
}

export interface ProcessResult {
  inputPath: string;
  outputPath?: string;
  success: boolean;
  error?: string;
  metadata?: {
    aiAdjustments?: any;
    processingTime?: number;
  };
}

export class StorageService {
  private storageFile: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.storageFile = path.join(userDataPath, 'imageMatch-history.json');
  }

  async loadHistory(): Promise<ProcessHistory[]> {
    try {
      const data = await fs.readFile(this.storageFile, 'utf8');
      const history: ProcessHistory[] = JSON.parse(data);

      // Normalize stale statuses so UI doesn't get stuck on "in_progress"
      let mutated = false;
      const normalized = history.map((p) => {
        let status = p.status;
        // If a process is marked in_progress but has results, infer final status
        if (status === 'in_progress' && Array.isArray(p.results) && p.results.length > 0) {
          const anySuccess = p.results.some((r) => r.success);
          status = anySuccess ? 'completed' : 'failed';
          mutated = true;
        }
        // Ensure required fields exist
        const results = Array.isArray(p.results) ? p.results : [];
        return { ...p, status, results } as ProcessHistory;
      });

      // If we normalized anything, persist it back to disk
      if (mutated) {
        await this.saveHistory(normalized);
      }

      return normalized;
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
  }

  async getProcess(processId: string): Promise<ProcessHistory | null> {
    const history = await this.loadHistory();
    return history.find(p => p.id === processId) || null;
  }

  generateProcessId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
