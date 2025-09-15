import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';
import { AppSettings } from '../shared/types';

export class SettingsService {
  private settingsFile: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.settingsFile = path.join(userDataPath, 'filmRecipeWizard-settings.json');
  }

  async loadSettings(): Promise<AppSettings> {
    try {
      const data = await fs.readFile(this.settingsFile, 'utf8');
      const settings: AppSettings = JSON.parse(data);
      return settings || {};
    } catch {
      return {};
    }
  }

  async saveSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.loadSettings();
    const merged: AppSettings = { ...current, ...partial };
    await fs.writeFile(this.settingsFile, JSON.stringify(merged, null, 2), 'utf8');
    return merged;
  }
}
