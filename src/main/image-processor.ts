import sharp from 'sharp';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ColorMatcher } from '../algorithms/color-matching';
import { FileUtils } from '../utils/file-utils';

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
  private readonly supportedFormats = ['.jpg', '.jpeg', '.png', '.tiff', '.tif'];
  private readonly rawFormats = ['.dng', '.cr2', '.nef', '.arw'];

  async processImage(data: StyleMatchOptions): Promise<ProcessingResult> {
    try {
      const { baseImagePath, targetImagePath, outputPath } = data;
      
      // Check if files exist
      await this.validateImageFile(baseImagePath);
      await this.validateImageFile(targetImagePath);

      const baseExt = path.extname(baseImagePath).toLowerCase();
      const targetExt = path.extname(targetImagePath).toLowerCase();

      // Handle different file types
      if (this.isRawFormat(baseExt) || this.isRawFormat(targetExt)) {
        return await this.processRawImages(data);
      } else {
        return await this.processStandardImages(data);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async analyzeColors(imagePath: string): Promise<ColorAnalysis> {
    const ext = path.extname(imagePath).toLowerCase();
    
    if (this.isRawFormat(ext)) {
      return await this.analyzeRawImageColors(imagePath);
    } else {
      return await this.analyzeStandardImageColors(imagePath);
    }
  }

  async matchStyle(data: StyleMatchOptions): Promise<ProcessingResult> {
    try {
      const baseColors = await this.analyzeColors(data.baseImagePath);
      const targetColors = await this.analyzeColors(data.targetImagePath);

      // Apply style matching based on options
      const adjustments = this.calculateAdjustments(baseColors, targetColors, data);
      
      // Apply adjustments to target image
      const outputPath = data.outputPath || this.generateOutputPath(data.targetImagePath);
      await this.applyAdjustments(data.targetImagePath, outputPath, adjustments);

      return {
        success: true,
        outputPath,
        metadata: { baseColors, targetColors, adjustments },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async generateLightroomPreset(data: any): Promise<ProcessingResult> {
    try {
      // TODO: Implement XMP preset generation
      const presetPath = path.join(process.cwd(), 'presets', `${Date.now()}-preset.xmp`);
      
      // For now, create a basic XMP structure
      const xmpContent = this.generateXMPContent(data.adjustments);
      await fs.writeFile(presetPath, xmpContent);

      return {
        success: true,
        outputPath: presetPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async validateImageFile(filePath: string): Promise<void> {
    try {
      await fs.access(filePath);
    } catch {
      throw new Error(`File not found: ${filePath}`);
    }
  }

  private isRawFormat(extension: string): boolean {
    return this.rawFormats.includes(extension.toLowerCase());
  }

  private async processRawImages(data: StyleMatchOptions): Promise<ProcessingResult> {
    // TODO: Implement RAW processing with LibRaw-Wasm
    throw new Error('RAW image processing not yet implemented');
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
    const image = sharp(imagePath);
    const { data, info } = await image
      .resize(512, 512, { fit: 'inside' }) // Increased resolution for better analysis
      .raw()
      .toBuffer({ resolveWithObject: true });

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
    // TODO: Implement RAW color analysis with LibRaw-Wasm
    throw new Error('RAW color analysis not yet implemented');
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
    let image = sharp(inputPath);

    // Apply exposure adjustment
    if (adjustments.exposure && Math.abs(adjustments.exposure) > 0.01) {
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
      image = image.modulate(modulateOptions);
    }

    // Apply color balance adjustments using color matrix
    if (adjustments.colorBalance && (
      Math.abs(adjustments.colorBalance.red - 1) > 0.01 ||
      Math.abs(adjustments.colorBalance.green - 1) > 0.01 ||
      Math.abs(adjustments.colorBalance.blue - 1) > 0.01
    )) {
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
    
    if (outputExt === '.jpg' || outputExt === '.jpeg') {
      await image.jpeg({ quality: 95 }).toFile(outputPath);
    } else if (outputExt === '.png') {
      await image.png({ compressionLevel: 6 }).toFile(outputPath);
    } else if (outputExt === '.tiff' || outputExt === '.tif') {
      await image.tiff({ compression: 'lzw' }).toFile(outputPath);
    } else {
      // Default to JPEG for unknown formats
      await image.jpeg({ quality: 95 }).toFile(outputPath);
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

  private generateXMPContent(adjustments: any): string {
    // Convert our adjustments to Lightroom format
    const exposure = adjustments.exposure || 0;
    const brightness = adjustments.brightness ? Math.log2(adjustments.brightness) * 25 : 0;
    const contrast = adjustments.contrast ? (adjustments.contrast - 1) * 100 : 0;
    const saturation = adjustments.saturation ? (adjustments.saturation - 1) * 100 : 0;
    const temperature = adjustments.temperature || 5500;
    const tint = adjustments.tint || 0;
    
    // Color balance adjustments to shadow/midtone/highlight
    const colorBalance = adjustments.colorBalance || { red: 1, green: 1, blue: 1 };
    const shadowsRed = (colorBalance.red - 1) * 50;
    const shadowsGreen = (colorBalance.green - 1) * 50;
    const shadowsBlue = (colorBalance.blue - 1) * 50;

    const timestamp = new Date().toISOString();
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 7.0-c000 79.217bca6, 2023/09/30-10:35:33">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/">
      <crs:Version>16.0</crs:Version>
      <crs:ProcessVersion>15.4</crs:ProcessVersion>
      <crs:WhiteBalance>Custom</crs:WhiteBalance>
      <crs:Temperature>${Math.round(temperature)}</crs:Temperature>
      <crs:Tint>${Math.round(tint)}</crs:Tint>
      <crs:Exposure2012>${exposure.toFixed(2)}</crs:Exposure2012>
      <crs:Contrast2012>${Math.round(contrast)}</crs:Contrast2012>
      <crs:Highlights2012>0</crs:Highlights2012>
      <crs:Shadows2012>0</crs:Shadows2012>
      <crs:Whites2012>0</crs:Whites2012>
      <crs:Blacks2012>0</crs:Blacks2012>
      <crs:Texture>0</crs:Texture>
      <crs:Clarity2012>0</crs:Clarity2012>
      <crs:Dehaze>0</crs:Dehaze>
      <crs:Vibrance>0</crs:Vibrance>
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
      <crs:HueAdjustmentRed>0</crs:HueAdjustmentRed>
      <crs:HueAdjustmentOrange>0</crs:HueAdjustmentOrange>
      <crs:HueAdjustmentYellow>0</crs:HueAdjustmentYellow>
      <crs:HueAdjustmentGreen>0</crs:HueAdjustmentGreen>
      <crs:HueAdjustmentAqua>0</crs:HueAdjustmentAqua>
      <crs:HueAdjustmentBlue>0</crs:HueAdjustmentBlue>
      <crs:HueAdjustmentPurple>0</crs:HueAdjustmentPurple>
      <crs:HueAdjustmentMagenta>0</crs:HueAdjustmentMagenta>
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
      <crs:SplitToningShadowHue>0</crs:SplitToningShadowHue>
      <crs:SplitToningShadowSaturation>0</crs:SplitToningShadowSaturation>
      <crs:SplitToningHighlightHue>0</crs:SplitToningHighlightHue>
      <crs:SplitToningHighlightSaturation>0</crs:SplitToningHighlightSaturation>
      <crs:SplitToningBalance>0</crs:SplitToningBalance>
      <crs:ColorGradeMidtoneHue>0</crs:ColorGradeMidtoneHue>
      <crs:ColorGradeMidtoneSat>0</crs:ColorGradeMidtoneSat>
      <crs:ColorGradeShadowLum>0</crs:ColorGradeShadowLum>
      <crs:ColorGradeMidtoneLum>0</crs:ColorGradeMidtoneLum>
      <crs:ColorGradeHighlightLum>0</crs:ColorGradeHighlightLum>
      <crs:ColorGradeBlending>50</crs:ColorGradeBlending>
      <crs:ColorGradeGlobalHue>0</crs:ColorGradeGlobalHue>
      <crs:ColorGradeGlobalSat>0</crs:ColorGradeGlobalSat>
      <crs:ColorGradeGlobalLum>0</crs:ColorGradeGlobalLum>
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
      <crs:CameraProfile>Adobe Standard</crs:CameraProfile>
      <crs:CameraProfileDigest>87FB0EDC503E2E4E86D199DCBF9FA444</crs:CameraProfileDigest>
      <crs:HasSettings>True</crs:HasSettings>
      <crs:CropTop>0</crs:CropTop>
      <crs:CropLeft>0</crs:CropLeft>
      <crs:CropBottom>1</crs:CropBottom>
      <crs:CropRight>1</crs:CropRight>
      <crs:CropAngle>0</crs:CropAngle>
      <crs:CropConstrainToWarp>0</crs:CropConstrainToWarp>
      <crs:HasCrop>False</crs:HasCrop>
      <crs:AlreadyApplied>False</crs:AlreadyApplied>
      <crs:ToneCurvePV2012>
        <rdf:Seq>
          <rdf:li>0, 0</rdf:li>
          <rdf:li>255, 255</rdf:li>
        </rdf:Seq>
      </crs:ToneCurvePV2012>
      <crs:ToneCurvePV2012Red>
        <rdf:Seq>
          <rdf:li>0, 0</rdf:li>
          <rdf:li>255, 255</rdf:li>
        </rdf:Seq>
      </crs:ToneCurvePV2012Red>
      <crs:ToneCurvePV2012Green>
        <rdf:Seq>
          <rdf:li>0, 0</rdf:li>
          <rdf:li>255, 255</rdf:li>
        </rdf:Seq>
      </crs:ToneCurvePV2012Green>
      <crs:ToneCurvePV2012Blue>
        <rdf:Seq>
          <rdf:li>0, 0</rdf:li>
          <rdf:li>255, 255</rdf:li>
        </rdf:Seq>
      </crs:ToneCurvePV2012Blue>
      <crs:Look>
        <rdf:Description>
          <crs:Name>ImageMatch Style</crs:Name>
          <crs:Amount>1.0</crs:Amount>
          <crs:UUID>ImageMatch-${Date.now()}</crs:UUID>
          <crs:SupportsAmount>false</crs:SupportsAmount>
          <crs:SupportsMonochrome>false</crs:SupportsMonochrome>
          <crs:SupportsOutputReferred>false</crs:SupportsOutputReferred>
        </rdf:Description>
      </crs:Look>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`;
  }
}