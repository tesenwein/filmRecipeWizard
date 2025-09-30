import type { AIColorAdjustments } from '../services/types';
import { convertRecipeToMasks } from '../shared/mask-converter';
import { normalizeMaskType } from '../shared/mask-types';

/**
 * Generates Capture One style (.costyle) content based on AI adjustments
 * Capture One styles are XML-based files that contain adjustment parameters
 */
export function generateCaptureOneStyle(aiAdjustments: AIColorAdjustments, include: any): string {
  const isBW =
    !!aiAdjustments.monochrome ||
    aiAdjustments.treatment === 'black_and_white' ||
    (typeof aiAdjustments.camera_profile === 'string' && /monochrome/i.test(aiAdjustments.camera_profile || '')) ||
    (typeof aiAdjustments.saturation === 'number' && aiAdjustments.saturation <= -100);

  const presetName = aiAdjustments.preset_name || (include?.recipeName as string) || 'Custom Recipe';
  
  // Helper functions for value formatting
  const clamp = (v: any, min: number, max: number): number | undefined => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
    return Math.max(min, Math.min(max, v));
  };

  const round = (v: number | undefined) => (typeof v === 'number' ? Math.round(v) : undefined);
  const fixed2 = (v: number | undefined) => (typeof v === 'number' ? v.toFixed(2) : undefined);

  // Convert AI adjustments to Capture One parameters
  const exposure = clamp(aiAdjustments.exposure, -5, 5);
  const contrast = clamp(aiAdjustments.contrast, -100, 100);
  const brightness = clamp(aiAdjustments.brightness, -100, 100);
  const saturation = isBW ? 0 : clamp(aiAdjustments.saturation, -100, 100);
  const vibrance = clamp(aiAdjustments.vibrance, -100, 100);
  const clarity = clamp(aiAdjustments.clarity, -100, 100);
  const highlights = clamp(aiAdjustments.highlights, -100, 100);
  const shadows = clamp(aiAdjustments.shadows, -100, 100);
  const whites = clamp(aiAdjustments.whites, -100, 100);
  const blacks = clamp(aiAdjustments.blacks, -100, 100);

  // HSL adjustments
  const hueRed = clamp(aiAdjustments.hue_red, -180, 180);
  const hueOrange = clamp(aiAdjustments.hue_orange, -180, 180);
  const hueYellow = clamp(aiAdjustments.hue_yellow, -180, 180);
  const hueGreen = clamp(aiAdjustments.hue_green, -180, 180);
  const hueAqua = clamp(aiAdjustments.hue_aqua, -180, 180);
  const hueBlue = clamp(aiAdjustments.hue_blue, -180, 180);
  const huePurple = clamp(aiAdjustments.hue_purple, -180, 180);
  const hueMagenta = clamp(aiAdjustments.hue_magenta, -180, 180);

  const satRed = clamp(aiAdjustments.sat_red, -100, 100);
  const satOrange = clamp(aiAdjustments.sat_orange, -100, 100);
  const satYellow = clamp(aiAdjustments.sat_yellow, -100, 100);
  const satGreen = clamp(aiAdjustments.sat_green, -100, 100);
  const satAqua = clamp(aiAdjustments.sat_aqua, -100, 100);
  const satBlue = clamp(aiAdjustments.sat_blue, -100, 100);
  const satPurple = clamp(aiAdjustments.sat_purple, -100, 100);
  const satMagenta = clamp(aiAdjustments.sat_magenta, -100, 100);

  const lumRed = clamp(aiAdjustments.lum_red, -100, 100);
  const lumOrange = clamp(aiAdjustments.lum_orange, -100, 100);
  const lumYellow = clamp(aiAdjustments.lum_yellow, -100, 100);
  const lumGreen = clamp(aiAdjustments.lum_green, -100, 100);
  const lumAqua = clamp(aiAdjustments.lum_aqua, -100, 100);
  const lumBlue = clamp(aiAdjustments.lum_blue, -100, 100);
  const lumPurple = clamp(aiAdjustments.lum_purple, -100, 100);
  const lumMagenta = clamp(aiAdjustments.lum_magenta, -100, 100);

  // Color grading
  const shadowHue = clamp(aiAdjustments.color_grade_shadow_hue, -180, 180);
  const shadowSat = clamp(aiAdjustments.color_grade_shadow_sat, -100, 100);
  const shadowLum = clamp(aiAdjustments.color_grade_shadow_lum, -100, 100);
  const midtoneHue = clamp(aiAdjustments.color_grade_midtone_hue, -180, 180);
  const midtoneSat = clamp(aiAdjustments.color_grade_midtone_sat, -100, 100);
  const midtoneLum = clamp(aiAdjustments.color_grade_midtone_lum, -100, 100);
  const highlightHue = clamp(aiAdjustments.color_grade_highlight_hue, -180, 180);
  const highlightSat = clamp(aiAdjustments.color_grade_highlight_sat, -100, 100);
  const highlightLum = clamp(aiAdjustments.color_grade_highlight_lum, -100, 100);

  // Grain
  const grainAmount = clamp((aiAdjustments as any).grain_amount, 0, 100);
  const grainSize = clamp((aiAdjustments as any).grain_size, 0, 100);
  const grainFrequency = clamp((aiAdjustments as any).grain_frequency, 0, 100);

  // Vignette
  const vignetteAmount = clamp((aiAdjustments as any).vignette_amount, -100, 100);
  const vignetteMidpoint = clamp((aiAdjustments as any).vignette_midpoint, 0, 100);
  const vignetteFeather = clamp((aiAdjustments as any).vignette_feather, 0, 100);
  const vignetteRoundness = clamp((aiAdjustments as any).vignette_roundness, -100, 100);

  // Process masks for Capture One
  const masks = include?.masks !== false ? convertRecipeToMasks(aiAdjustments) : [];

  // Generate UUID for the style
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16).toUpperCase();
    });
  };

  const styleId = generateUUID();
  const timestamp = new Date().toISOString();

  // Build the Capture One style XML
  const costyle = `<?xml version="1.0" encoding="UTF-8"?>
<CaptureOneStyle version="1.0">
  <Style>
    <ID>${styleId}</ID>
    <Name>${presetName}</Name>
    <Description>Generated by Film Recipe Wizard</Description>
    <Created>${timestamp}</Created>
    <Modified>${timestamp}</Modified>
    <Category>Film Recipe Wizard</Category>
    <Version>1.0</Version>
    
    <!-- Basic Adjustments -->
    <Adjustments>
      ${typeof exposure === 'number' ? `<Exposure>${fixed2(exposure)}</Exposure>` : ''}
      ${typeof contrast === 'number' ? `<Contrast>${round(contrast)}</Contrast>` : ''}
      ${typeof brightness === 'number' ? `<Brightness>${round(brightness)}</Brightness>` : ''}
      ${typeof saturation === 'number' ? `<Saturation>${round(saturation)}</Saturation>` : ''}
      ${typeof vibrance === 'number' ? `<Vibrance>${round(vibrance)}</Vibrance>` : ''}
      ${typeof clarity === 'number' ? `<Clarity>${round(clarity)}</Clarity>` : ''}
      ${typeof highlights === 'number' ? `<Highlights>${round(highlights)}</Highlights>` : ''}
      ${typeof shadows === 'number' ? `<Shadows>${round(shadows)}</Shadows>` : ''}
      ${typeof whites === 'number' ? `<Whites>${round(whites)}</Whites>` : ''}
      ${typeof blacks === 'number' ? `<Blacks>${round(blacks)}</Blacks>` : ''}
    </Adjustments>

    <!-- HSL Adjustments -->
    ${include?.hsl !== false ? `<HSL>
      <Hue>
        ${typeof hueRed === 'number' ? `<Red>${round(hueRed)}</Red>` : ''}
        ${typeof hueOrange === 'number' ? `<Orange>${round(hueOrange)}</Orange>` : ''}
        ${typeof hueYellow === 'number' ? `<Yellow>${round(hueYellow)}</Yellow>` : ''}
        ${typeof hueGreen === 'number' ? `<Green>${round(hueGreen)}</Green>` : ''}
        ${typeof hueAqua === 'number' ? `<Aqua>${round(hueAqua)}</Aqua>` : ''}
        ${typeof hueBlue === 'number' ? `<Blue>${round(hueBlue)}</Blue>` : ''}
        ${typeof huePurple === 'number' ? `<Purple>${round(huePurple)}</Purple>` : ''}
        ${typeof hueMagenta === 'number' ? `<Magenta>${round(hueMagenta)}</Magenta>` : ''}
      </Hue>
      <Saturation>
        ${typeof satRed === 'number' ? `<Red>${round(satRed)}</Red>` : ''}
        ${typeof satOrange === 'number' ? `<Orange>${round(satOrange)}</Orange>` : ''}
        ${typeof satYellow === 'number' ? `<Yellow>${round(satYellow)}</Yellow>` : ''}
        ${typeof satGreen === 'number' ? `<Green>${round(satGreen)}</Green>` : ''}
        ${typeof satAqua === 'number' ? `<Aqua>${round(satAqua)}</Aqua>` : ''}
        ${typeof satBlue === 'number' ? `<Blue>${round(satBlue)}</Blue>` : ''}
        ${typeof satPurple === 'number' ? `<Purple>${round(satPurple)}</Purple>` : ''}
        ${typeof satMagenta === 'number' ? `<Magenta>${round(satMagenta)}</Magenta>` : ''}
      </Saturation>
      <Luminance>
        ${typeof lumRed === 'number' ? `<Red>${round(lumRed)}</Red>` : ''}
        ${typeof lumOrange === 'number' ? `<Orange>${round(lumOrange)}</Orange>` : ''}
        ${typeof lumYellow === 'number' ? `<Yellow>${round(lumYellow)}</Yellow>` : ''}
        ${typeof lumGreen === 'number' ? `<Green>${round(lumGreen)}</Green>` : ''}
        ${typeof lumAqua === 'number' ? `<Aqua>${round(lumAqua)}</Aqua>` : ''}
        ${typeof lumBlue === 'number' ? `<Blue>${round(lumBlue)}</Blue>` : ''}
        ${typeof lumPurple === 'number' ? `<Purple>${round(lumPurple)}</Purple>` : ''}
        ${typeof lumMagenta === 'number' ? `<Magenta>${round(lumMagenta)}</Magenta>` : ''}
      </Luminance>
    </HSL>` : ''}

    <!-- Color Grading -->
    ${include?.colorGrading !== false ? `<ColorGrading>
      <Shadows>
        ${typeof shadowHue === 'number' ? `<Hue>${round(shadowHue)}</Hue>` : ''}
        ${typeof shadowSat === 'number' ? `<Saturation>${round(shadowSat)}</Saturation>` : ''}
        ${typeof shadowLum === 'number' ? `<Luminance>${round(shadowLum)}</Luminance>` : ''}
      </Shadows>
      <Midtones>
        ${typeof midtoneHue === 'number' ? `<Hue>${round(midtoneHue)}</Hue>` : ''}
        ${typeof midtoneSat === 'number' ? `<Saturation>${round(midtoneSat)}</Saturation>` : ''}
        ${typeof midtoneLum === 'number' ? `<Luminance>${round(midtoneLum)}</Luminance>` : ''}
      </Midtones>
      <Highlights>
        ${typeof highlightHue === 'number' ? `<Hue>${round(highlightHue)}</Hue>` : ''}
        ${typeof highlightSat === 'number' ? `<Saturation>${round(highlightSat)}</Saturation>` : ''}
        ${typeof highlightLum === 'number' ? `<Luminance>${round(highlightLum)}</Luminance>` : ''}
      </Highlights>
    </ColorGrading>` : ''}

    <!-- Grain -->
    ${include?.grain !== false && (typeof grainAmount === 'number' || typeof grainSize === 'number' || typeof grainFrequency === 'number') ? `<Grain>
      ${typeof grainAmount === 'number' ? `<Amount>${round(grainAmount)}</Amount>` : ''}
      ${typeof grainSize === 'number' ? `<Size>${round(grainSize)}</Size>` : ''}
      ${typeof grainFrequency === 'number' ? `<Frequency>${round(grainFrequency)}</Frequency>` : ''}
    </Grain>` : ''}

    <!-- Vignette -->
    ${include?.vignette !== false && (typeof vignetteAmount === 'number' || typeof vignetteMidpoint === 'number' || typeof vignetteFeather === 'number' || typeof vignetteRoundness === 'number') ? `<Vignette>
      ${typeof vignetteAmount === 'number' ? `<Amount>${round(vignetteAmount)}</Amount>` : ''}
      ${typeof vignetteMidpoint === 'number' ? `<Midpoint>${round(vignetteMidpoint)}</Midpoint>` : ''}
      ${typeof vignetteFeather === 'number' ? `<Feather>${round(vignetteFeather)}</Feather>` : ''}
      ${typeof vignetteRoundness === 'number' ? `<Roundness>${round(vignetteRoundness)}</Roundness>` : ''}
    </Vignette>` : ''}

    <!-- Treatment -->
    <Treatment>
      <Type>${isBW ? 'BlackAndWhite' : 'Color'}</Type>
    </Treatment>

    <!-- Masks -->
    ${masks.length > 0 ? generateMasksXML(masks) : ''}
  </Style>
</CaptureOneStyle>`;

  return costyle;
}

/**
 * Generates XML for masks in Capture One format
 */
function generateMasksXML(masks: any[]): string {
  if (!masks.length) return '';

  // Helper functions
  const clamp = (v: any, min: number, max: number): number | undefined => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
    return Math.max(min, Math.min(max, v));
  };
  
  const round = (v: number | undefined) => (typeof v === 'number' ? Math.round(v) : undefined);
  const fixed2 = (v: number | undefined) => (typeof v === 'number' ? v.toFixed(2) : undefined);

  const maskElements = masks.map((mask, index) => {
    const maskType = normalizeMaskType(mask.type || 'subject');
    const adjustments = mask.adjustments || {};
    
    // Generate unique ID for the mask
    const maskId = `mask_${index + 1}_${Date.now()}`;
    
    // Convert adjustments to Capture One format
    const localExposure = clamp(adjustments.local_exposure, -4, 4);
    const localContrast = clamp(adjustments.local_contrast, -100, 100);
    const localHighlights = clamp(adjustments.local_highlights, -100, 100);
    const localShadows = clamp(adjustments.local_shadows, -100, 100);
    const localWhites = clamp(adjustments.local_whites, -100, 100);
    const localBlacks = clamp(adjustments.local_blacks, -100, 100);
    const localClarity = clamp(adjustments.local_clarity, -100, 100);
    const localSaturation = clamp(adjustments.local_saturation, -100, 100);
    const localDehaze = clamp(adjustments.local_dehaze, -100, 100);
    const localTexture = clamp(adjustments.local_texture, -100, 100);
    
    // Determine mask geometry type and parameters
    let geometryXML = '';
    
    if (maskType === 'radial') {
      // Radial mask
      const top = clamp(mask.top, 0, 1);
      const left = clamp(mask.left, 0, 1);
      const bottom = clamp(mask.bottom, 0, 1);
      const right = clamp(mask.right, 0, 1);
      const angle = clamp(mask.angle, 0, 360);
      const midpoint = clamp(mask.midpoint, 0, 100);
      const roundness = clamp(mask.roundness, -100, 100);
      const feather = clamp(mask.feather, 0, 100);
      
      geometryXML = `<RadialMask>
        <Top>${fixed2(top)}</Top>
        <Left>${fixed2(left)}</Left>
        <Bottom>${fixed2(bottom)}</Bottom>
        <Right>${fixed2(right)}</Right>
        <Angle>${round(angle)}</Angle>
        <Midpoint>${round(midpoint)}</Midpoint>
        <Roundness>${round(roundness)}</Roundness>
        <Feather>${round(feather)}</Feather>
        <Inverted>${mask.inverted ? 'true' : 'false'}</Inverted>
      </RadialMask>`;
    } else if (maskType === 'linear') {
      // Linear mask
      const zeroX = clamp(mask.zeroX, 0, 1);
      const zeroY = clamp(mask.zeroY, 0, 1);
      const fullX = clamp(mask.fullX, 0, 1);
      const fullY = clamp(mask.fullY, 0, 1);
      
      geometryXML = `<LinearMask>
        <ZeroX>${fixed2(zeroX)}</ZeroX>
        <ZeroY>${fixed2(zeroY)}</ZeroY>
        <FullX>${fixed2(fullX)}</FullX>
        <FullY>${fixed2(fullY)}</FullY>
        <Inverted>${mask.inverted ? 'true' : 'false'}</Inverted>
      </LinearMask>`;
    } else if (maskType === 'brush') {
      // Brush mask - Capture One doesn't have direct brush support, use radial as approximation
      const centerX = clamp(mask.referenceX || 0.5, 0, 1);
      const centerY = clamp(mask.referenceY || 0.5, 0, 1);
      const size = clamp(mask.size || 0.1, 0.01, 0.5);
      
      geometryXML = `<RadialMask>
        <Top>${fixed2(centerY! - size!)}</Top>
        <Left>${fixed2(centerX! - size!)}</Left>
        <Bottom>${fixed2(centerY! + size!)}</Bottom>
        <Right>${fixed2(centerX! + size!)}</Right>
        <Feather>75</Feather>
        <Inverted>${mask.inverted ? 'true' : 'false'}</Inverted>
      </RadialMask>`;
    } else {
      // AI-detected masks (face, sky, etc.) - use reference point
      const centerX = clamp(mask.referenceX || 0.5, 0, 1);
      const centerY = clamp(mask.referenceY || 0.5, 0, 1);
      const size = 0.3; // Default size for AI masks
      
      geometryXML = `<RadialMask>
        <Top>${fixed2(centerY! - size)}</Top>
        <Left>${fixed2(centerX! - size)}</Left>
        <Bottom>${fixed2(centerY! + size)}</Bottom>
        <Right>${fixed2(centerX! + size)}</Right>
        <Feather>50</Feather>
        <Inverted>${mask.inverted ? 'true' : 'false'}</Inverted>
      </RadialMask>`;
    }
    
    return `<Mask>
      <ID>${maskId}</ID>
      <Name>${mask.name || `Mask ${index + 1}`}</Name>
      <Type>${maskType}</Type>
      <Active>true</Active>
      <Geometry>
        ${geometryXML}
      </Geometry>
      <Adjustments>
        ${typeof localExposure === 'number' ? `<Exposure>${fixed2(localExposure)}</Exposure>` : ''}
        ${typeof localContrast === 'number' ? `<Contrast>${round(localContrast)}</Contrast>` : ''}
        ${typeof localHighlights === 'number' ? `<Highlights>${round(localHighlights)}</Highlights>` : ''}
        ${typeof localShadows === 'number' ? `<Shadows>${round(localShadows)}</Shadows>` : ''}
        ${typeof localWhites === 'number' ? `<Whites>${round(localWhites)}</Whites>` : ''}
        ${typeof localBlacks === 'number' ? `<Blacks>${round(localBlacks)}</Blacks>` : ''}
        ${typeof localClarity === 'number' ? `<Clarity>${round(localClarity)}</Clarity>` : ''}
        ${typeof localSaturation === 'number' ? `<Saturation>${round(localSaturation)}</Saturation>` : ''}
        ${typeof localDehaze === 'number' ? `<Dehaze>${round(localDehaze)}</Dehaze>` : ''}
        ${typeof localTexture === 'number' ? `<Texture>${round(localTexture)}</Texture>` : ''}
      </Adjustments>
    </Mask>`;
  }).join('\n    ');

  return `<Masks>
    ${maskElements}
  </Masks>`;
}

/**
 * Generates a Capture One style file with basic adjustments only
 */
export function generateCaptureOneBasicStyle(aiAdjustments: AIColorAdjustments, include: any): string {
  const basicInclude = {
    ...include,
    hsl: false,
    colorGrading: false,
    grain: false,
    vignette: false,
    masks: false,
  };
  
  return generateCaptureOneStyle(aiAdjustments, basicInclude);
}
