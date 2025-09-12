export declare class FileUtils {
    static readonly SUPPORTED_FORMATS: {
        RAW: string[];
        STANDARD: string[];
    };
    static readonly ALL_FORMATS: string[];
    /**
     * Check if a file is a supported image format
     */
    static isImageFile(filePath: string): boolean;
    /**
     * Check if a file is a RAW format
     */
    static isRawFile(filePath: string): boolean;
    /**
     * Check if a file is a standard image format
     */
    static isStandardFile(filePath: string): boolean;
    /**
     * Generate output path for processed image
     */
    static generateOutputPath(inputPath: string, suffix?: string, outputDir?: string): string;
    /**
     * Generate unique filename to avoid conflicts
     */
    static generateUniqueFilename(filePath: string): Promise<string>;
    /**
     * Check if file exists
     */
    static fileExists(filePath: string): Promise<boolean>;
    /**
     * Get file size in bytes
     */
    static getFileSize(filePath: string): Promise<number>;
    /**
     * Format file size for display
     */
    static formatFileSize(bytes: number): string;
    /**
     * Create directory if it doesn't exist
     */
    static ensureDirectory(dirPath: string): Promise<void>;
    /**
     * Get file extension without dot
     */
    static getFileExtension(filePath: string): string;
    /**
     * Get filename without extension
     */
    static getFileNameWithoutExtension(filePath: string): string;
    /**
     * Validate file path and existence
     */
    static validateImageFile(filePath: string): Promise<{
        isValid: boolean;
        error?: string;
        isRaw: boolean;
        size: number;
    }>;
    /**
     * Generate preset filename with timestamp
     */
    static generatePresetFilename(baseName?: string): string;
    /**
     * Clean up temporary files
     */
    static cleanupTempFiles(tempDir: string): Promise<void>;
    /**
     * Copy file to destination
     */
    static copyFile(src: string, dest: string): Promise<void>;
    /**
     * Move file to destination
     */
    static moveFile(src: string, dest: string): Promise<void>;
    /**
     * Get MIME type for image file
     */
    static getMimeType(filePath: string): string;
}
