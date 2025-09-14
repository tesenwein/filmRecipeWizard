"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Image processing worker for heavy computations
const sharp_1 = __importDefault(require("sharp"));
class ImageProcessingWorker {
    constructor() {
        // Listen for messages from the main thread
        if (typeof self !== 'undefined') {
            self.addEventListener('message', this.handleMessage.bind(this));
        }
    }
    async handleMessage(event) {
        const { id, type, data } = event.data;
        try {
            let result;
            switch (type) {
                case 'analyze-colors':
                    result = await this.analyzeColors(data.imagePath);
                    break;
                case 'match-style':
                    result = await this.matchStyle(data);
                    break;
                case 'process-raw':
                    result = await this.processRawImage(data);
                    break;
                default:
                    throw new Error(`Unknown worker task type: ${type}`);
            }
            this.sendResponse({ id, success: true, result });
        }
        catch (error) {
            this.sendResponse({
                id,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    sendResponse(response) {
        if (typeof self !== 'undefined') {
            self.postMessage(response);
        }
    }
    async analyzeColors(imagePath) {
        // Use Sharp for color analysis in the worker
        const image = (0, sharp_1.default)(imagePath);
        const { data, info } = await image
            .resize(256, 256, { fit: 'inside' })
            .raw()
            .toBuffer({ resolveWithObject: true });
        const pixels = new Uint8Array(data);
        const histogram = { red: new Array(256).fill(0), green: new Array(256).fill(0), blue: new Array(256).fill(0) };
        let totalR = 0, totalG = 0, totalB = 0;
        const pixelCount = pixels.length / info.channels;
        const colorMap = new Map();
        for (let i = 0; i < pixels.length; i += info.channels) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            histogram.red[r]++;
            histogram.green[g]++;
            histogram.blue[b]++;
            totalR += r;
            totalG += g;
            totalB += b;
            // Track color occurrences for dominant colors (quantize to reduce memory)
            const quantR = Math.floor(r / 16) * 16;
            const quantG = Math.floor(g / 16) * 16;
            const quantB = Math.floor(b / 16) * 16;
            const colorKey = `${quantR},${quantG},${quantB}`;
            colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
        }
        const averageColor = {
            r: Math.round(totalR / pixelCount),
            g: Math.round(totalG / pixelCount),
            b: Math.round(totalB / pixelCount),
        };
        // Extract dominant colors
        const dominantColors = Array.from(colorMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([colorKey, count]) => {
            const [r, g, b] = colorKey.split(',').map(Number);
            return {
                color: { r, g, b },
                percentage: Math.round((count / pixelCount) * 100 * 100) / 100,
            };
        });
        const temperature = this.calculateColorTemperature(averageColor);
        const tint = this.calculateTint(averageColor);
        return {
            histogram,
            averageColor,
            dominantColors,
            temperature,
            tint,
        };
    }
    async matchStyle(data) {
        // Implement style matching logic
        const { baseImagePath, targetImagePath, options } = data;
        // Analyze both images
        const baseColors = await this.analyzeColors(baseImagePath);
        const targetColors = await this.analyzeColors(targetImagePath);
        // Calculate adjustments
        const adjustments = this.calculateAdjustments(baseColors, targetColors, options);
        return {
            baseColors,
            targetColors,
            adjustments,
        };
    }
    async processRawImage(data) {
        // TODO: Implement RAW processing with LibRaw-Wasm
        // For now, return a placeholder
        throw new Error('RAW processing not yet implemented in worker');
    }
    calculateColorTemperature(color) {
        // Simplified color temperature calculation
        const ratio = color.b / color.r;
        return Math.round(6500 - (ratio - 1) * 1000);
    }
    calculateTint(color) {
        // Simplified tint calculation
        const magentaGreen = (color.r + color.b) / 2 - color.g;
        return Math.round(magentaGreen / 2.55); // Convert to -100 to +100 scale
    }
    calculateAdjustments(baseColors, targetColors, options) {
        const adjustments = {
            exposure: 0,
            brightness: 1,
            contrast: 1,
            saturation: 1,
            temperature: targetColors.temperature,
            tint: targetColors.tint,
            colorBalance: { red: 1, green: 1, blue: 1 },
        };
        if (options.matchBrightness) {
            const baseBrightness = (baseColors.averageColor.r + baseColors.averageColor.g + baseColors.averageColor.b) / 3;
            const targetBrightness = (targetColors.averageColor.r + targetColors.averageColor.g + targetColors.averageColor.b) / 3;
            const brightnessRatio = baseBrightness / targetBrightness;
            adjustments.brightness = Math.max(0.1, Math.min(3.0, brightnessRatio));
            adjustments.exposure = Math.log2(brightnessRatio) * 0.5;
        }
        if (options.matchColors) {
            adjustments.temperature = baseColors.temperature;
            adjustments.tint = baseColors.tint;
            adjustments.colorBalance = {
                red: Math.max(0.5, Math.min(2.0, baseColors.averageColor.r / targetColors.averageColor.r)),
                green: Math.max(0.5, Math.min(2.0, baseColors.averageColor.g / targetColors.averageColor.g)),
                blue: Math.max(0.5, Math.min(2.0, baseColors.averageColor.b / targetColors.averageColor.b)),
            };
        }
        if (options.matchContrast) {
            const baseContrast = this.calculateContrast(baseColors.histogram);
            const targetContrast = this.calculateContrast(targetColors.histogram);
            adjustments.contrast = Math.max(0.1, Math.min(3.0, baseContrast / targetContrast));
        }
        if (options.matchSaturation) {
            const baseSaturation = this.calculateSaturation(baseColors.averageColor);
            const targetSaturation = this.calculateSaturation(targetColors.averageColor);
            adjustments.saturation = Math.max(0.1, Math.min(3.0, baseSaturation / targetSaturation));
        }
        return adjustments;
    }
    calculateContrast(histogram) {
        const luminanceHist = new Array(256).fill(0);
        for (let i = 0; i < 256; i++) {
            luminanceHist[i] = histogram.red[i] * 0.299 + histogram.green[i] * 0.587 + histogram.blue[i] * 0.114;
        }
        let mean = 0;
        let total = 0;
        for (let i = 0; i < 256; i++) {
            mean += i * luminanceHist[i];
            total += luminanceHist[i];
        }
        if (total === 0)
            return 1;
        mean /= total;
        let variance = 0;
        for (let i = 0; i < 256; i++) {
            variance += luminanceHist[i] * Math.pow(i - mean, 2);
        }
        variance /= total;
        return Math.sqrt(variance) / 128;
    }
    calculateSaturation(color) {
        const max = Math.max(color.r, color.g, color.b);
        const min = Math.min(color.r, color.g, color.b);
        if (max === 0)
            return 0;
        return (max - min) / max;
    }
}
// Initialize the worker
new ImageProcessingWorker();
