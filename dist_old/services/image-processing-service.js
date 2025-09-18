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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageProcessingService = exports.ImageProcessingService = void 0;
const fs = __importStar(require("fs/promises"));
const sharp_1 = __importDefault(require("sharp"));
console.log('[IMAGE-SERVICE] Using Sharp for image processing');
class ImageProcessingService {
    constructor() {
        this.initialized = false;
        // Configuration is now done at module level
        this.initialized = true;
    }
    static getInstance() {
        if (!ImageProcessingService.instance) {
            ImageProcessingService.instance = new ImageProcessingService();
        }
        return ImageProcessingService.instance;
    }
    async validateImageFile(imagePath) {
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
            if (fileSizeMB > 25) {
                console.warn(`[IMAGE-SERVICE] Large file detected (${fileSizeMB.toFixed(1)}MB), processing may take longer`);
            }
            return {
                isValid: true,
                fileSizeMB
            };
        }
        catch (error) {
            return {
                isValid: false,
                fileSizeMB: 0,
                errorMessage: `Failed to validate image file: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async validateImageBuffer(buffer) {
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
    async processImageFromPath(imagePath, options = {}) {
        const validation = await this.validateImageFile(imagePath);
        if (!validation.isValid) {
            throw new Error(validation.errorMessage);
        }
        const { maxWidth = 1024, maxHeight = 1024, quality = 90, format = 'jpeg' } = options;
        try {
            let sharpInstance = (0, sharp_1.default)(imagePath)
                .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true });
            if (format === 'jpeg') {
                return await sharpInstance.jpeg({ quality }).toBuffer();
            }
            else {
                return await sharpInstance.png().toBuffer();
            }
        }
        catch (error) {
            throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async processImageFromBuffer(buffer, options = {}) {
        const validation = await this.validateImageBuffer(buffer);
        if (!validation.isValid) {
            throw new Error(validation.errorMessage);
        }
        const { maxWidth = 1024, maxHeight = 1024, quality = 90, format = 'jpeg' } = options;
        try {
            let sharpInstance = (0, sharp_1.default)(buffer)
                .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true });
            if (format === 'jpeg') {
                return await sharpInstance.jpeg({ quality }).toBuffer();
            }
            else {
                return await sharpInstance.png().toBuffer();
            }
        }
        catch (error) {
            throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async convertToBase64Jpeg(imagePath) {
        const buffer = await this.processImageFromPath(imagePath, {
            maxWidth: 768, // Reduced from 1024 for faster API calls
            maxHeight: 768,
            quality: 85, // Reduced from 90 for smaller file size
            format: 'jpeg'
        });
        return buffer.toString('base64');
    }
    async generatePreview(imagePath, outputPath, options = {}) {
        const validation = await this.validateImageFile(imagePath);
        if (!validation.isValid) {
            throw new Error(validation.errorMessage);
        }
        const { maxWidth = 1024, maxHeight = 1024, quality = 92 } = options;
        try {
            await (0, sharp_1.default)(imagePath)
                .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality })
                .toFile(outputPath);
        }
        catch (error) {
            throw new Error(`Failed to generate preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async generatePreviewFromDataUrl(dataUrl, outputPath, options = {}) {
        const base64 = dataUrl.split(',')[1] || '';
        const buf = Buffer.from(base64, 'base64');
        const validation = await this.validateImageBuffer(buf);
        if (!validation.isValid) {
            throw new Error(validation.errorMessage);
        }
        const { maxWidth = 1024, maxHeight = 1024, quality = 92 } = options;
        try {
            await (0, sharp_1.default)(buf)
                .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality })
                .toFile(outputPath);
        }
        catch (error) {
            throw new Error(`Failed to generate preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.ImageProcessingService = ImageProcessingService;
// Export singleton instance
exports.imageProcessingService = ImageProcessingService.getInstance();
