"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsHandlers = void 0;
const electron_1 = require("electron");
class SettingsHandlers {
    constructor(settingsService, imageProcessor, storageService) {
        this.settingsService = settingsService;
        this.imageProcessor = imageProcessor;
        this.storageService = storageService;
    }
    setupHandlers() {
        // Get settings
        electron_1.ipcMain.handle('get-settings', async () => {
            try {
                const settings = await this.settingsService.loadSettings();
                // Do not log sensitive data
                return {
                    success: true,
                    settings: { ...settings, openaiKey: settings.openaiKey ? '***' : undefined },
                };
            }
            catch (error) {
                console.error('[IPC] Error loading settings:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
        // Save settings
        electron_1.ipcMain.handle('save-settings', async (_event, partial) => {
            try {
                const saved = await this.settingsService.saveSettings(partial);
                if (partial.openaiKey !== undefined) {
                    // Update processor with new key (re-init AI analyzer lazily)
                    await this.imageProcessor.setOpenAIKey(partial.openaiKey);
                }
                if (partial.storageLocation !== undefined) {
                    // Update storage location
                    await this.storageService.setStorageLocation(partial.storageLocation);
                }
                return {
                    success: true,
                    settings: { ...saved, openaiKey: saved.openaiKey ? '***' : undefined },
                };
            }
            catch (error) {
                console.error('[IPC] Error saving settings:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
        // Update settings
        electron_1.ipcMain.handle('update-settings', async (_event, partial) => {
            try {
                const saved = await this.settingsService.saveSettings(partial);
                if (partial.openaiKey !== undefined) {
                    // Update processor with new key (re-init AI analyzer lazily)
                    await this.imageProcessor.setOpenAIKey(partial.openaiKey);
                }
                return {
                    success: true,
                    settings: { ...saved, openaiKey: saved.openaiKey ? '***' : undefined },
                };
            }
            catch (error) {
                console.error('[IPC] Error updating settings:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
    }
}
exports.SettingsHandlers = SettingsHandlers;
