export interface ImageProcessingOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'png';
}
export interface ImageValidationResult {
    isValid: boolean;
    fileSizeMB: number;
    errorMessage?: string;
}
export declare class ImageProcessingService {
    private static instance;
    private initialized;
    constructor();
    static getInstance(): ImageProcessingService;
    validateImageFile(imagePath: string): Promise<ImageValidationResult>;
    validateImageBuffer(buffer: Buffer): Promise<ImageValidationResult>;
    processImageFromPath(imagePath: string, options?: ImageProcessingOptions): Promise<Buffer>;
    processImageFromBuffer(buffer: Buffer, options?: ImageProcessingOptions): Promise<Buffer>;
    convertToBase64Jpeg(imagePath: string): Promise<string>;
    generatePreview(imagePath: string, outputPath: string, options?: ImageProcessingOptions): Promise<void>;
    generatePreviewFromDataUrl(dataUrl: string, outputPath: string, options?: ImageProcessingOptions): Promise<void>;
}
export declare const imageProcessingService: ImageProcessingService;
