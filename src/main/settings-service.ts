import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';
import { AppSettings } from '../shared/types';

export class SettingsService {
  private settingsFile: string | null = null;

  private getSettingsFilePath(): string {
    if (!this.settingsFile) {
      const userDataPath = app.getPath('userData');
      this.settingsFile = path.join(userDataPath, 'filmRecipeWizard-settings.json');
    }
    return this.settingsFile;
  }

  async loadSettings(): Promise<AppSettings> {
    try {
      const settingsFilePath = this.getSettingsFilePath();
      const data = await fs.readFile(settingsFilePath, 'utf8');
      const settings: AppSettings = JSON.parse(data);
      return settings || {};
    } catch {
      return {};
    }
  }

  async saveSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.loadSettings();
    const merged: AppSettings = { ...current, ...partial };
    const settingsFilePath = this.getSettingsFilePath();
    await fs.writeFile(settingsFilePath, JSON.stringify(merged, null, 2), 'utf8');
    return merged;
  }
}
