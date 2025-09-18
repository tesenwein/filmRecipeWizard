import { BrowserWindow } from 'electron';
import { ImageProcessor } from '../image-processor';
import { StorageService } from '../storage-service';
export declare class ProcessingHandlers {
    private getMainWindow;
    private imageProcessor;
    private storageService?;
    constructor(getMainWindow: () => BrowserWindow | null, imageProcessor: ImageProcessor, storageService?: StorageService | undefined);
    setupHandlers(): void;
}
