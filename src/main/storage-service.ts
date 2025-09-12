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
      return JSON.parse(data);
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