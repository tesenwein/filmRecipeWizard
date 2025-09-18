import { ImageProcessor } from '../image-processor';
import { SettingsService } from '../settings-service';
import { StorageService } from '../storage-service';
export declare class StorageHandlers {
    private storageService;
    private settingsService?;
    private imageProcessor?;
    constructor(storageService: StorageService, settingsService?: SettingsService | undefined, imageProcessor?: ImageProcessor | undefined);
    setupHandlers(): void;
}
