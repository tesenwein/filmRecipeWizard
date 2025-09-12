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
exports.FileUtils = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
class FileUtils {
    /**
     * Check if a file is a supported image format
     */
    static isImageFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return this.ALL_FORMATS.includes(ext);
    }
    /**
     * Check if a file is a RAW format
     */
    static isRawFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return this.SUPPORTED_FORMATS.RAW.includes(ext);
    }
    /**
     * Check if a file is a standard image format
     */
    static isStandardFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return this.SUPPORTED_FORMATS.STANDARD.includes(ext);
    }
    /**
     * Generate output path for processed image
     */
    static generateOutputPath(inputPath, suffix = '_processed', outputDir) {
        const dir = outputDir || path.dirname(inputPath);
        const name = path.basename(inputPath, path.extname(inputPath));
        const ext = path.extname(inputPath);
        return path.join(dir, `${name}${suffix}${ext}`);
    }
    /**
     * Generate unique filename to avoid conflicts
     */
    static async generateUniqueFilename(filePath) {
        let counter = 1;
        let uniquePath = filePath;
        while (await this.fileExists(uniquePath)) {
            const dir = path.dirname(filePath);
            const name = path.basename(filePath, path.extname(filePath));
            const ext = path.extname(filePath);
            uniquePath = path.join(dir, `${name}_${counter}${ext}`);
            counter++;
        }
        return uniquePath;
    }
    /**
     * Check if file exists
     */
    static async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get file size in bytes
     */
    static async getFileSize(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.size;
        }
        catch {
            return 0;
        }
    }
    /**
     * Format file size for display
     */
    static formatFileSize(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    /**
     * Create directory if it doesn't exist
     */
    static async ensureDirectory(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        }
        catch (error) {
            // Directory might already exist, ignore error
        }
    }
    /**
     * Get file extension without dot
     */
    static getFileExtension(filePath) {
        return path.extname(filePath).toLowerCase().substring(1);
    }
    /**
     * Get filename without extension
     */
    static getFileNameWithoutExtension(filePath) {
        return path.basename(filePath, path.extname(filePath));
    }
    /**
     * Validate file path and existence
     */
    static async validateImageFile(filePath) {
        // Check if file exists
        if (!(await this.fileExists(filePath))) {
            return { isValid: false, error: 'File does not exist', isRaw: false, size: 0 };
        }
        // Check if it's a supported format
        if (!this.isImageFile(filePath)) {
            return {
                isValid: false,
                error: 'Unsupported file format',
                isRaw: false,
                size: 0,
            };
        }
        const size = await this.getFileSize(filePath);
        const isRaw = this.isRawFile(filePath);
        return {
            isValid: true,
            isRaw,
            size,
        };
    }
    /**
     * Generate preset filename with timestamp
     */
    static generatePresetFilename(baseName = 'ImageMatch') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        return `${baseName}-${timestamp}.xmp`;
    }
    /**
     * Clean up temporary files
     */
    static async cleanupTempFiles(tempDir) {
        try {
            const files = await fs.readdir(tempDir);
            for (const file of files) {
                const filePath = path.join(tempDir, file);
                try {
                    await fs.unlink(filePath);
                }
                catch {
                    // Ignore errors for individual file cleanup
                }
            }
        }
        catch {
            // Ignore errors if temp directory doesn't exist
        }
    }
    /**
     * Copy file to destination
     */
    static async copyFile(src, dest) {
        await this.ensureDirectory(path.dirname(dest));
        await fs.copyFile(src, dest);
    }
    /**
     * Move file to destination
     */
    static async moveFile(src, dest) {
        await this.ensureDirectory(path.dirname(dest));
        await fs.rename(src, dest);
    }
    /**
     * Get MIME type for image file
     */
    static getMimeType(filePath) {
        const ext = this.getFileExtension(filePath);
        const mimeTypes = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            tiff: 'image/tiff',
            tif: 'image/tiff',
            bmp: 'image/bmp',
            dng: 'image/x-adobe-dng',
            cr2: 'image/x-canon-cr2',
            nef: 'image/x-nikon-nef',
            arw: 'image/x-sony-arw',
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
}
exports.FileUtils = FileUtils;
// Supported image formats
FileUtils.SUPPORTED_FORMATS = {
    RAW: ['.dng', '.cr2', '.nef', '.arw', '.orf', '.rw2', '.raf'],
    STANDARD: ['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp'],
};
FileUtils.ALL_FORMATS = [
    ...FileUtils.SUPPORTED_FORMATS.RAW,
    ...FileUtils.SUPPORTED_FORMATS.STANDARD,
];
