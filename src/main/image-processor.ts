import sharp from 'sharp';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ColorMatcher } from '../algorithms/color-matching';
import { FileUtils } from '../utils/file-utils';
import { ImageMagick, MagickFormat, Percentage, initializeImageMagick, ConfigurationFiles } from '@imagemagick/magick-wasm';
import { OpenAIColorAnalyzer, AIColorAdjustments } from '../services/openai-color-analyzer';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface ColorAnalysis {
  histogram: {
    red: number[];
    green: number[];
    blue: number[];
  };
  averageColor: {
    r: number;
    g: number;
    b: number;
  };
  dominantColors: Array<{
    color: { r: number; g: number; b: number };
    percentage: number;
  }>;
  temperature: number;
  tint: number;
}

export interface StyleMatchOptions {
  baseImagePath: string;
  targetImagePath: string;
  matchColors: boolean;
  matchBrightness: boolean;
  matchContrast: boolean;
  matchSaturation: boolean;
  outputPath?: string;
}

export interface ProcessingResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  metadata?: any;
}

export class ImageProcessor {
  private readonly supportedFormats = ['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.heic', '.heif', '.avif'];
  private readonly rawFormats = ['.dng', '.cr2', '.nef', '.arw'];
  private magickInitialized = false;
  private aiAnalyzer: OpenAIColorAnalyzer;

  constructor() {
    this.initializeImageMagick();
    this.aiAnalyzer = new OpenAIColorAnalyzer();
  }

  private async initializeImageMagick(): Promise<void> {
    try {
      // Load the wasm binary and initialize the library
      const wasmPath = require.resolve('@imagemagick/magick-wasm/dist/magick.wasm');
      const wasmBinary = await fs.readFile(wasmPath);
      await initializeImageMagick(wasmBinary, ConfigurationFiles.default);
      this.magickInitialized = true;
      console.log('[PROCESSOR] ImageMagick WASM initialized');
    } catch (error) {
      this.magickInitialized = false;
      console.warn('[PROCESSOR] ImageMagick WASM not available, falling back to Sharp only:', error instanceof Error ? error.message : error);
    }
  }

  async processImage(data: StyleMatchOptions): Promise<ProcessingResult> {
    console.log('[PROCESSOR] Starting processImage with:', { baseImagePath: data.baseImagePath, targetImagePath: data.targetImagePath, outputPath: data.outputPath });
    
    try {
      const { baseImagePath, targetImagePath, outputPath } = data;
      
      console.log('[PROCESSOR] Validating image files');
      // Check if files exist
      await this.validateImageFile(baseImagePath);
      await this.validateImageFile(targetImagePath);
      console.log('[PROCESSOR] File validation completed');

      const baseExt = path.extname(baseImagePath).toLowerCase();
      const targetExt = path.extname(targetImagePath).toLowerCase();
      console.log('[PROCESSOR] File extensions - base:', baseExt, 'target:', targetExt);

      // Handle different file types
      if (this.isRawFormat(baseExt) || this.isRawFormat(targetExt)) {
        console.log('[PROCESSOR] Processing RAW images');
        return await this.processRawImages(data);
      } else if (this.isHeicFormat(baseExt) || this.isHeicFormat(targetExt)) {
        console.log('[PROCESSOR] Processing HEIC/HEIF/AVIF images');
        return await this.processHeicImages(data);
      } else {
        console.log('[PROCESSOR] Processing standard images');
        return await this.processStandardImages(data);
      }
    } catch (error) {
      console.error('[PROCESSOR] processImage failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async analyzeColors(imagePath: string): Promise<ColorAnalysis> {
    console.log('[PROCESSOR] Analyzing colors for:', imagePath);
    const ext = path.extname(imagePath).toLowerCase();
    console.log('[PROCESSOR] File extension:', ext);
    
    if (this.isRawFormat(ext)) {
      console.log('[PROCESSOR] Using RAW color analysis');
      return await this.analyzeRawImageColors(imagePath);
    } else if (ext === '.heic' || ext === '.heif' || ext === '.avif') {
      console.log('[PROCESSOR] Using HEIC/HEIF/AVIF color analysis');
      return await this.analyzeHeicImageColors(imagePath);
    } else {
      console.log('[PROCESSOR] Using standard color analysis');
      return await this.analyzeStandardImageColors(imagePath);
    }
  }

  async analyzeColorMatch(data: { baseImagePath: string; targetImagePath: string }): Promise<ProcessingResult> {
    console.log('[PROCESSOR] Starting AI color match analysis');
    
    if (!this.aiAnalyzer.isAvailable()) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable for AI analysis.');
    }

    try {
      console.log('[PROCESSOR] Running AI color analysis...');
      let hint: string | undefined;
      try {
        const baseColors = await this.analyzeColors(data.baseImagePath);
        const avg = baseColors.averageColor;
        const isGreenish = avg.g > avg.r + 10 && avg.g > avg.b + 10;
        if (isGreenish) {
          hint = 'Base image shows a cool green/teal cast. Favor cooler temperature, negative tint (toward green), and teal color grading in shadows/midtones/highlights.';
        }
      } catch (_) {}

      const aiAdjustments = await this.aiAnalyzer.analyzeColorMatch(
        data.baseImagePath,
        data.targetImagePath,
        hint
      );
      
      console.log('[PROCESSOR] AI analysis complete - confidence:', aiAdjustments.confidence);
      console.log('[PROCESSOR] AI reasoning:', aiAdjustments.reasoning);
      
      // Return the AI analysis results without applying them
      return {
        success: true,
        metadata: {
          adjustments: aiAdjustments,
          confidence: aiAdjustments.confidence,
          reasoning: aiAdjustments.reasoning
        }
      };
    } catch (error) {
      console.error('[PROCESSOR] AI color analysis failed:', error);
      throw error;
    }
  }

  async matchStyle(data: StyleMatchOptions): Promise<ProcessingResult> {
    console.log('[PROCESSOR] Starting AI-powered style matching');
    
    if (!this.aiAnalyzer.isAvailable()) {
      throw new Error('OpenAI API key not configured. This app requires OpenAI for color matching. Please set OPENAI_API_KEY environment variable.');
    }

    console.log('[PROCESSOR] Using AI-powered color matching');
    return await this.matchStyleWithAI(data);
  }

  private async matchStyleWithAI(data: StyleMatchOptions): Promise<ProcessingResult> {
    try {
      console.log('[PROCESSOR] Analyzing images with AI');
      // Build a context hint from base image if it skews green/teal to encourage the AI toward the intended look
      let hint: string | undefined;
      try {
        const baseColors = await this.analyzeColors(data.baseImagePath);
        const avg = baseColors.averageColor;
        const isGreenish = avg.g > avg.r + 10 && avg.g > avg.b + 10;
        if (isGreenish) {
          hint = 'Base image shows a cool green/teal cast. Favor cooler temperature, negative tint (toward green), and teal color grading in shadows/midtones/highlights.';
        }
      } catch (_) {
        // Best-effort hint; ignore errors
      }

      const aiAdjustments = await this.aiAnalyzer.analyzeColorMatch(
        data.baseImagePath,
        data.targetImagePath,
        hint
      );
      
      console.log('[PROCESSOR] AI analysis complete - confidence:', aiAdjustments.confidence);
      console.log('[PROCESSOR] AI reasoning:', aiAdjustments.reasoning);
      
      // Apply AI adjustments to target image
      // For RAW inputs, generate a JPEG preview instead of attempting to write DNG
      const targetExt = path.extname(data.targetImagePath).toLowerCase();
      let outputPath = data.outputPath || this.generateOutputPath(data.targetImagePath);
      if (this.isRawFormat(targetExt)) {
        const dir = path.dirname(data.targetImagePath);
        const name = path.basename(data.targetImagePath, targetExt);
        outputPath = path.join(dir, `${name}_processed.jpg`);
      }
      console.log('[PROCESSOR] Output path:', outputPath);
      
      console.log('[PROCESSOR] Applying AI-generated adjustments');
      // Try ImageMagick first for advanced adjustments, fallback to Sharp for basic ones
      // For RAW inputs, always use Sharp-based pipeline for the JPEG preview
      if (this.isRawFormat(targetExt)) {
        await this.applyAIAdjustments(data.targetImagePath, outputPath, aiAdjustments);
        console.log('[PROCESSOR] RAW input detected: generated JPEG preview with Sharp');
      } else if (this.magickInitialized) {
        await this.applyAIAdjustmentsWithImageMagick(data.targetImagePath, outputPath, aiAdjustments);
        console.log('[PROCESSOR] Advanced AI adjustments applied with ImageMagick');
      } else {
        await this.applyAIAdjustments(data.targetImagePath, outputPath, aiAdjustments);
        console.log('[PROCESSOR] Basic AI adjustments applied with Sharp');
      }

      return {
        success: true,
        outputPath,
        metadata: { 
          aiAdjustments,
          adjustments: this.convertAIToLegacyFormat(aiAdjustments), // For preset generation
          confidence: aiAdjustments.confidence,
          reasoning: aiAdjustments.reasoning
        },
      };
    } catch (error) {
      console.error('[PROCESSOR] AI style matching failed:', error);
      throw error;
    }
  }

  private async matchStyleTraditional(data: StyleMatchOptions): Promise<ProcessingResult> {
    try {
      console.log('[PROCESSOR] Analyzing base image colors');
      const baseColors = await this.analyzeColors(data.baseImagePath);
      console.log('[PROCESSOR] Base colors analyzed - temp:', baseColors.temperature, 'tint:', baseColors.tint);
      
      console.log('[PROCESSOR] Analyzing target image colors');
      const targetColors = await this.analyzeColors(data.targetImagePath);
      console.log('[PROCESSOR] Target colors analyzed - temp:', targetColors.temperature, 'tint:', targetColors.tint);

      // Apply style matching based on options
      console.log('[PROCESSOR] Calculating adjustments');
      const adjustments = this.calculateAdjustments(baseColors, targetColors, data);
      console.log('[PROCESSOR] Adjustments calculated:', adjustments);
      
      // Apply adjustments to target image
      const outputPath = data.outputPath || this.generateOutputPath(data.targetImagePath);
      console.log('[PROCESSOR] Output path:', outputPath);
      
      console.log('[PROCESSOR] Applying adjustments');
      await this.applyAdjustments(data.targetImagePath, outputPath, adjustments);
      console.log('[PROCESSOR] Adjustments applied successfully');

      return {
        success: true,
        outputPath,
        metadata: { baseColors, targetColors, adjustments },
      };
    } catch (error) {
      console.error('[PROCESSOR] Traditional style matching failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async generateLightroomPreset(data: any): Promise<ProcessingResult> {
    try {
      console.log('[PROCESSOR] Generating Lightroom preset with adjustments:', data.adjustments);
      
      // Create presets directory
      const presetsDir = path.join(process.cwd(), 'presets');
      await fs.mkdir(presetsDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const presetPath = path.join(presetsDir, `ImageMatch-${timestamp}.xmp`);
      
      // Generate XMP preset content
      const xmpContent = this.generateXMPContent(data.adjustments, data.include);
      await fs.writeFile(presetPath, xmpContent, 'utf8');
      
      console.log('[PROCESSOR] Lightroom preset saved to:', presetPath);

      return {
        success: true,
        outputPath: presetPath,
        metadata: {
          presetName: `ImageMatch-${timestamp}.xmp`,
          groupFolder: 'image-match',
          adjustments: data.adjustments
        }
      };
    } catch (error) {
      console.error('[PROCESSOR] Preset generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Generate a JPEG preview for any supported input (path or dataUrl), sized for UI display
  async generatePreview(args: { path?: string; dataUrl?: string }): Promise<string> {
    const os = await import('os');
    const tmpDir = path.join(os.tmpdir(), 'image-match-previews');
    await fs.mkdir(tmpDir, { recursive: true });

    const outPath = path.join(tmpDir, `prev-${Date.now()}-${Math.floor(Math.random()*1e6)}.jpg`);

    try {
      let img = sharp();
      if (args.path) {
        img = sharp(args.path);
      } else if (args.dataUrl) {
        const base64 = args.dataUrl.split(',')[1] || '';
        const buf = Buffer.from(base64, 'base64');
        img = sharp(buf);
      } else {
        throw new Error('No input provided for preview');
      }

      await img
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 92 })
        .toFile(outPath);

      return outPath;
    } catch (error) {
      console.error('[PROCESSOR] Failed to generate preview:', error);
      throw error;
    }
  }

  private async validateImageFile(filePath: string): Promise<void> {
    console.log('[PROCESSOR] Validating file:', filePath);
    try {
      await fs.access(filePath);
      console.log('[PROCESSOR] File exists and is accessible');
    } catch (error) {
      console.error('[PROCESSOR] File validation failed:', error);
      throw new Error(`File not found: ${filePath}`);
    }
  }

  private isRawFormat(extension: string): boolean {
    return this.rawFormats.includes(extension.toLowerCase());
  }

  private isHeicFormat(extension: string): boolean {
    const heicFormats = ['.heic', '.heif', '.avif'];
    return heicFormats.includes(extension.toLowerCase());
  }

  private async processRawImages(data: StyleMatchOptions): Promise<ProcessingResult> {
    console.log('[PROCESSOR] Processing RAW images with Sharp-based pipeline');
    
    // Try to process directly with Sharp where possible (especially DNG)
    try {
      return await this.processStandardImages(data);
    } catch (error) {
      console.error('[PROCESSOR] Direct RAW processing failed:', error);
      
      // For non-DNG files that Sharp can't handle, provide helpful error
      const baseExt = path.extname(data.baseImagePath).toLowerCase();
      const targetExt = path.extname(data.targetImagePath).toLowerCase();
      
      const failedFormats = [];
      if (this.isRawFormat(baseExt) && baseExt !== '.dng') failedFormats.push(`base image (${baseExt})`);
      if (this.isRawFormat(targetExt) && targetExt !== '.dng') failedFormats.push(`target image (${targetExt})`);
      
      if (failedFormats.length > 0) {
        return {
          success: false,
          error: `RAW format processing failed for ${failedFormats.join(' and ')}. ` +
                `Please convert to DNG format first using Adobe DNG Converter, or use JPEG/PNG/TIFF files.`,
        };
      }
      
      return {
        success: false,
        error: `RAW processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async processStandardImages(data: StyleMatchOptions): Promise<ProcessingResult> {
    const outputPath = data.outputPath || this.generateOutputPath(data.targetImagePath);
    
    // Load and process images with Sharp
    const targetImage = sharp(data.targetImagePath);
    const baseColors = await this.analyzeColors(data.baseImagePath);
    const targetColors = await this.analyzeColors(data.targetImagePath);
    
    const adjustments = this.calculateAdjustments(baseColors, targetColors, data);
    
    // Apply color adjustments
    let processedImage = targetImage;
    
    if (data.matchBrightness) {
      processedImage = processedImage.modulate({
        brightness: adjustments.brightness,
      });
    }
    
    if (data.matchSaturation) {
      processedImage = processedImage.modulate({
        saturation: adjustments.saturation,
      });
    }

    await processedImage.jpeg({ quality: 95 }).toFile(outputPath);
    
    return {
      success: true,
      outputPath,
      metadata: { baseColors, targetColors, adjustments },
    };
  }

  private async analyzeStandardImageColors(imagePath: string): Promise<ColorAnalysis> {
    console.log('[PROCESSOR] Starting standard image color analysis');
    try {
      const image = sharp(imagePath);
      console.log('[PROCESSOR] Sharp instance created, resizing image');
      const { data, info } = await image
        .resize(512, 512, { fit: 'inside' }) // Increased resolution for better analysis
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      console.log('[PROCESSOR] Image processed - width:', info.width, 'height:', info.height, 'channels:', info.channels);
    

    const pixels = new Uint8Array(data);
    const histogram = { red: new Array(256).fill(0), green: new Array(256).fill(0), blue: new Array(256).fill(0) };
    
    let totalR = 0, totalG = 0, totalB = 0;
    const pixelCount = pixels.length / info.channels;
    const colorMap = new Map<string, number>();

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
      const quantR = Math.floor(r / 8) * 8; // Better quantization
      const quantG = Math.floor(g / 8) * 8;
      const quantB = Math.floor(b / 8) * 8;
      const colorKey = `${quantR},${quantG},${quantB}`;
      colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
    }

    const averageColor = {
      r: Math.round(totalR / pixelCount),
      g: Math.round(totalG / pixelCount),
      b: Math.round(totalB / pixelCount),
    };

    // Extract dominant colors with improved algorithm
    const dominantColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8) // Get more colors for better analysis
      .map(([colorKey, count]) => {
        const [r, g, b] = colorKey.split(',').map(Number);
        return {
          color: { r, g, b },
          percentage: Math.round((count / pixelCount) * 100 * 100) / 100,
        };
      })
      .filter(color => color.percentage > 1); // Filter out very minor colors

      // Use ColorMatcher for more accurate temperature calculation
      console.log('[PROCESSOR] Calculating color temperature and balance');
      const temperature = ColorMatcher.calculateColorTemperature(averageColor);
      const colorBalance = ColorMatcher.analyzeColorBalance(dominantColors);
      
      console.log('[PROCESSOR] Color analysis complete - avg color:', averageColor, 'temp:', colorBalance.temperature);
      
      return {
        histogram,
        averageColor,
        dominantColors,
        temperature: colorBalance.temperature,
        tint: colorBalance.tint,
      };
    } catch (error) {
      console.error('[PROCESSOR] Standard image color analysis failed:', error);
      throw error;
    }
  }

  private async analyzeHeicImageColors(imagePath: string): Promise<ColorAnalysis> {
    console.log('[PROCESSOR] Analyzing HEIC/HEIF/AVIF image colors');
    
    try {
      // First attempt: Try Sharp's native HEIC processing
      const image = sharp(imagePath);
      
      // Get metadata first to check orientation and other properties
      const metadata = await image.metadata();
      console.log('[PROCESSOR] HEIC metadata - width:', metadata.width, 'height:', metadata.height, 'orientation:', metadata.orientation);
      
      // Process with auto-rotation for HEIC files (common with mobile photos)
      const { data, info } = await image
        .rotate() // Auto-rotate based on EXIF orientation
        .resize(512, 512, { fit: 'inside' })
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      console.log('[PROCESSOR] HEIC processing successful - channels:', info.channels);
      return await this.processImageBuffer(data, info);
      
    } catch (sharpError) {
      const errorMsg = sharpError instanceof Error ? sharpError.message : String(sharpError);
      console.error('[PROCESSOR] Sharp HEIC processing failed:', errorMsg);
      
      // Check if it's a codec issue
      if (errorMsg.includes('Unsupported codec') || errorMsg.includes('bad seek')) {
        console.log('[PROCESSOR] HEIC codec not supported by Sharp, trying conversion fallback');
        return await this.tryHeicConversionFallback(imagePath);
      }
      
      // For other errors, provide helpful guidance
      throw new Error(
        `HEIC processing failed: ${errorMsg}. ` +
        `This HEIC file may use an unsupported codec. ` +
        `Try converting to JPEG first using Preview, Photos app, or online converters.`
      );
    }
  }

  private async tryHeicConversionFallback(imagePath: string): Promise<ColorAnalysis> {
    console.log('[PROCESSOR] Attempting HEIC conversion fallback');
    
    // For now, provide detailed error with solution
    // ImageMagick integration can be added later when WASM API is stable
    throw new Error(
      `HEIC file uses an unsupported codec (possibly newer HEVC/H.265 variant). ` +
      `Please convert to JPEG using one of these methods:\n` +
      `• macOS: Open in Preview → Export as JPEG\n` +
      `• Photos app: Export as JPEG\n` +
      `• iPhone: Settings → Camera → Formats → Most Compatible\n` +
      `• Online: Use CloudConvert or Convertio\n` +
      `• Adobe tools: DNG Converter or Lightroom`
    );
  }

  private async convertHeicWithImageMagick(heicPath: string): Promise<string> {
    // Placeholder for ImageMagick conversion
    // For now, throw an error since the WASM API needs more work
    throw new Error('ImageMagick HEIC conversion not yet implemented. Please convert HEIC to JPEG manually.');
  }

  private async analyzeRawBufferColors(buffer: Uint8Array, width: number, height: number): Promise<ColorAnalysis> {
    console.log('[PROCESSOR] Analyzing RAW buffer colors - dimensions:', width, 'x', height);
    
    const histogram = { red: new Array(256).fill(0), green: new Array(256).fill(0), blue: new Array(256).fill(0) };
    let totalR = 0, totalG = 0, totalB = 0;
    const pixelCount = width * height;
    const colorMap = new Map<string, number>();

    // Assume RGB format (3 channels)
    for (let i = 0; i < buffer.length; i += 3) {
      const r = buffer[i] || 0;
      const g = buffer[i + 1] || 0;
      const b = buffer[i + 2] || 0;

      histogram.red[r]++;
      histogram.green[g]++;
      histogram.blue[b]++;

      totalR += r;
      totalG += g;
      totalB += b;

      // Track color occurrences for dominant colors
      const quantR = Math.floor(r / 8) * 8;
      const quantG = Math.floor(g / 8) * 8;
      const quantB = Math.floor(b / 8) * 8;
      const colorKey = `${quantR},${quantG},${quantB}`;
      colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
    }

    const averageColor = {
      r: Math.round(totalR / pixelCount),
      g: Math.round(totalG / pixelCount),
      b: Math.round(totalB / pixelCount),
    };

    const dominantColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([colorKey, count]) => {
        const [r, g, b] = colorKey.split(',').map(Number);
        return {
          color: { r, g, b },
          percentage: Math.round((count / pixelCount) * 100 * 100) / 100,
        };
      })
      .filter(color => color.percentage > 1);

    // Use ColorMatcher for temperature calculation
    const temperature = ColorMatcher.calculateColorTemperature(averageColor);
    const colorBalance = ColorMatcher.analyzeColorBalance(dominantColors);
    
    console.log('[PROCESSOR] RAW buffer analysis complete');
    
    return {
      histogram,
      averageColor,
      dominantColors,
      temperature: colorBalance.temperature,
      tint: colorBalance.tint,
    };
  }

  private async processImageBuffer(data: Uint8Array, info: any): Promise<ColorAnalysis> {
    console.log('[PROCESSOR] Processing image buffer - channels:', info.channels);
    
    const pixels = new Uint8Array(data);
    const histogram = { red: new Array(256).fill(0), green: new Array(256).fill(0), blue: new Array(256).fill(0) };
    
    let totalR = 0, totalG = 0, totalB = 0;
    const pixelCount = pixels.length / info.channels;
    const colorMap = new Map<string, number>();

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

      const quantR = Math.floor(r / 8) * 8;
      const quantG = Math.floor(g / 8) * 8;
      const quantB = Math.floor(b / 8) * 8;
      const colorKey = `${quantR},${quantG},${quantB}`;
      colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
    }

    const averageColor = {
      r: Math.round(totalR / pixelCount),
      g: Math.round(totalG / pixelCount),
      b: Math.round(totalB / pixelCount),
    };

    const dominantColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([colorKey, count]) => {
        const [r, g, b] = colorKey.split(',').map(Number);
        return {
          color: { r, g, b },
          percentage: Math.round((count / pixelCount) * 100 * 100) / 100,
        };
      })
      .filter(color => color.percentage > 1);

    const temperature = ColorMatcher.calculateColorTemperature(averageColor);
    const colorBalance = ColorMatcher.analyzeColorBalance(dominantColors);
    
    return {
      histogram,
      averageColor,
      dominantColors,
      temperature: colorBalance.temperature,
      tint: colorBalance.tint,
    };
  }

  private async analyzeRawImageColors(imagePath: string): Promise<ColorAnalysis> {
    console.log('[PROCESSOR] Analyzing RAW image colors with enhanced Sharp processing');
    
    // Enhanced Sharp processing with better error handling and RAW options
    try {
      console.log('[PROCESSOR] Processing with Sharp (supports DNG, some CR2/NEF)');
      
      // Create Sharp instance with specific RAW processing options
      let sharpInstance = sharp(imagePath);
      
      // For DNG files, try to set specific options
      const ext = path.extname(imagePath).toLowerCase();
      if (ext === '.dng') {
        console.log('[PROCESSOR] Applying DNG-specific processing options');
        // DNG files are usually supported better by Sharp
      }
      
      const { data, info } = await sharpInstance
        .resize(512, 512, { fit: 'inside' })
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      console.log('[PROCESSOR] Sharp RAW processing successful - channels:', info.channels);
      return await this.processImageBuffer(data, info);
      
    } catch (sharpError) {
      const errorMsg = sharpError instanceof Error ? sharpError.message : String(sharpError);
      console.error('[PROCESSOR] Sharp RAW processing failed:', errorMsg);
      
      // Provide specific guidance based on file type
      const ext = path.extname(imagePath).toLowerCase();
      let suggestion = '';
      
      switch (ext) {
        case '.dng':
          suggestion = 'DNG should be supported. Try re-saving the DNG with Adobe DNG Converter.';
          break;
        case '.cr2':
        case '.cr3':
          suggestion = 'Canon RAW files require conversion. Use Adobe DNG Converter or Canon Digital Photo Professional.';
          break;
        case '.nef':
          suggestion = 'Nikon RAW files require conversion. Use Adobe DNG Converter or Nikon NX Studio.';
          break;
        case '.arw':
          suggestion = 'Sony RAW files require conversion. Use Adobe DNG Converter or Sony Imaging Edge.';
          break;
        default:
          suggestion = 'RAW format not recognized. Convert to DNG, JPEG, or TIFF first.';
      }
      
      throw new Error(`RAW processing failed: ${errorMsg}. ${suggestion}`);
    }
  }

  private calculateAdjustments(baseColors: ColorAnalysis, targetColors: ColorAnalysis, options: StyleMatchOptions): any {
    const adjustments: any = {
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
      adjustments.exposure = Math.log2(brightnessRatio) * 0.5; // Convert to exposure stops
    }

    if (options.matchColors) {
      // Calculate white balance adjustments
      adjustments.temperature = baseColors.temperature;
      adjustments.tint = baseColors.tint;
      
      // Calculate color balance adjustments
      adjustments.colorBalance = {
        red: Math.max(0.5, Math.min(2.0, baseColors.averageColor.r / targetColors.averageColor.r)),
        green: Math.max(0.5, Math.min(2.0, baseColors.averageColor.g / targetColors.averageColor.g)),
        blue: Math.max(0.5, Math.min(2.0, baseColors.averageColor.b / targetColors.averageColor.b)),
      };
    }

    if (options.matchContrast) {
      // Calculate contrast based on histogram spread
      const baseContrast = this.calculateContrast(baseColors.histogram);
      const targetContrast = this.calculateContrast(targetColors.histogram);
      adjustments.contrast = Math.max(0.1, Math.min(3.0, baseContrast / targetContrast));
    }

    if (options.matchSaturation) {
      // Calculate saturation based on color distance from gray
      const baseSaturation = this.calculateSaturation(baseColors.averageColor);
      const targetSaturation = this.calculateSaturation(targetColors.averageColor);
      adjustments.saturation = Math.max(0.1, Math.min(3.0, baseSaturation / targetSaturation));
    }

    return adjustments;
  }

  private calculateContrast(histogram: { red: number[]; green: number[]; blue: number[] }): number {
    // Calculate contrast as the standard deviation of luminance
    const luminanceHist = new Array(256).fill(0);
    
    for (let i = 0; i < 256; i++) {
      // Convert RGB to luminance using standard weights
      luminanceHist[i] = histogram.red[i] * 0.299 + histogram.green[i] * 0.587 + histogram.blue[i] * 0.114;
    }
    
    let mean = 0;
    let total = 0;
    
    for (let i = 0; i < 256; i++) {
      mean += i * luminanceHist[i];
      total += luminanceHist[i];
    }
    
    if (total === 0) return 1;
    mean /= total;
    
    let variance = 0;
    for (let i = 0; i < 256; i++) {
      variance += luminanceHist[i] * Math.pow(i - mean, 2);
    }
    variance /= total;
    
    return Math.sqrt(variance) / 128; // Normalize to 0-2 range
  }

  private calculateSaturation(color: { r: number; g: number; b: number }): number {
    const max = Math.max(color.r, color.g, color.b);
    const min = Math.min(color.r, color.g, color.b);
    
    if (max === 0) return 0;
    
    return (max - min) / max;
  }

  private async applyAdjustments(inputPath: string, outputPath: string, adjustments: any): Promise<void> {
    console.log('[PROCESSOR] Applying adjustments to:', inputPath);
    console.log('[PROCESSOR] Output path:', outputPath);
    console.log('[PROCESSOR] Adjustments:', adjustments);
    
    try {
      let image = sharp(inputPath);

      // Apply white balance (temperature/tint) via color matrix approximation
      if (adjustments.temperature !== undefined || adjustments.tint !== undefined) {
        const temp = typeof adjustments.temperature === 'number' ? adjustments.temperature : 6500;
        const tint = typeof adjustments.tint === 'number' ? adjustments.tint : 0;
        const matrix = this.buildWhiteBalanceMatrix(temp, tint);
        console.log('[PROCESSOR] Applying white balance matrix for temp/tint:', temp, tint, matrix);
        image = image.recomb(matrix);
      }

      // Apply exposure adjustment
      if (adjustments.exposure && Math.abs(adjustments.exposure) > 0.01) {
        console.log('[PROCESSOR] Applying exposure adjustment:', adjustments.exposure);
        const multiplier = Math.pow(2, adjustments.exposure);
        image = image.linear(multiplier, 0);
      }

      // Apply brightness, saturation, and lightness adjustments
      const modulateOptions: any = {};
      if (adjustments.brightness && Math.abs(adjustments.brightness - 1) > 0.01) {
        modulateOptions.brightness = adjustments.brightness;
      }
      if (adjustments.saturation && Math.abs(adjustments.saturation - 1) > 0.01) {
        modulateOptions.saturation = adjustments.saturation;
      }

      if (Object.keys(modulateOptions).length > 0) {
        console.log('[PROCESSOR] Applying modulation:', modulateOptions);
        image = image.modulate(modulateOptions);
      }

      // Apply color balance adjustments using color matrix
      if (adjustments.colorBalance && (
        Math.abs(adjustments.colorBalance.red - 1) > 0.01 ||
        Math.abs(adjustments.colorBalance.green - 1) > 0.01 ||
        Math.abs(adjustments.colorBalance.blue - 1) > 0.01
      )) {
        console.log('[PROCESSOR] Applying color balance:', adjustments.colorBalance);
        // Create a color adjustment matrix
        const { red, green, blue } = adjustments.colorBalance;
        image = image.recomb([
          [red, 0, 0],
          [0, green, 0],
          [0, 0, blue],
        ]);
      }

      // Determine output format based on input
      const ext = path.extname(inputPath).toLowerCase();
      const outputExt = path.extname(outputPath).toLowerCase();
      console.log('[PROCESSOR] Saving image - input ext:', ext, 'output ext:', outputExt);
      
      if (outputExt === '.jpg' || outputExt === '.jpeg') {
        await image.jpeg({ quality: 95 }).toFile(outputPath);
      } else if (outputExt === '.png') {
        await image.png({ compressionLevel: 6 }).toFile(outputPath);
      } else if (outputExt === '.tiff' || outputExt === '.tif') {
        await image.tiff({ compression: 'lzw' }).toFile(outputPath);
      } else if (outputExt === '.heic' || outputExt === '.heif' || outputExt === '.avif') {
        if (outputExt === '.avif') {
          await image.avif({ quality: 95 }).toFile(outputPath);
        } else {
          await image.heif({ quality: 95 }).toFile(outputPath);
        }
      } else {
        // Default to JPEG for unknown formats
        await image.jpeg({ quality: 95 }).toFile(outputPath);
      }
      
      console.log('[PROCESSOR] Image saved successfully to:', outputPath);
    } catch (error) {
      console.error('[PROCESSOR] Failed to apply adjustments:', error);
      throw error;
    }
  }

  private calculateColorTemperature(color: { r: number; g: number; b: number }): number {
    // Simplified color temperature calculation
    // This is a rough approximation and should be improved
    const ratio = color.b / color.r;
    return Math.round(6500 - (ratio - 1) * 1000);
  }

  private calculateTint(color: { r: number; g: number; b: number }): number {
    // Simplified tint calculation
    const magentaGreen = (color.r + color.b) / 2 - color.g;
    return Math.round(magentaGreen / 2.55); // Convert to -100 to +100 scale
  }

  private generateOutputPath(inputPath: string): string {
    const dir = path.dirname(inputPath);
    const name = path.basename(inputPath, path.extname(inputPath));
    const ext = path.extname(inputPath);
    return path.join(dir, `${name}_processed${ext}`);
  }

  private generateXMPContent(adjustments: any, include?: { wbBasic?: boolean; hsl?: boolean; colorGrading?: boolean; curves?: boolean; sharpenNoise?: boolean; vignette?: boolean }): string {
    console.log('[PROCESSOR] Generating XMP with adjustments:', adjustments);
    
    // Handle both AI and legacy adjustment formats
    let exposure, brightness, contrast, saturation, temperature, tint;
    let highlights, shadows, whites, blacks, clarity, vibrance;
    let hueAdjustments: any = {};
    // Color grading fields
    const cg = {
      shHue: Math.round(adjustments.color_grade_shadow_hue ?? 0),
      shSat: Math.round(adjustments.color_grade_shadow_sat ?? 0),
      shLum: Math.round(adjustments.color_grade_shadow_lum ?? 0),
      miHue: Math.round(adjustments.color_grade_midtone_hue ?? 0),
      miSat: Math.round(adjustments.color_grade_midtone_sat ?? 0),
      miLum: Math.round(adjustments.color_grade_midtone_lum ?? 0),
      hiHue: Math.round(adjustments.color_grade_highlight_hue ?? 0),
      hiSat: Math.round(adjustments.color_grade_highlight_sat ?? 0),
      hiLum: Math.round(adjustments.color_grade_highlight_lum ?? 0),
      glHue: Math.round(adjustments.color_grade_global_hue ?? 0),
      glSat: Math.round(adjustments.color_grade_global_sat ?? 0),
      glLum: Math.round(adjustments.color_grade_global_lum ?? 0),
      blend: Math.round(adjustments.color_grade_blending ?? 50),
    };
    
    if (adjustments.exposure !== undefined) {
      // New AI format or legacy format
      exposure = adjustments.exposure || 0;
      brightness = adjustments.brightness ? 
        (typeof adjustments.brightness === 'number' && adjustments.brightness > -100 && adjustments.brightness < 100 ? 
         adjustments.brightness : Math.log2(adjustments.brightness) * 25) : 0;
      contrast = adjustments.contrast ? 
        (typeof adjustments.contrast === 'number' && adjustments.contrast > -100 && adjustments.contrast < 100 ? 
         adjustments.contrast : (adjustments.contrast - 1) * 100) : 0;
      saturation = adjustments.saturation ? 
        (typeof adjustments.saturation === 'number' && adjustments.saturation > -100 && adjustments.saturation < 100 ? 
         adjustments.saturation : (adjustments.saturation - 1) * 100) : 0;
      temperature = adjustments.temperature || 5500;
      tint = adjustments.tint || 0;
      
      // Advanced adjustments (from AI)
      highlights = adjustments.highlights || 0;
      shadows = adjustments.shadows || 0;
      whites = adjustments.whites || 0;
      blacks = adjustments.blacks || 0;
      clarity = adjustments.clarity || 0;
      vibrance = adjustments.vibrance || 0;
      
      // Hue adjustments: support AI fields hue_red, hue_orange, ...
      hueAdjustments = {
        red: adjustments.hue_red ?? adjustments.hue?.red ?? 0,
        orange: adjustments.hue_orange ?? adjustments.hue?.orange ?? 0,
        yellow: adjustments.hue_yellow ?? adjustments.hue?.yellow ?? 0,
        green: adjustments.hue_green ?? adjustments.hue?.green ?? 0,
        aqua: adjustments.hue_aqua ?? adjustments.hue?.aqua ?? 0,
        blue: adjustments.hue_blue ?? adjustments.hue?.blue ?? 0,
        purple: adjustments.hue_purple ?? adjustments.hue?.purple ?? 0,
        magenta: adjustments.hue_magenta ?? adjustments.hue?.magenta ?? 0,
      };
    } else {
      // Legacy format fallback
      exposure = 0;
      brightness = 0;
      contrast = 0;
      saturation = 0;
      temperature = 5500;
      tint = 0;
      highlights = shadows = whites = blacks = clarity = vibrance = 0;
      hueAdjustments = { red: 0, orange: 0, yellow: 0, green: 0, aqua: 0, blue: 0, purple: 0, magenta: 0 };
    }
    
    // Color balance adjustments to shadow/midtone/highlight
    const colorBalance = adjustments.colorBalance || { red: 1, green: 1, blue: 1 };
    const shadowsRed = (colorBalance.red - 1) * 50;
    const shadowsGreen = (colorBalance.green - 1) * 50;
    const shadowsBlue = (colorBalance.blue - 1) * 50;

    const timestamp = new Date().toISOString();
    const presetName = `ImageMatch ${timestamp}`;
    const presetUUID = `ImageMatch-${Date.now()}`;
    
    // Build curve sequences (defaults to linear if not provided)
    const toCurveSeq = (arr?: Array<{ input: number; output: number }>) => {
      const pts = (arr && arr.length ? arr : [{ input: 0, output: 0 }, { input: 255, output: 255 }])
        .map(p => ({ x: Math.max(0, Math.min(255, Math.round(p.input))), y: Math.max(0, Math.min(255, Math.round(p.output))) }));
      return pts.map(p => `          <rdf:li>${p.x}, ${p.y}</rdf:li>`).join('\n');
    };
    const curveComposite = toCurveSeq(adjustments.tone_curve);
    const curveRed = toCurveSeq(adjustments.tone_curve_red);
    const curveGreen = toCurveSeq(adjustments.tone_curve_green);
    const curveBlue = toCurveSeq(adjustments.tone_curve_blue);

    let xmp = `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
      crs:PresetType="Normal"
      crs:SortName="${presetName}"
      crs:Group="image-match"
      crs:UUID="${presetUUID}">
      <crs:Version>17.5</crs:Version>
      <crs:ProcessVersion>15.4</crs:ProcessVersion>
      <crs:Name>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${presetName}</rdf:li>
        </rdf:Alt>
      </crs:Name>
      <crs:SortName>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${presetName}</rdf:li>
        </rdf:Alt>
      </crs:SortName>
      <crs:Group>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">image-match</rdf:li>
        </rdf:Alt>
      </crs:Group>
      <crs:WhiteBalance>Custom</crs:WhiteBalance>
      <crs:Temperature>${Math.round(temperature)}</crs:Temperature>
      <crs:Tint>${Math.round(tint)}</crs:Tint>
      <crs:Exposure2012>${exposure.toFixed(2)}</crs:Exposure2012>
      <crs:Contrast2012>${Math.round(contrast)}</crs:Contrast2012>
      <crs:Highlights2012>${Math.round(highlights)}</crs:Highlights2012>
      <crs:Shadows2012>${Math.round(shadows)}</crs:Shadows2012>
      <crs:Whites2012>${Math.round(whites)}</crs:Whites2012>
      <crs:Blacks2012>${Math.round(blacks)}</crs:Blacks2012>
      <crs:Texture>0</crs:Texture>
      <crs:Clarity2012>${Math.round(clarity)}</crs:Clarity2012>
      <crs:Dehaze>0</crs:Dehaze>
      <crs:Vibrance>${Math.round(vibrance)}</crs:Vibrance>
      <crs:Saturation>${Math.round(saturation)}</crs:Saturation>
      <crs:ParametricShadows>0</crs:ParametricShadows>
      <crs:ParametricDarks>0</crs:ParametricDarks>
      <crs:ParametricLights>0</crs:ParametricLights>
      <crs:ParametricHighlights>0</crs:ParametricHighlights>
      <crs:ParametricShadowSplit>25</crs:ParametricShadowSplit>
      <crs:ParametricMidtoneSplit>50</crs:ParametricMidtoneSplit>
      <crs:ParametricHighlightSplit>75</crs:ParametricHighlightSplit>
      <crs:Sharpening>40</crs:Sharpening>
      <crs:SharpeningRadius>1.0</crs:SharpeningRadius>
      <crs:SharpeningDetail>25</crs:SharpeningDetail>
      <crs:SharpeningEdgeMasking>0</crs:SharpeningEdgeMasking>
      <crs:PostCropVignettingAmount>0</crs:PostCropVignettingAmount>
      <crs:GrainAmount>0</crs:GrainAmount>
      <crs:ColorNoiseReduction>25</crs:ColorNoiseReduction>
      <crs:ColorNoiseReductionDetail>50</crs:ColorNoiseReductionDetail>
      <crs:ColorNoiseReductionSmoothness>50</crs:ColorNoiseReductionSmoothness>
      <crs:LuminanceNoiseReduction>0</crs:LuminanceNoiseReduction>
      <crs:HueAdjustmentRed>${Math.round((hueAdjustments as any).red || 0)}</crs:HueAdjustmentRed>
      <crs:HueAdjustmentOrange>${Math.round((hueAdjustments as any).orange || 0)}</crs:HueAdjustmentOrange>
      <crs:HueAdjustmentYellow>${Math.round((hueAdjustments as any).yellow || 0)}</crs:HueAdjustmentYellow>
      <crs:HueAdjustmentGreen>${Math.round((hueAdjustments as any).green || 0)}</crs:HueAdjustmentGreen>
      <crs:HueAdjustmentAqua>${Math.round((hueAdjustments as any).aqua || 0)}</crs:HueAdjustmentAqua>
      <crs:HueAdjustmentBlue>${Math.round((hueAdjustments as any).blue || 0)}</crs:HueAdjustmentBlue>
      <crs:HueAdjustmentPurple>${Math.round((hueAdjustments as any).purple || 0)}</crs:HueAdjustmentPurple>
      <crs:HueAdjustmentMagenta>${Math.round((hueAdjustments as any).magenta || 0)}</crs:HueAdjustmentMagenta>
      <crs:SaturationAdjustmentRed>0</crs:SaturationAdjustmentRed>
      <crs:SaturationAdjustmentOrange>0</crs:SaturationAdjustmentOrange>
      <crs:SaturationAdjustmentYellow>0</crs:SaturationAdjustmentYellow>
      <crs:SaturationAdjustmentGreen>0</crs:SaturationAdjustmentGreen>
      <crs:SaturationAdjustmentAqua>0</crs:SaturationAdjustmentAqua>
      <crs:SaturationAdjustmentBlue>0</crs:SaturationAdjustmentBlue>
      <crs:SaturationAdjustmentPurple>0</crs:SaturationAdjustmentPurple>
      <crs:SaturationAdjustmentMagenta>0</crs:SaturationAdjustmentMagenta>
      <crs:LuminanceAdjustmentRed>0</crs:LuminanceAdjustmentRed>
      <crs:LuminanceAdjustmentOrange>0</crs:LuminanceAdjustmentOrange>
      <crs:LuminanceAdjustmentYellow>0</crs:LuminanceAdjustmentYellow>
      <crs:LuminanceAdjustmentGreen>0</crs:LuminanceAdjustmentGreen>
      <crs:LuminanceAdjustmentAqua>0</crs:LuminanceAdjustmentAqua>
      <crs:LuminanceAdjustmentBlue>0</crs:LuminanceAdjustmentBlue>
      <crs:LuminanceAdjustmentPurple>0</crs:LuminanceAdjustmentPurple>
      <crs:LuminanceAdjustmentMagenta>0</crs:LuminanceAdjustmentMagenta>
      <crs:SplitToningShadowHue>${cg.shHue || 0}</crs:SplitToningShadowHue>
      <crs:SplitToningShadowSaturation>${cg.shSat || 0}</crs:SplitToningShadowSaturation>
      <crs:SplitToningHighlightHue>${cg.hiHue || 0}</crs:SplitToningHighlightHue>
      <crs:SplitToningHighlightSaturation>${cg.hiSat || 0}</crs:SplitToningHighlightSaturation>
      <crs:SplitToningBalance>0</crs:SplitToningBalance>
      <crs:ColorGradeShadowHue>${cg.shHue}</crs:ColorGradeShadowHue>
      <crs:ColorGradeShadowSat>${cg.shSat}</crs:ColorGradeShadowSat>
      <crs:ColorGradeMidtoneHue>${cg.miHue}</crs:ColorGradeMidtoneHue>
      <crs:ColorGradeMidtoneSat>${cg.miSat}</crs:ColorGradeMidtoneSat>
      <crs:ColorGradeHighlightHue>${cg.hiHue}</crs:ColorGradeHighlightHue>
      <crs:ColorGradeHighlightSat>${cg.hiSat}</crs:ColorGradeHighlightSat>
      <crs:ColorGradeShadowLum>${cg.shLum}</crs:ColorGradeShadowLum>
      <crs:ColorGradeMidtoneLum>${cg.miLum}</crs:ColorGradeMidtoneLum>
      <crs:ColorGradeHighlightLum>${cg.hiLum}</crs:ColorGradeHighlightLum>
      <crs:ColorGradeBlending>${cg.blend}</crs:ColorGradeBlending>
      <crs:ColorGradeGlobalHue>${cg.glHue}</crs:ColorGradeGlobalHue>
      <crs:ColorGradeGlobalSat>${cg.glSat}</crs:ColorGradeGlobalSat>
      <crs:ColorGradeGlobalLum>${cg.glLum}</crs:ColorGradeGlobalLum>
      <crs:AutoLateralCA>0</crs:AutoLateralCA>
      <crs:LensProfileEnable>0</crs:LensProfileEnable>
      <crs:LensManualDistortionAmount>0</crs:LensManualDistortionAmount>
      <crs:VignetteAmount>0</crs:VignetteAmount>
      <crs:DefringePurpleAmount>0</crs:DefringePurpleAmount>
      <crs:DefringePurpleHueLo>30</crs:DefringePurpleHueLo>
      <crs:DefringePurpleHueHi>70</crs:DefringePurpleHueHi>
      <crs:DefringeGreenAmount>0</crs:DefringeGreenAmount>
      <crs:DefringeGreenHueLo>40</crs:DefringeGreenHueLo>
      <crs:DefringeGreenHueHi>60</crs:DefringeGreenHueHi>
      <crs:PerspectiveUpright>0</crs:PerspectiveUpright>
      <crs:PerspectiveVertical>0</crs:PerspectiveVertical>
      <crs:PerspectiveHorizontal>0</crs:PerspectiveHorizontal>
      <crs:PerspectiveRotate>0.0</crs:PerspectiveRotate>
      <crs:PerspectiveAspect>0</crs:PerspectiveAspect>
      <crs:PerspectiveScale>100</crs:PerspectiveScale>
      <crs:PerspectiveX>0.00</crs:PerspectiveX>
      <crs:PerspectiveY>0.00</crs:PerspectiveY>
      <crs:GrainAmount>0</crs:GrainAmount>
      <crs:PostCropVignettingAmount>0</crs:PostCropVignettingAmount>
      <crs:ShadowTint>0</crs:ShadowTint>
      <crs:RedHue>0</crs:RedHue>
      <crs:RedSaturation>0</crs:RedSaturation>
      <crs:GreenHue>0</crs:GreenHue>
      <crs:GreenSaturation>0</crs:GreenSaturation>
      <crs:BlueHue>0</crs:BlueHue>
      <crs:BlueSaturation>0</crs:BlueSaturation>
      <crs:OverrideLookVignette>False</crs:OverrideLookVignette>
      <crs:ToneCurveName2012>Linear</crs:ToneCurveName2012>
      <crs:CameraProfile>Adobe Color</crs:CameraProfile>
      <crs:HasSettings>True</crs:HasSettings>
      <crs:CropTop>0</crs:CropTop>
      <crs:CropLeft>0</crs:CropLeft>
      <crs:CropBottom>1</crs:CropBottom>
      <crs:CropRight>1</crs:CropRight>
      <crs:CropAngle>0</crs:CropAngle>
      <crs:CropConstrainToWarp>0</crs:CropConstrainToWarp>
      <crs:HasCrop>False</crs:HasCrop>
      <crs:AlreadyApplied>False</crs:AlreadyApplied>
      ${include?.curves === false ? '' : `
      <crs:ToneCurvePV2012>
        <rdf:Seq>
${curveComposite}
        </rdf:Seq>
      </crs:ToneCurvePV2012>
      <crs:ToneCurvePV2012Red>
        <rdf:Seq>
${curveRed}
        </rdf:Seq>
      </crs:ToneCurvePV2012Red>
      <crs:ToneCurvePV2012Green>
        <rdf:Seq>
${curveGreen}
        </rdf:Seq>
      </crs:ToneCurvePV2012Green>
      <crs:ToneCurvePV2012Blue>
        <rdf:Seq>
${curveBlue}
        </rdf:Seq>
      </crs:ToneCurvePV2012Blue>`}
      <!-- No Look block for standard presets; Amount is controlled by Preset Amount slider in LR Classic 13+ -->
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`;

    // Optionally remove groups the user opted out of
    const removeTags = (patterns: RegExp[]) => { patterns.forEach((re) => { xmp = xmp.replace(re, ''); }); };
      if (include) {
      if (include.curves === false) {
        removeTags([
          /\n\s*<crs:ToneCurvePV2012>[\s\S]*?<\/crs:ToneCurvePV2012>/g,
          /\n\s*<crs:ToneCurvePV2012Red>[\s\S]*?<\/crs:ToneCurvePV2012Red>/g,
          /\n\s*<crs:ToneCurvePV2012Green>[\s\S]*?<\/crs:ToneCurvePV2012Green>/g,
          /\n\s*<crs:ToneCurvePV2012Blue>[\s\S]*?<\/crs:ToneCurvePV2012Blue>/g,
        ]);
      }
      if (include.wbBasic === false) {
        removeTags([
          /\n\s*<crs:WhiteBalance>[^<]*<\/crs:WhiteBalance>/g,
          /\n\s*<crs:Temperature>[^<]*<\/crs:Temperature>/g,
          /\n\s*<crs:Tint>[^<]*<\/crs:Tint>/g,
          /\n\s*<crs:Exposure2012>[^<]*<\/crs:Exposure2012>/g,
          /\n\s*<crs:Contrast2012>[^<]*<\/crs:Contrast2012>/g,
          /\n\s*<crs:Highlights2012>[^<]*<\/crs:Highlights2012>/g,
          /\n\s*<crs:Shadows2012>[^<]*<\/crs:Shadows2012>/g,
          /\n\s*<crs:Whites2012>[^<]*<\/crs:Whites2012>/g,
          /\n\s*<crs:Blacks2012>[^<]*<\/crs:Blacks2012>/g,
          /\n\s*<crs:Texture>[^<]*<\/crs:Texture>/g,
          /\n\s*<crs:Clarity2012>[^<]*<\/crs:Clarity2012>/g,
          /\n\s*<crs:Dehaze>[^<]*<\/crs:Dehaze>/g,
          /\n\s*<crs:Vibrance>[^<]*<\/crs:Vibrance>/g,
          /\n\s*<crs:Saturation>[^<]*<\/crs:Saturation>/g,
        ]);
      }
      if (include.hsl === false) {
        removeTags([
          /\n\s*<crs:HueAdjustment[A-Za-z]+>[^<]*<\/crs:HueAdjustment[A-Za-z]+>/g,
          /\n\s*<crs:SaturationAdjustment[A-Za-z]+>[^<]*<\/crs:SaturationAdjustment[A-Za-z]+>/g,
          /\n\s*<crs:LuminanceAdjustment[A-Za-z]+>[^<]*<\/crs:LuminanceAdjustment[A-Za-z]+>/g,
        ]);
      }
      if (include.colorGrading === false) {
        removeTags([
          /\n\s*<crs:SplitToning[^>]+>[^<]*<\/crs:SplitToning[^>]+>/g,
          /\n\s*<crs:SplitToningBalance>[^<]*<\/crs:SplitToningBalance>/g,
          /\n\s*<crs:ColorGrade[A-Za-z]+>[^<]*<\/crs:ColorGrade[A-Za-z]+>/g,
        ]);
      }
      if (!include.sharpenNoise) {
        removeTags([
          /\n\s*<crs:Sharpening(?:Radius|Detail|EdgeMasking)?>[^<]*<\/crs:Sharpening(?:Radius|Detail|EdgeMasking)?>/g,
          /\n\s*<crs:LuminanceNoiseReduction>[^<]*<\/crs:LuminanceNoiseReduction>/g,
          /\n\s*<crs:ColorNoiseReduction(?:Detail|Smoothness)?>[^<]*<\/crs:ColorNoiseReduction(?:Detail|Smoothness)?>/g,
        ]);
      }
      if (!include.vignette) {
        removeTags([/\n\s*<crs:PostCropVignettingAmount>[^<]*<\/crs:PostCropVignettingAmount>/g]);
      }
    }

    return xmp;
  }

  private async processHeicImages(data: StyleMatchOptions): Promise<ProcessingResult> {
    console.log('[PROCESSOR] Processing HEIC images with enhanced pipeline');
    
    try {
      // Try standard processing first (works for most HEIC files)
      return await this.processStandardImages(data);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[PROCESSOR] Standard HEIC processing failed:', errorMsg);
      
      // If it's a codec issue, try conversion approach
      if (errorMsg.includes('Unsupported codec') || errorMsg.includes('bad seek')) {
        console.log('[PROCESSOR] Attempting HEIC conversion approach');
        return await this.processHeicWithConversion(data);
      }
      
      return {
        success: false,
        error: `HEIC processing failed: ${errorMsg}. Try converting the HEIC file to JPEG first.`,
      };
    }
  }

  private async processHeicWithConversion(data: StyleMatchOptions): Promise<ProcessingResult> {
    console.log('[PROCESSOR] Processing HEIC with conversion fallback');
    
    // For now, provide helpful error message
    return {
      success: false,
      error: (
        `HEIC codec not supported by this system. Please convert to JPEG first:\n` +
        `• macOS: Open in Preview → File → Export As → JPEG\n` +
        `• Photos app: Select image → File → Export → JPEG\n` +
        `• iPhone: Settings → Camera → Formats → Most Compatible\n` +
        `• Online: Use CloudConvert or Convertio`
      ),
    };
  }

  private async applyAIAdjustments(inputPath: string, outputPath: string, aiAdjustments: AIColorAdjustments): Promise<void> {
    console.log('[PROCESSOR] Applying AI-generated adjustments');
    console.log('[PROCESSOR] Input:', inputPath);
    console.log('[PROCESSOR] Output:', outputPath);
    console.log('[PROCESSOR] AI adjustments:', aiAdjustments);
    
    try {
      let image = sharp(inputPath);

      // Apply exposure adjustment (convert stops to multiplier)
      if (Math.abs(aiAdjustments.exposure) > 0.01) {
        console.log('[PROCESSOR] Applying exposure:', aiAdjustments.exposure, 'stops');
        const multiplier = Math.pow(2, aiAdjustments.exposure);
        image = image.linear(multiplier, 0);
      }

      // Apply brightness, contrast, saturation adjustments
      const modulateOptions: any = {};
      
      // Convert AI brightness (-100 to +100) to Sharp brightness (0.5 to 2.0)
      if (Math.abs(aiAdjustments.brightness) > 1) {
        modulateOptions.brightness = 1 + (aiAdjustments.brightness / 100);
        console.log('[PROCESSOR] Applying brightness:', modulateOptions.brightness);
      }
      
      // Convert AI saturation (-100 to +100) to Sharp saturation (0.0 to 2.0)
      if (Math.abs(aiAdjustments.saturation) > 1) {
        modulateOptions.saturation = Math.max(0, 1 + (aiAdjustments.saturation / 100));
        console.log('[PROCESSOR] Applying saturation:', modulateOptions.saturation);
      }

      if (Object.keys(modulateOptions).length > 0) {
        image = image.modulate(modulateOptions);
      }

      // Apply contrast using gamma correction approximation
      if (Math.abs(aiAdjustments.contrast) > 1) {
        console.log('[PROCESSOR] Applying contrast:', aiAdjustments.contrast);
        // Convert contrast (-100 to +100) to gamma (1.0 to 3.0 for Sharp)
        // Positive contrast = higher gamma (more contrast)
        // Negative contrast = lower gamma (less contrast)
        const gamma = Math.max(1.0, Math.min(3.0, 1 + (aiAdjustments.contrast / 100)));
        console.log('[PROCESSOR] Applying gamma:', gamma);
        image = image.gamma(gamma);
      }

      // Apply Color Grading (global) approximation first if provided
      const cgHue = (aiAdjustments as any).color_grade_global_hue;
      const cgSat = (aiAdjustments as any).color_grade_global_sat;
      const cgLum = (aiAdjustments as any).color_grade_global_lum;
      if (typeof cgHue === 'number' || typeof cgSat === 'number' || typeof cgLum === 'number') {
        const hueDegrees = typeof cgHue === 'number' ? Math.max(-180, Math.min(360, cgHue)) : 0;
        const satFactor = typeof cgSat === 'number' ? Math.max(0, 1 + (cgSat / 100)) : 1;
        const lumFactor = typeof cgLum === 'number' ? 1 + (cgLum / 200) : 1; // map -100..100 to 0.5..1.5
        const mod: any = {};
        if (hueDegrees) mod.hue = Math.round(hueDegrees);
        if (satFactor !== 1) mod.saturation = satFactor;
        if (lumFactor !== 1) mod.brightness = lumFactor;
        if (Object.keys(mod).length > 0) {
          console.log('[PROCESSOR] Applying global color grade modulate:', mod);
          image = image.modulate(mod);
        }
      }

      // Apply vibrance using saturation boost on less saturated colors
      if (Math.abs(aiAdjustments.vibrance) > 1) {
        console.log('[PROCESSOR] Applying vibrance boost:', aiAdjustments.vibrance);
        const vibranceBoost = 1 + (aiAdjustments.vibrance / 200);
        image = image.modulate({ saturation: vibranceBoost });
      }

      // Apply a global hue rotation as an approximation of selective hue shifts
      const hueFields = ['hue_red','hue_orange','hue_yellow','hue_green','hue_aqua','hue_blue'];
      const presentHueValues = hueFields
        .map((k) => (aiAdjustments as any)[k])
        .filter((v: any) => typeof v === 'number');
      if (presentHueValues.length > 0) {
        const avgHue = presentHueValues.reduce((a: number, b: number) => a + b, 0) / presentHueValues.length;
        // Map -100..100 -> roughly -60..60 degrees
        const hueDegrees = Math.max(-60, Math.min(60, avgHue * 0.6));
        const hueInt = Math.round(hueDegrees);
        if (Math.abs(hueInt) > 0) {
          console.log('[PROCESSOR] Applying global hue rotation (deg):', hueInt);
          image = image.modulate({ hue: hueInt });
        }
      }

      // Note: Advanced color grading (hue shifts, selective colors) would require
      // more sophisticated processing or external tools like ImageMagick
      // For now, we apply the core adjustments that Sharp supports well

      // Determine output format based on input
      const ext = path.extname(inputPath).toLowerCase();
      const outputExt = path.extname(outputPath).toLowerCase();
      console.log('[PROCESSOR] Saving image - input ext:', ext, 'output ext:', outputExt);
      
      if (outputExt === '.jpg' || outputExt === '.jpeg') {
        await image.jpeg({ quality: 95 }).toFile(outputPath);
      } else if (outputExt === '.png') {
        await image.png({ compressionLevel: 6 }).toFile(outputPath);
      } else if (outputExt === '.tiff' || outputExt === '.tif') {
        await image.tiff({ compression: 'lzw' }).toFile(outputPath);
      } else if (outputExt === '.heic' || outputExt === '.heif' || outputExt === '.avif') {
        if (outputExt === '.avif') {
          await image.avif({ quality: 95 }).toFile(outputPath);
        } else {
          await image.heif({ quality: 95 }).toFile(outputPath);
        }
      } else {
        // Default to JPEG for unknown formats
        await image.jpeg({ quality: 95 }).toFile(outputPath);
      }
      
      console.log('[PROCESSOR] AI-processed image saved successfully to:', outputPath);
    } catch (error) {
      console.error('[PROCESSOR] Failed to apply AI adjustments:', error);
      throw error;
    }
  }

  // Build a simple white balance color matrix for Sharp.recomb
  private buildWhiteBalanceMatrix(temperature: number, tint: number): [[number, number, number],[number, number, number],[number, number, number]] {
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const tempDelta = clamp((temperature - 6500) / 3500, -1, 1); // -1 warm, +1 cool
    let r = 1 - 0.2 * tempDelta; // cooler -> reduce red
    let b = 1 + 0.2 * tempDelta; // cooler -> increase blue
    let g = 1.0;

    const tintFactor = clamp(tint / 150, -1, 1); // -1 green .. +1 magenta
    g *= 1 - 0.15 * tintFactor; // magenta -> reduce green
    const rbTintBoost = 1 + 0.075 * tintFactor; // magenta -> boost R/B slightly
    r *= rbTintBoost;
    b *= rbTintBoost;

    // Normalize to keep overall luminance roughly stable
    const avg = (r + g + b) / 3;
    r /= avg; g /= avg; b /= avg;

    const matrix: [[number, number, number],[number, number, number],[number, number, number]] = [
      [r, 0, 0],
      [0, g, 0],
      [0, 0, b],
    ];
    return matrix;
  }

  private async applyAIAdjustmentsWithImageMagick(inputPath: string, outputPath: string, aiAdjustments: AIColorAdjustments): Promise<void> {
    console.log('[PROCESSOR] Applying comprehensive AI adjustments with ImageMagick');
    console.log('[PROCESSOR] Input:', inputPath);
    console.log('[PROCESSOR] Output:', outputPath);
    console.log('[PROCESSOR] AI adjustments:', aiAdjustments);

    return new Promise((resolve, reject) => {
      try {
        // Read the input file
        fs.readFile(inputPath).then(inputBuffer => {
          
          ImageMagick.read(inputBuffer, (img) => {
            try {
              console.log('[PROCESSOR] ImageMagick processing started');

              // Apply exposure adjustment using modulate
              if (Math.abs(aiAdjustments.exposure) > 0.01) {
                const exposureMultiplier = Math.pow(2, aiAdjustments.exposure);
                const brightnessPercent = Math.max(50, Math.min(200, exposureMultiplier * 100));
                console.log('[PROCESSOR] Applying exposure:', aiAdjustments.exposure, 'stops');
                img.modulate(new Percentage(brightnessPercent), new Percentage(100), new Percentage(100));
              }

              // Apply brightness adjustment
              if (Math.abs(aiAdjustments.brightness) > 1) {
                const brightnessPercent = Math.max(50, Math.min(150, 100 + aiAdjustments.brightness));
                console.log('[PROCESSOR] Applying brightness:', aiAdjustments.brightness);
                img.modulate(new Percentage(brightnessPercent), new Percentage(100), new Percentage(100));
              }

              // Apply saturation adjustment
              if (Math.abs(aiAdjustments.saturation) > 1) {
                const saturationPercent = Math.max(0, Math.min(200, 100 + aiAdjustments.saturation));
                console.log('[PROCESSOR] Applying saturation:', aiAdjustments.saturation);
                img.modulate(new Percentage(100), new Percentage(saturationPercent), new Percentage(100));
              }

              // Apply contrast using sigmoidal contrast
              if (Math.abs(aiAdjustments.contrast) > 1) {
                const contrastAmount = Math.max(0.1, Math.min(10, Math.abs(aiAdjustments.contrast) / 10));
                console.log('[PROCESSOR] Applying contrast:', aiAdjustments.contrast);
                img.sigmoidalContrast(contrastAmount, aiAdjustments.contrast > 0 ? 1 : 0);
              }

              // Apply whites/blacks level adjustment
              if (Math.abs(aiAdjustments.whites) > 5 || Math.abs(aiAdjustments.blacks) > 5) {
                console.log('[PROCESSOR] Applying whites/blacks - whites:', aiAdjustments.whites, 'blacks:', aiAdjustments.blacks);
                
                // Adjust black and white points
                const blackPoint = Math.max(0, Math.min(20, 5 + aiAdjustments.blacks / 10));
                const whitePoint = Math.max(80, Math.min(100, 95 + aiAdjustments.whites / 10));
                
                img.level(new Percentage(blackPoint), new Percentage(whitePoint));
              }

              // Apply clarity using blur or sharpen
              if (Math.abs(aiAdjustments.clarity) > 5) {
                console.log('[PROCESSOR] Applying clarity:', aiAdjustments.clarity);
                
                if (aiAdjustments.clarity > 0) {
                  // Positive clarity - sharpen
                  const radius = Math.min(2, aiAdjustments.clarity / 30);
                  const sigma = Math.max(0.1, radius);
                  img.sharpen(radius, sigma);
                } else {
                  // Negative clarity - blur slightly
                  const sigma = Math.min(1, Math.abs(aiAdjustments.clarity) / 50);
                  img.blur(0, sigma);
                }
              }

              // Apply vibrance using enhanced saturation
              if (Math.abs(aiAdjustments.vibrance) > 5) {
                console.log('[PROCESSOR] Applying vibrance:', aiAdjustments.vibrance);
                const vibrancePercent = Math.max(50, Math.min(150, 100 + aiAdjustments.vibrance / 2));
                img.modulate(new Percentage(100), new Percentage(vibrancePercent), new Percentage(100));
              }

              // Apply hue rotation for selective color effects
              if (Math.abs(aiAdjustments.hue_red) > 5 || Math.abs(aiAdjustments.hue_yellow) > 5 || 
                  Math.abs(aiAdjustments.hue_blue) > 5 || Math.abs(aiAdjustments.hue_green) > 5) {
                
                // Calculate average hue shift (simplified approach)
                const avgHueShift = (aiAdjustments.hue_red + aiAdjustments.hue_yellow + 
                                   aiAdjustments.hue_blue + aiAdjustments.hue_green) / 4;
                
                if (Math.abs(avgHueShift) > 5) {
                  console.log('[PROCESSOR] Applying average hue shift:', avgHueShift);
                  const huePercent = Math.max(50, Math.min(150, 100 + avgHueShift));
                  img.modulate(new Percentage(100), new Percentage(100), new Percentage(huePercent));
                }
              }

              console.log('[PROCESSOR] Writing processed image with ImageMagick');
              
              // Write the processed image
              img.write(MagickFormat.Dng, (data) => {
                fs.writeFile(outputPath, data).then(() => {
                  console.log('[PROCESSOR] ImageMagick processing completed successfully');
                  resolve();
                }).catch((error) => {
                  console.error('[PROCESSOR] Failed to write ImageMagick output:', error);
                  reject(error);
                });
              });

            } catch (error) {
              console.error('[PROCESSOR] ImageMagick processing failed:', error);
              reject(error);
            }
          });

        }).catch(reject);

      } catch (error) {
        console.error('[PROCESSOR] Failed to apply ImageMagick adjustments:', error);
        reject(error);
      }
    });
  }

  private convertAIToLegacyFormat(aiAdjustments: AIColorAdjustments): any {
    // Convert AI adjustments to legacy format for preset generation compatibility
    return {
      exposure: aiAdjustments.exposure,
      brightness: 1 + (aiAdjustments.brightness / 100),
      contrast: 1 + (aiAdjustments.contrast / 100),
      saturation: 1 + (aiAdjustments.saturation / 100),
      temperature: aiAdjustments.temperature,
      tint: aiAdjustments.tint,
      highlights: aiAdjustments.highlights,
      shadows: aiAdjustments.shadows,
      whites: aiAdjustments.whites,
      blacks: aiAdjustments.blacks,
      clarity: aiAdjustments.clarity,
      vibrance: aiAdjustments.vibrance,
      colorBalance: { red: 1, green: 1, blue: 1 }, // Basic fallback
      hue: {
        red: aiAdjustments.hue_red,
        orange: aiAdjustments.hue_orange,
        yellow: aiAdjustments.hue_yellow,
        green: aiAdjustments.hue_green,
        aqua: aiAdjustments.hue_aqua,
        blue: aiAdjustments.hue_blue,
        purple: aiAdjustments.hue_purple,
        magenta: aiAdjustments.hue_magenta
      }
    };
  }
}
