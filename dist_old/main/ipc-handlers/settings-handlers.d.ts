import { ImageProcessor } from '../image-processor';
import { SettingsService } from '../settings-service';
import { StorageService } from '../storage-service';
export declare class SettingsHandlers {
    private settingsService;
    private imageProcessor;
    private storageService;
    constructor(settingsService: SettingsService, imageProcessor: ImageProcessor, storageService: StorageService);
    setupHandlers(): void;
}
