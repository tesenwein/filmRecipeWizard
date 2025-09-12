import * as path from 'path';
import * as fs from 'fs/promises';

export class FileUtils {
  // Supported image formats
  static readonly SUPPORTED_FORMATS = {
    RAW: ['.dng', '.cr2', '.nef', '.arw', '.orf', '.rw2', '.raf'],
    STANDARD: ['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp'],
  };

  static readonly ALL_FORMATS = [
    ...FileUtils.SUPPORTED_FORMATS.RAW,
    ...FileUtils.SUPPORTED_FORMATS.STANDARD,
  ];

  /**
   * Check if a file is a supported image format
   */
  static isImageFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.ALL_FORMATS.includes(ext);
  }

  /**
   * Check if a file is a RAW format
   */
  static isRawFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.SUPPORTED_FORMATS.RAW.includes(ext);
  }

  /**
   * Check if a file is a standard image format
   */
  static isStandardFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.SUPPORTED_FORMATS.STANDARD.includes(ext);
  }

  /**
   * Generate output path for processed image
   */
  static generateOutputPath(
    inputPath: string,
    suffix: string = '_processed',
    outputDir?: string
  ): string {
    const dir = outputDir || path.dirname(inputPath);
    const name = path.basename(inputPath, path.extname(inputPath));
    const ext = path.extname(inputPath);
    
    return path.join(dir, `${name}${suffix}${ext}`);
  }

  /**
   * Generate unique filename to avoid conflicts
   */
  static async generateUniqueFilename(filePath: string): Promise<string> {
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
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file size in bytes
   */
  static async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Create directory if it doesn't exist
   */
  static async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }
  }

  /**
   * Get file extension without dot
   */
  static getFileExtension(filePath: string): string {
    return path.extname(filePath).toLowerCase().substring(1);
  }

  /**
   * Get filename without extension
   */
  static getFileNameWithoutExtension(filePath: string): string {
    return path.basename(filePath, path.extname(filePath));
  }

  /**
   * Validate file path and existence
   */
  static async validateImageFile(filePath: string): Promise<{
    isValid: boolean;
    error?: string;
    isRaw: boolean;
    size: number;
  }> {
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
  static generatePresetFilename(baseName: string = 'ImageMatch'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${baseName}-${timestamp}.xmp`;
  }

  /**
   * Clean up temporary files
   */
  static async cleanupTempFiles(tempDir: string): Promise<void> {
    try {
      const files = await fs.readdir(tempDir);
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        try {
          await fs.unlink(filePath);
        } catch {
          // Ignore errors for individual file cleanup
        }
      }
    } catch {
      // Ignore errors if temp directory doesn't exist
    }
  }

  /**
   * Copy file to destination
   */
  static async copyFile(src: string, dest: string): Promise<void> {
    await this.ensureDirectory(path.dirname(dest));
    await fs.copyFile(src, dest);
  }

  /**
   * Move file to destination
   */
  static async moveFile(src: string, dest: string): Promise<void> {
    await this.ensureDirectory(path.dirname(dest));
    await fs.rename(src, dest);
  }

  /**
   * Get MIME type for image file
   */
  static getMimeType(filePath: string): string {
    const ext = this.getFileExtension(filePath);
    
    const mimeTypes: Record<string, string> = {
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