import * as fs from 'fs/promises';
import sharp from 'sharp';


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

export class ImageProcessingService {
  private static instance: ImageProcessingService;
  private initialized = false;

  constructor() {
    // Configuration is now done at module level
    this.initialized = true;
  }

  static getInstance(): ImageProcessingService {
    if (!ImageProcessingService.instance) {
      ImageProcessingService.instance = new ImageProcessingService();
    }
    return ImageProcessingService.instance;
  }


  async validateImageFile(imagePath: string): Promise<ImageValidationResult> {
    try {
      const stats = await fs.stat(imagePath);
      const fileSizeMB = stats.size / (1024 * 1024);

      if (fileSizeMB > 100) {
        return {
          isValid: false,
          fileSizeMB,
          errorMessage: `File too large (${fileSizeMB.toFixed(1)}MB). Maximum supported size is 100MB.`
        };
      }


      return {
        isValid: true,
        fileSizeMB
      };
    } catch (error) {
      return {
        isValid: false,
        fileSizeMB: 0,
        errorMessage: `Failed to validate image file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async validateImageBuffer(buffer: Buffer): Promise<ImageValidationResult> {
    const bufferSizeMB = buffer.length / (1024 * 1024);

    if (bufferSizeMB > 100) {
      return {
        isValid: false,
        fileSizeMB: bufferSizeMB,
        errorMessage: `Data too large (${bufferSizeMB.toFixed(1)}MB). Maximum supported size is 100MB.`
      };
    }


    return {
      isValid: true,
      fileSizeMB: bufferSizeMB
    };
  }

  async processImageFromPath(
    imagePath: string,
    options: ImageProcessingOptions = {}
  ): Promise<Buffer> {
    const validation = await this.validateImageFile(imagePath);
    if (!validation.isValid) {
      throw new Error(validation.errorMessage);
    }

    const {
      maxWidth = 1024,
      maxHeight = 1024,
      quality = 90,
      format = 'jpeg'
    } = options;

    try {
      let sharpInstance = sharp(imagePath)
        .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true });

      if (format === 'jpeg') {
        return await sharpInstance.jpeg({ quality }).toBuffer();
      } else {
        return await sharpInstance.png().toBuffer();
      }
    } catch (error) {
      throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async processImageFromBuffer(
    buffer: Buffer,
    options: ImageProcessingOptions = {}
  ): Promise<Buffer> {
    const validation = await this.validateImageBuffer(buffer);
    if (!validation.isValid) {
      throw new Error(validation.errorMessage);
    }

    const {
      maxWidth = 1024,
      maxHeight = 1024,
      quality = 90,
      format = 'jpeg'
    } = options;

    try {
      let sharpInstance = sharp(buffer)
        .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true });

      if (format === 'jpeg') {
        return await sharpInstance.jpeg({ quality }).toBuffer();
      } else {
        return await sharpInstance.png().toBuffer();
      }
    } catch (error) {
      throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async convertToBase64Jpeg(imagePath: string): Promise<string> {
    const buffer = await this.processImageFromPath(imagePath, {
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 90,
      format: 'jpeg'
    });
    return buffer.toString('base64');
  }

  async generatePreview(
    imagePath: string,
    outputPath: string,
    options: ImageProcessingOptions = {}
  ): Promise<void> {
    const validation = await this.validateImageFile(imagePath);
    if (!validation.isValid) {
      throw new Error(validation.errorMessage);
    }

    const {
      maxWidth = 1024,
      maxHeight = 1024,
      quality = 92
    } = options;

    try {
      await sharp(imagePath)
        .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality })
        .toFile(outputPath);
    } catch (error) {
      throw new Error(`Failed to generate preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generatePreviewFromDataUrl(
    dataUrl: string,
    outputPath: string,
    options: ImageProcessingOptions = {}
  ): Promise<void> {
    const base64 = dataUrl.split(',')[1] || '';
    const buf = Buffer.from(base64, 'base64');

    const validation = await this.validateImageBuffer(buf);
    if (!validation.isValid) {
      throw new Error(validation.errorMessage);
    }

    const {
      maxWidth = 1024,
      maxHeight = 1024,
      quality = 92
    } = options;

    try {
      await sharp(buf)
        .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality })
        .toFile(outputPath);
    } catch (error) {
      throw new Error(`Failed to generate preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const imageProcessingService = ImageProcessingService.getInstance();