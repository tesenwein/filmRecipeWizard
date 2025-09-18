import { AppSettings } from '../shared/types';
export declare class SettingsService {
    private settingsFile;
    private getSettingsFilePath;
    loadSettings(): Promise<AppSettings>;
    saveSettings(partial: Partial<AppSettings>): Promise<AppSettings>;
}
