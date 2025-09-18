"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseXMPContent = parseXMPContent;
/**
 * Parses XMP files to extract Lightroom preset data and convert it to AIColorAdjustments format
 */
function parseXMPContent(xmpContent) {
    try {
        // Basic validation - check if it's a valid XMP file
        if (!xmpContent.includes('x:xmpmeta') || !xmpContent.includes('crs:')) {
            return { success: false, error: 'Invalid XMP file format' };
        }
        // Extract preset name
        const nameMatch = xmpContent.match(/<crs:Name>\s*<rdf:Alt>\s*<rdf:li[^>]*>([^<]*)<\/rdf:li>/);
        const presetName = nameMatch?.[1]?.trim() || 'Imported Preset';
        // Extract description
        const descMatch = xmpContent.match(/<crs:Description>\s*<rdf:Alt>\s*<rdf:li[^>]*>([^<]*)<\/rdf:li>/);
        const description = descMatch?.[1]?.trim() || '';
        // Helper function to extract numeric values from XMP attributes
        const extractNumber = (pattern, defaultValue) => {
            const match = xmpContent.match(pattern);
            if (match && match[1]) {
                const value = parseFloat(match[1].replace(/[+\s]/g, ''));
                return isNaN(value) ? defaultValue : value;
            }
            return defaultValue;
        };
        // Helper function to extract boolean values
        const extractBoolean = (pattern, defaultValue) => {
            const match = xmpContent.match(pattern);
            if (match && match[1]) {
                return match[1].toLowerCase() === 'true';
            }
            return defaultValue;
        };
        // Helper function to extract string values
        const extractString = (pattern, defaultValue) => {
            const match = xmpContent.match(pattern);
            return match?.[1]?.trim() || defaultValue;
        };
        // Extract tone curve points
        const extractToneCurve = (curveName) => {
            const curvePattern = new RegExp(`<crs:${curveName}>\\s*<rdf:Seq>([\\s\\S]*?)</rdf:Seq>\\s*</crs:${curveName}>`);
            const match = xmpContent.match(curvePattern);
            if (!match)
                return undefined;
            const points = [];
            const pointMatches = match[1].match(/<rdf:li>([^<]+)<\/rdf:li>/g);
            if (pointMatches) {
                for (const pointMatch of pointMatches) {
                    const coords = pointMatch.match(/<rdf:li>([^<]+)<\/rdf:li>/)?.[1];
                    if (coords) {
                        const [input, output] = coords.split(',').map(s => parseFloat(s.trim()));
                        if (!isNaN(input) && !isNaN(output)) {
                            points.push({ input, output });
                        }
                    }
                }
            }
            return points.length > 0 ? points : undefined;
        };
        // Extract masks
        const extractMasks = () => {
            const maskPattern = /<crs:MaskGroupBasedCorrections>\s*<rdf:Seq>([\s\S]*?)<\/rdf:Seq>\s*<\/crs:MaskGroupBasedCorrections>/;
            const match = xmpContent.match(maskPattern);
            if (!match)
                return undefined;
            const masks = [];
            const correctionMatches = match[1].match(/<rdf:li>[\s\S]*?<\/rdf:li>/g);
            if (correctionMatches) {
                for (const correctionMatch of correctionMatches) {
                    const mask = {};
                    // Extract correction name
                    const nameMatch = correctionMatch.match(/crs:CorrectionName="([^"]*)"/);
                    if (nameMatch)
                        mask.name = nameMatch[1];
                    // Extract mask type and properties
                    const maskTypeMatch = correctionMatch.match(/crs:What="Mask\/([^"]*)"/);
                    if (maskTypeMatch)
                        mask.type = maskTypeMatch[1].toLowerCase().replace('circulargradient', 'radial');
                    // Extract reference point for AI masks
                    const refPointMatch = correctionMatch.match(/crs:ReferencePoint="([^"]*)"/);
                    if (refPointMatch) {
                        const [x, y] = refPointMatch[1].split(' ').map(s => parseFloat(s));
                        if (!isNaN(x) && !isNaN(y)) {
                            mask.referenceX = x;
                            mask.referenceY = y;
                        }
                    }
                    // Extract mask subtype for AI masks
                    const subTypeMatch = correctionMatch.match(/crs:MaskSubType="([^"]*)"/);
                    if (subTypeMatch) {
                        const subType = subTypeMatch[1];
                        // Map Lightroom mask subtypes to our types
                        switch (subType) {
                            case '0':
                                mask.type = 'background';
                                break;
                            case '1':
                                mask.type = 'subject';
                                break;
                            case '2':
                                mask.type = 'sky';
                                break;
                            case '3':
                                mask.type = 'face_skin';
                                break;
                            case '4':
                                mask.type = 'mountains';
                                break;
                        }
                    }
                    // Extract adjustments
                    const adjustments = {};
                    const adjPatterns = [
                        { key: 'local_exposure', pattern: /crs:LocalExposure2012="([^"]*)"/ },
                        { key: 'local_contrast', pattern: /crs:LocalContrast2012="([^"]*)"/ },
                        { key: 'local_highlights', pattern: /crs:LocalHighlights2012="([^"]*)"/ },
                        { key: 'local_shadows', pattern: /crs:LocalShadows2012="([^"]*)"/ },
                        { key: 'local_whites', pattern: /crs:LocalWhites2012="([^"]*)"/ },
                        { key: 'local_blacks', pattern: /crs:LocalBlacks2012="([^"]*)"/ },
                        { key: 'local_clarity', pattern: /crs:LocalClarity2012="([^"]*)"/ },
                        { key: 'local_dehaze', pattern: /crs:LocalDehaze="([^"]*)"/ },
                        { key: 'local_texture', pattern: /crs:LocalTexture="([^"]*)"/ },
                        { key: 'local_temperature', pattern: /crs:LocalTemperature="([^"]*)"/ },
                        { key: 'local_tint', pattern: /crs:LocalTint="([^"]*)"/ },
                    ];
                    for (const { key, pattern } of adjPatterns) {
                        const adjMatch = correctionMatch.match(pattern);
                        if (adjMatch) {
                            const value = parseFloat(adjMatch[1]);
                            if (!isNaN(value)) {
                                adjustments[key] = value;
                            }
                        }
                    }
                    if (Object.keys(adjustments).length > 0) {
                        mask.adjustments = adjustments;
                    }
                    if (Object.keys(mask).length > 0) {
                        masks.push(mask);
                    }
                }
            }
            return masks.length > 0 ? masks : undefined;
        };
        // Build the adjustments object
        const adjustments = {
            // Basic exposure and tone adjustments
            exposure: extractNumber(/crs:Exposure2012="([^"]*)"/, 0),
            contrast: extractNumber(/crs:Contrast2012="([^"]*)"/, 0),
            highlights: extractNumber(/crs:Highlights2012="([^"]*)"/, 0),
            shadows: extractNumber(/crs:Shadows2012="([^"]*)"/, 0),
            whites: extractNumber(/crs:Whites2012="([^"]*)"/, 0),
            blacks: extractNumber(/crs:Blacks2012="([^"]*)"/, 0),
            clarity: extractNumber(/crs:Clarity2012="([^"]*)"/, 0),
            vibrance: extractNumber(/crs:Vibrance="([^"]*)"/, 0),
            saturation: extractNumber(/crs:Saturation="([^"]*)"/, 0),
            // White balance
            temperature: extractNumber(/crs:Temperature="([^"]*)"/, 6500),
            tint: extractNumber(/crs:Tint="([^"]*)"/, 0),
            // Camera profile
            camera_profile: extractString(/crs:CameraProfile="([^"]*)"/, 'Adobe Color'),
            // Treatment (Color vs B&W)
            treatment: extractBoolean(/crs:ConvertToGrayscale="([^"]*)"/) ? 'black_and_white' : 'color',
            monochrome: extractBoolean(/crs:ConvertToGrayscale="([^"]*)"/),
            // Parametric curves
            parametric_shadows: extractNumber(/crs:ParametricShadows="([^"]*)"/, 0),
            parametric_darks: extractNumber(/crs:ParametricDarks="([^"]*)"/, 0),
            parametric_lights: extractNumber(/crs:ParametricLights="([^"]*)"/, 0),
            parametric_highlights: extractNumber(/crs:ParametricHighlights="([^"]*)"/, 0),
            parametric_shadow_split: extractNumber(/crs:ParametricShadowSplit="([^"]*)"/, 25),
            parametric_midtone_split: extractNumber(/crs:ParametricMidtoneSplit="([^"]*)"/, 50),
            parametric_highlight_split: extractNumber(/crs:ParametricHighlightSplit="([^"]*)"/, 75),
            // HSL adjustments
            hue_red: extractNumber(/crs:HueAdjustmentRed="([^"]*)"/, 0),
            hue_orange: extractNumber(/crs:HueAdjustmentOrange="([^"]*)"/, 0),
            hue_yellow: extractNumber(/crs:HueAdjustmentYellow="([^"]*)"/, 0),
            hue_green: extractNumber(/crs:HueAdjustmentGreen="([^"]*)"/, 0),
            hue_aqua: extractNumber(/crs:HueAdjustmentAqua="([^"]*)"/, 0),
            hue_blue: extractNumber(/crs:HueAdjustmentBlue="([^"]*)"/, 0),
            hue_purple: extractNumber(/crs:HueAdjustmentPurple="([^"]*)"/, 0),
            hue_magenta: extractNumber(/crs:HueAdjustmentMagenta="([^"]*)"/, 0),
            sat_red: extractNumber(/crs:SaturationAdjustmentRed="([^"]*)"/, 0),
            sat_orange: extractNumber(/crs:SaturationAdjustmentOrange="([^"]*)"/, 0),
            sat_yellow: extractNumber(/crs:SaturationAdjustmentYellow="([^"]*)"/, 0),
            sat_green: extractNumber(/crs:SaturationAdjustmentGreen="([^"]*)"/, 0),
            sat_aqua: extractNumber(/crs:SaturationAdjustmentAqua="([^"]*)"/, 0),
            sat_blue: extractNumber(/crs:SaturationAdjustmentBlue="([^"]*)"/, 0),
            sat_purple: extractNumber(/crs:SaturationAdjustmentPurple="([^"]*)"/, 0),
            sat_magenta: extractNumber(/crs:SaturationAdjustmentMagenta="([^"]*)"/, 0),
            lum_red: extractNumber(/crs:LuminanceAdjustmentRed="([^"]*)"/, 0),
            lum_orange: extractNumber(/crs:LuminanceAdjustmentOrange="([^"]*)"/, 0),
            lum_yellow: extractNumber(/crs:LuminanceAdjustmentYellow="([^"]*)"/, 0),
            lum_green: extractNumber(/crs:LuminanceAdjustmentGreen="([^"]*)"/, 0),
            lum_aqua: extractNumber(/crs:LuminanceAdjustmentAqua="([^"]*)"/, 0),
            lum_blue: extractNumber(/crs:LuminanceAdjustmentBlue="([^"]*)"/, 0),
            lum_purple: extractNumber(/crs:LuminanceAdjustmentPurple="([^"]*)"/, 0),
            lum_magenta: extractNumber(/crs:LuminanceAdjustmentMagenta="([^"]*)"/, 0),
            // Black & White mixer
            gray_red: extractNumber(/crs:GrayMixerRed="([^"]*)"/, 0),
            gray_orange: extractNumber(/crs:GrayMixerOrange="([^"]*)"/, 0),
            gray_yellow: extractNumber(/crs:GrayMixerYellow="([^"]*)"/, 0),
            gray_green: extractNumber(/crs:GrayMixerGreen="([^"]*)"/, 0),
            gray_aqua: extractNumber(/crs:GrayMixerAqua="([^"]*)"/, 0),
            gray_blue: extractNumber(/crs:GrayMixerBlue="([^"]*)"/, 0),
            gray_purple: extractNumber(/crs:GrayMixerPurple="([^"]*)"/, 0),
            gray_magenta: extractNumber(/crs:GrayMixerMagenta="([^"]*)"/, 0),
            // Color grading
            color_grade_midtone_hue: extractNumber(/crs:ColorGradeMidtoneHue="([^"]*)"/, 0),
            color_grade_midtone_sat: extractNumber(/crs:ColorGradeMidtoneSat="([^"]*)"/, 0),
            color_grade_midtone_lum: extractNumber(/crs:ColorGradeMidtoneLum="([^"]*)"/, 0),
            color_grade_shadow_hue: extractNumber(/crs:ColorGradeShadowHue="([^"]*)"/, 0),
            color_grade_shadow_sat: extractNumber(/crs:ColorGradeShadowSat="([^"]*)"/, 0),
            color_grade_shadow_lum: extractNumber(/crs:ColorGradeShadowLum="([^"]*)"/, 0),
            color_grade_highlight_hue: extractNumber(/crs:ColorGradeHighlightHue="([^"]*)"/, 0),
            color_grade_highlight_sat: extractNumber(/crs:ColorGradeHighlightSat="([^"]*)"/, 0),
            color_grade_highlight_lum: extractNumber(/crs:ColorGradeHighlightLum="([^"]*)"/, 0),
            color_grade_global_hue: extractNumber(/crs:ColorGradeGlobalHue="([^"]*)"/, 0),
            color_grade_global_sat: extractNumber(/crs:ColorGradeGlobalSat="([^"]*)"/, 0),
            color_grade_global_lum: extractNumber(/crs:ColorGradeGlobalLum="([^"]*)"/, 0),
            color_grade_blending: extractNumber(/crs:ColorGradeBlending="([^"]*)"/, 0),
            color_grade_balance: extractNumber(/crs:ColorGradeBalance="([^"]*)"/, 0),
            // Grain
            grain_amount: extractNumber(/crs:GrainAmount="([^"]*)"/, 0),
            grain_size: extractNumber(/crs:GrainSize="([^"]*)"/, 0),
            grain_frequency: extractNumber(/crs:GrainFrequency="([^"]*)"/, 0),
            // Preset name
            preset_name: presetName,
        };
        // Extract tone curves
        const toneCurve = extractToneCurve('ToneCurvePV2012');
        if (toneCurve) {
            adjustments.tone_curve = toneCurve;
        }
        const toneCurveRed = extractToneCurve('ToneCurvePV2012Red');
        if (toneCurveRed) {
            adjustments.tone_curve_red = toneCurveRed;
        }
        const toneCurveGreen = extractToneCurve('ToneCurvePV2012Green');
        if (toneCurveGreen) {
            adjustments.tone_curve_green = toneCurveGreen;
        }
        const toneCurveBlue = extractToneCurve('ToneCurvePV2012Blue');
        if (toneCurveBlue) {
            adjustments.tone_curve_blue = toneCurveBlue;
        }
        // Extract masks
        const masks = extractMasks();
        if (masks) {
            adjustments.masks = masks;
        }
        return {
            success: true,
            presetName,
            description,
            adjustments,
        };
    }
    catch (error) {
        console.error('[XMP Parser] Error parsing XMP:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown parsing error',
        };
    }
}
