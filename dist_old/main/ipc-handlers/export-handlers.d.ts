import { ImageProcessor } from '../image-processor';
import { StorageService } from '../storage-service';
export declare class ExportHandlers {
    private imageProcessor;
    private storageService;
    constructor(imageProcessor: ImageProcessor, storageService: StorageService);
    setupHandlers(): void;
}
