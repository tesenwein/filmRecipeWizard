"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const electron_1 = require("electron");
class SettingsService {
    constructor() {
        this.settingsFile = null;
    }
    getSettingsFilePath() {
        if (!this.settingsFile) {
            const userDataPath = electron_1.app.getPath('userData');
            this.settingsFile = path.join(userDataPath, 'filmRecipeWizard-settings.json');
        }
        return this.settingsFile;
    }
    async loadSettings() {
        try {
            const settingsFilePath = this.getSettingsFilePath();
            const data = await fs.readFile(settingsFilePath, 'utf8');
            const settings = JSON.parse(data);
            return settings || {};
        }
        catch {
            return {};
        }
    }
    async saveSettings(partial) {
        const current = await this.loadSettings();
        const merged = { ...current, ...partial };
        const settingsFilePath = this.getSettingsFilePath();
        await fs.writeFile(settingsFilePath, JSON.stringify(merged, null, 2), 'utf8');
        return merged;
    }
}
exports.SettingsService = SettingsService;
