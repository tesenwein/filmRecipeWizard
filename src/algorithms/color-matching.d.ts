export interface ColorSpace {
    r: number;
    g: number;
    b: number;
}
export interface LABColor {
    l: number;
    a: number;
    b: number;
}
export interface HSVColor {
    h: number;
    s: number;
    v: number;
}
export declare class ColorMatcher {
    /**
     * Convert RGB to LAB color space for better color matching
     */
    static rgbToLab(rgb: ColorSpace): LABColor;
    /**
     * Convert RGB to HSV color space
     */
    static rgbToHsv(rgb: ColorSpace): HSVColor;
    /**
     * Calculate color difference using Delta E 2000 formula
     */
    static deltaE2000(lab1: LABColor, lab2: LABColor): number;
    /**
     * Match histogram distribution between two images
     */
    static matchHistogram(sourceHist: number[], targetHist: number[]): number[];
    /**
     * Calculate cumulative distribution function from histogram
     */
    private static calculateCDF;
    /**
     * Apply color correction based on reference image
     */
    static calculateColorCorrection(sourceAvg: ColorSpace, targetAvg: ColorSpace): {
        gain: ColorSpace;
        offset: ColorSpace;
    };
    /**
     * Calculate color temperature from RGB values
     */
    static calculateColorTemperature(rgb: ColorSpace): number;
    /**
     * Analyze color balance and suggest corrections
     */
    static analyzeColorBalance(dominantColors: Array<{
        color: ColorSpace;
        percentage: number;
    }>): {
        temperature: number;
        tint: number;
        colorCast: string;
    };
}
