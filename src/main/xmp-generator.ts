import type { AIColorAdjustments } from '../services/types';
import { extractCurveData, generateAllToneCurvesXML } from '../shared/curve-utils';
import { convertRecipeToMasks } from '../shared/mask-converter';
import { getAllMaskTypes, getMaskConfig, normalizeMaskType } from '../shared/mask-types';
// Using raw values directly - no scaling needed


export function generateXMPContent(aiAdjustments: AIColorAdjustments, include: any): string {
  // Generate XMP content for Lightroom based on AI adjustments
  const isBW =
    !!aiAdjustments.monochrome ||
    aiAdjustments.treatment === 'black_and_white' ||
    (typeof aiAdjustments.camera_profile === 'string' && /monochrome/i.test(aiAdjustments.camera_profile || '')) ||
    (typeof aiAdjustments.saturation === 'number' && aiAdjustments.saturation <= -100);
  // Normalize any AI-provided profile name to Adobe's canonical set
  const normalizeCameraProfile = (name?: string): string | undefined => {
    if (!name) return undefined;
    const n = String(name).toLowerCase();
    if (/mono|black\s*&?\s*white|b\s*&\s*w/.test(n)) return 'Adobe Monochrome';
    if (/portrait|people|skin/.test(n)) return 'Adobe Portrait';
    if (/landscape|sky|mountain|nature/.test(n)) return 'Adobe Landscape';
    if (/color|standard|default|auto/.test(n)) return 'Adobe Color';
    // Fallback to Adobe Color for unknown strings
    return 'Adobe Color';
  };

  // Heuristic auto-selection based on masks/scene if AI didn't specify
  const autoSelectCameraProfile = (): string => {
    if (isBW) return 'Adobe Monochrome';
    const masks = (aiAdjustments as any).masks || [];
    let faceCount = 0;
    let landscapeLike = 0;
    let hasSky = false;
    for (const m of masks) {
      let t: any = m?.type;
      if (typeof t === 'string') t = normalizeMaskType(t);
      const cfg = typeof t === 'string' ? getMaskConfig(t) : undefined;
      const cat = cfg?.category;
      if (cat === 'face' || t === 'subject' || t === 'person') faceCount++;
      if (cat === 'landscape' || cat === 'background') landscapeLike++;
      if (t === 'sky') hasSky = true;
    }
    if (faceCount > 0) return 'Adobe Portrait';
    if (hasSky || landscapeLike > 0) return 'Adobe Landscape';
    return 'Adobe Color';
  };

  const cameraProfile = normalizeCameraProfile(aiAdjustments.camera_profile) || autoSelectCameraProfile();
  const profileName = cameraProfile;
  const treatmentTag = isBW
    ? '<crs:Treatment>Black &amp; White</crs:Treatment>\n      <crs:ConvertToGrayscale>True</crs:ConvertToGrayscale>'
    : '<crs:Treatment>Color</crs:Treatment>';
  const tag = (name: string, val?: number | string) =>
    val === 0 || val === '0' || !!val ? `      <crs:${name}>${val}</crs:${name}>\n` : '';
  const attrIf = (k: string, val?: string | number) =>
    val === 0 || val === '0' || (val !== undefined && val !== null) ? ` crs:${k}="${val}"` : '';

  // Clamp helpers to keep values within Lightroom-expected ranges
  const clamp = (v: any, min: number, max: number): number | undefined => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
    return Math.max(min, Math.min(max, v));
  };
  const round = (v: number | undefined) => (typeof v === 'number' ? Math.round(v) : undefined);

  // Helper function to provide default values when adjustments are undefined
  const withDefault = (v: any, def: number): number => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    return def;
  };

  // Use raw values with meaningful defaults that create subtle visible effects
  const basicToneValues = {
    contrast: withDefault(aiAdjustments.contrast, 5), // Subtle contrast increase
    highlights: withDefault(aiAdjustments.highlights, -10), // Slight highlight reduction
    shadows: withDefault(aiAdjustments.shadows, 10), // Slight shadow lift
    whites: withDefault(aiAdjustments.whites, -5), // Slight white point reduction
    blacks: withDefault(aiAdjustments.blacks, 5), // Slight black point lift
    clarity: withDefault(aiAdjustments.clarity, 10), // Subtle clarity boost
    vibrance: withDefault(aiAdjustments.vibrance, 5), // Slight vibrance increase
    saturation: withDefault(aiAdjustments.saturation, 0), // Keep saturation neutral
  };

  const presetName = aiAdjustments.preset_name || (include?.recipeName as string) || 'Custom Recipe';
  const groupName = 'film-recipe-wizard';
  // Inclusion flags: only include sections when explicitly enabled.
  const inc = {
    wbBasic: include?.basic === true,
    hsl: include?.hsl === true,
    colorGrading: include?.colorGrading === true,
    curves: include?.curves === true,
    pointColor: include?.pointColor === true,
    grain: include?.grain === true,
    vignette: include?.vignette === true,
    masks: include?.masks === true,
  } as const;

  // Build conditional blocks - always include what's available
  const wbBasicBlock = inc.wbBasic
    ? [
        tag('Contrast2012', basicToneValues.contrast),
        tag('Highlights2012', basicToneValues.highlights),
        tag('Shadows2012', basicToneValues.shadows),
        tag('Whites2012', basicToneValues.whites),
        tag('Blacks2012', basicToneValues.blacks),
        tag('Clarity2012', basicToneValues.clarity),
        tag('Vibrance', basicToneValues.vibrance),
        tag('Saturation', isBW ? 0 : basicToneValues.saturation),
      ].join('')
    : '';


  const parametricCurvesBlock = inc.curves
    ? [
        tag('ParametricShadows', round(clamp(withDefault((aiAdjustments as any).parametric_shadows, 0), -100, 100))),
        tag('ParametricDarks', round(clamp(withDefault((aiAdjustments as any).parametric_darks, 0), -100, 100))),
        tag('ParametricLights', round(clamp(withDefault((aiAdjustments as any).parametric_lights, 0), -100, 100))),
        tag('ParametricHighlights', round(clamp(withDefault((aiAdjustments as any).parametric_highlights, 0), -100, 100))),
        tag('ParametricShadowSplit', round(clamp(withDefault((aiAdjustments as any).parametric_shadow_split, 25), 0, 100))),
        tag('ParametricMidtoneSplit', round(clamp(withDefault((aiAdjustments as any).parametric_midtone_split, 50), 0, 100))),
        tag('ParametricHighlightSplit', round(clamp(withDefault((aiAdjustments as any).parametric_highlight_split, 75), 0, 100))),
      ].join('')
    : '';

  const toneCurvesBlock = inc.curves
    ? generateAllToneCurvesXML(extractCurveData(aiAdjustments))
    : '';

  // HSL only applies to color treatment; B&W uses GrayMixer tags
  // HSL values should be attributes on the rdf:Description element, not separate elements
  const hslValues = inc.hsl && !isBW ? {
    hue_red: withDefault(aiAdjustments.hue_red, 0),
    hue_orange: withDefault(aiAdjustments.hue_orange, 0),
    hue_yellow: withDefault(aiAdjustments.hue_yellow, 0),
    hue_green: withDefault(aiAdjustments.hue_green, 0),
    hue_aqua: withDefault(aiAdjustments.hue_aqua, 0),
    hue_blue: withDefault(aiAdjustments.hue_blue, 0),
    hue_purple: withDefault(aiAdjustments.hue_purple, 0),
    hue_magenta: withDefault(aiAdjustments.hue_magenta, 0),
    sat_red: withDefault(aiAdjustments.sat_red, 0),
    sat_orange: withDefault(aiAdjustments.sat_orange, 0),
    sat_yellow: withDefault(aiAdjustments.sat_yellow, 0),
    sat_green: withDefault(aiAdjustments.sat_green, 0),
    sat_aqua: withDefault(aiAdjustments.sat_aqua, 0),
    sat_blue: withDefault(aiAdjustments.sat_blue, 0),
    sat_purple: withDefault(aiAdjustments.sat_purple, 0),
    sat_magenta: withDefault(aiAdjustments.sat_magenta, 0),
    lum_red: withDefault(aiAdjustments.lum_red, 0),
    lum_orange: withDefault(aiAdjustments.lum_orange, 0),
    lum_yellow: withDefault(aiAdjustments.lum_yellow, 0),
    lum_green: withDefault(aiAdjustments.lum_green, 0),
    lum_aqua: withDefault(aiAdjustments.lum_aqua, 0),
    lum_blue: withDefault(aiAdjustments.lum_blue, 0),
    lum_purple: withDefault(aiAdjustments.lum_purple, 0),
    lum_magenta: withDefault(aiAdjustments.lum_magenta, 0),
  } : {};
  const hslAttrs = inc.hsl && !isBW
    ? [
        attrIf('HueAdjustmentRed', hslValues.hue_red),
        attrIf('HueAdjustmentOrange', hslValues.hue_orange),
        attrIf('HueAdjustmentYellow', hslValues.hue_yellow),
        attrIf('HueAdjustmentGreen', hslValues.hue_green),
        attrIf('HueAdjustmentAqua', hslValues.hue_aqua),
        attrIf('HueAdjustmentBlue', hslValues.hue_blue),
        attrIf('HueAdjustmentPurple', hslValues.hue_purple),
        attrIf('HueAdjustmentMagenta', hslValues.hue_magenta),
        attrIf('SaturationAdjustmentRed', hslValues.sat_red),
        attrIf('SaturationAdjustmentOrange', hslValues.sat_orange),
        attrIf('SaturationAdjustmentYellow', hslValues.sat_yellow),
        attrIf('SaturationAdjustmentGreen', hslValues.sat_green),
        attrIf('SaturationAdjustmentAqua', hslValues.sat_aqua),
        attrIf('SaturationAdjustmentBlue', hslValues.sat_blue),
        attrIf('SaturationAdjustmentPurple', hslValues.sat_purple),
        attrIf('SaturationAdjustmentMagenta', hslValues.sat_magenta),
        attrIf('LuminanceAdjustmentRed', hslValues.lum_red),
        attrIf('LuminanceAdjustmentOrange', hslValues.lum_orange),
        attrIf('LuminanceAdjustmentYellow', hslValues.lum_yellow),
        attrIf('LuminanceAdjustmentGreen', hslValues.lum_green),
        attrIf('LuminanceAdjustmentAqua', hslValues.lum_aqua),
        attrIf('LuminanceAdjustmentBlue', hslValues.lum_blue),
        attrIf('LuminanceAdjustmentPurple', hslValues.lum_purple),
        attrIf('LuminanceAdjustmentMagenta', hslValues.lum_magenta),
      ].join('')
    : '';

  // Color Grading block
  const colorGradingValues = inc.colorGrading ? {
    color_grade_shadow_hue: withDefault(aiAdjustments.color_grade_shadow_hue, 0),
    color_grade_shadow_sat: withDefault(aiAdjustments.color_grade_shadow_sat, 0),
    color_grade_shadow_lum: withDefault(aiAdjustments.color_grade_shadow_lum, 0),
    color_grade_midtone_hue: withDefault(aiAdjustments.color_grade_midtone_hue, 0),
    color_grade_midtone_sat: withDefault(aiAdjustments.color_grade_midtone_sat, 0),
    color_grade_midtone_lum: withDefault(aiAdjustments.color_grade_midtone_lum, 0),
    color_grade_highlight_hue: withDefault(aiAdjustments.color_grade_highlight_hue, 0),
    color_grade_highlight_sat: withDefault(aiAdjustments.color_grade_highlight_sat, 0),
    color_grade_highlight_lum: withDefault(aiAdjustments.color_grade_highlight_lum, 0),
    color_grade_global_hue: withDefault(aiAdjustments.color_grade_global_hue, 0),
    color_grade_global_sat: withDefault(aiAdjustments.color_grade_global_sat, 0),
    color_grade_global_lum: withDefault(aiAdjustments.color_grade_global_lum, 0),
    color_grade_blending: withDefault(aiAdjustments.color_grade_blending, 0),
    color_grade_balance: withDefault(aiAdjustments.color_grade_balance, 0),
  } : {};
  const colorGradingBlock = inc.colorGrading
    ? [
        tag('ColorGradeMidtoneHue', colorGradingValues.color_grade_midtone_hue),
        tag('ColorGradeMidtoneSat', colorGradingValues.color_grade_midtone_sat),
        tag('ColorGradeMidtoneLum', colorGradingValues.color_grade_midtone_lum),
        tag('ColorGradeShadowHue', colorGradingValues.color_grade_shadow_hue),
        tag('ColorGradeShadowSat', colorGradingValues.color_grade_shadow_sat),
        tag('ColorGradeShadowLum', colorGradingValues.color_grade_shadow_lum),
        tag('ColorGradeHighlightHue', colorGradingValues.color_grade_highlight_hue),
        tag('ColorGradeHighlightSat', colorGradingValues.color_grade_highlight_sat),
        tag('ColorGradeHighlightLum', colorGradingValues.color_grade_highlight_lum),
        tag('ColorGradeGlobalHue', colorGradingValues.color_grade_global_hue),
        tag('ColorGradeGlobalSat', colorGradingValues.color_grade_global_sat),
        tag('ColorGradeGlobalLum', colorGradingValues.color_grade_global_lum),
        tag('ColorGradeBlending', colorGradingValues.color_grade_blending),
        tag('ColorGradeBalance', colorGradingValues.color_grade_balance),
      ].join('')
    : '';

  // Black & White Mix block (GrayMixer*) when in monochrome
  const bwMixerValues = isBW ? {
    gray_red: withDefault(aiAdjustments.gray_red, 0),
    gray_orange: withDefault(aiAdjustments.gray_orange, 0),
    gray_yellow: withDefault(aiAdjustments.gray_yellow, 0),
    gray_green: withDefault(aiAdjustments.gray_green, 0),
    gray_aqua: withDefault(aiAdjustments.gray_aqua, 0),
    gray_blue: withDefault(aiAdjustments.gray_blue, 0),
    gray_purple: withDefault(aiAdjustments.gray_purple, 0),
    gray_magenta: withDefault(aiAdjustments.gray_magenta, 0),
  } : {};
  const bwMixerBlock = isBW
    ? [
        tag('GrayMixerRed', bwMixerValues.gray_red),
        tag('GrayMixerOrange', bwMixerValues.gray_orange),
        tag('GrayMixerYellow', bwMixerValues.gray_yellow),
        tag('GrayMixerGreen', bwMixerValues.gray_green),
        tag('GrayMixerAqua', bwMixerValues.gray_aqua),
        tag('GrayMixerBlue', bwMixerValues.gray_blue),
        tag('GrayMixerPurple', bwMixerValues.gray_purple),
        tag('GrayMixerMagenta', bwMixerValues.gray_magenta),
      ].join('')
    : '';

  // Point Color block (optional)
  const pointColorBlock =
    inc.pointColor && Array.isArray((aiAdjustments as any).point_colors)
      ? (() => {
          const points = ((aiAdjustments as any).point_colors as number[][]).slice(0, 4);
          if (!points.length) return '';
          return points
            .map(
              (p, idx) =>
                `<crs:PointColor${idx + 1}>${p.map(v => Math.max(-100, Math.min(100, Math.round(v)))).join(',')}</crs:PointColor${
                  idx + 1
                }>\n`
            )
            .join('');
        })()
      : '';

  // Grain block
  const grainBlock = inc.grain
    ? [
        tag('GrainAmount', round(clamp(withDefault((aiAdjustments as any).grain_amount, 0), 0, 100))),
        tag('GrainSize', round(clamp(withDefault((aiAdjustments as any).grain_size, 0), 0, 100))),
        tag('GrainFrequency', round(clamp(withDefault((aiAdjustments as any).grain_frequency, 0), 0, 100))),
      ].join('')
    : '';

  // Vignette block
  const vignetteBlock = inc.vignette
    ? [
        tag('PostCropVignetteAmount', round(clamp(withDefault((aiAdjustments as any).vignette_amount, 0), -100, 100))),
        tag('PostCropVignetteMidpoint', round(clamp(withDefault((aiAdjustments as any).vignette_midpoint, 50), 0, 100))),
        tag('PostCropVignetteFeather', round(clamp(withDefault((aiAdjustments as any).vignette_feather, 50), 0, 100))),
        tag('PostCropVignetteRoundness', round(clamp(withDefault((aiAdjustments as any).vignette_roundness, 0), -100, 100))),
        tag('PostCropVignetteStyle', round(clamp(withDefault((aiAdjustments as any).vignette_style, 0), 0, 2))),
        tag('PostCropVignetteHighlightContrast', round(clamp(withDefault((aiAdjustments as any).vignette_highlight_contrast, 0), 0, 100))),
      ].join('')
    : '';

  // Masks block (skipped unless disabled). Emits Lightroom MaskGroupBasedCorrections.
  const masksBlock = inc.masks
    ? (() => {
        // Convert recipe format to simple masks
        const masks = convertRecipeToMasks(aiAdjustments);
        if (!masks.length) return '';
        const f3 = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? Number(v).toFixed(3) : undefined);
        const n0_1 = (v: any) => (typeof v === 'number' ? Math.max(0, Math.min(1, v)) : undefined);
        // Normalize local adjustments to Lightroom units
        // Notes:
        // - Lightroom stores most local params in normalized units [-1,1]. UI shows [-100,100].
        const normalizeLocal = (key: string, val: any): number | undefined => {
          if (typeof val !== 'number' || !Number.isFinite(val)) return undefined;
          
          // Use raw values for other adjustments
          return val;
        };
        const attrIf = (k: string, val?: string | number) =>
          val === 0 || val === '0' || (val !== undefined && val !== null) ? ` crs:${k}="${val}"` : '';

        // Helper to generate a 32-character uppercase hex string (Lightroom expects 32 hex chars)
        const randomHex32 = () => Array.from({ length: 32 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('');

        const correctionLis = masks
          .map((m: any, i: number) => {
            const name = typeof m?.name === 'string' ? m.name : `Mask ${i + 1}`;
            const adj = m?.adjustments || {};

            // Generate proper 32-char unique IDs per correction/mask
            const correctionSyncID = randomHex32();
            const maskSyncID = randomHex32();

            // Build adjustment attributes using 2012 naming where applicable
            const adjAttrs = [
              attrIf('CorrectionSyncID', correctionSyncID),
              attrIf('LocalHue', 0),
              // Do not emit a default LocalSaturation here; it is emitted below if provided
              attrIf('LocalContrast', 0),
              attrIf('LocalClarity', 0),
              attrIf('LocalSharpness', 0),
              attrIf('LocalBrightness', 0),
              attrIf('LocalToningHue', 0),
              attrIf('LocalToningSaturation', 0),
              attrIf('LocalContrast2012', f3(normalizeLocal('local_contrast', adj.local_contrast))),
              attrIf('LocalHighlights2012', f3(normalizeLocal('local_highlights', adj.local_highlights))),
              attrIf('LocalShadows2012', f3(normalizeLocal('local_shadows', adj.local_shadows))),
              attrIf('LocalWhites2012', f3(normalizeLocal('local_whites', adj.local_whites))),
              attrIf('LocalBlacks2012', f3(normalizeLocal('local_blacks', adj.local_blacks))),
              attrIf('LocalClarity2012', f3(normalizeLocal('local_clarity', adj.local_clarity))),
              attrIf('LocalDehaze', f3(normalizeLocal('local_dehaze', adj.local_dehaze))),
              attrIf('LocalLuminanceNoise', 0),
              attrIf('LocalMoire', 0),
              attrIf('LocalDefringe', 0),
              attrIf('LocalTexture', f3(normalizeLocal('local_texture', adj.local_texture))),
              attrIf('LocalSaturation', f3(normalizeLocal('local_saturation', adj.local_saturation))),
              attrIf('LocalGrain', 0),
              attrIf('LocalCurveRefineSaturation', 100),
            ]
              .filter(Boolean)
              .join('');

            // Build geometry li for mask
            let maskLi = '';
            let mType: any = m?.type;
            if (typeof mType === 'string') {
              mType = normalizeMaskType(mType);
            }
            if (mType === 'linear') {
              const zx = f3(n0_1(m.zeroX));
              const zy = f3(n0_1(m.zeroY));
              const fx = f3(n0_1(m.fullX));
              const fy = f3(n0_1(m.fullY));
              maskLi = `<rdf:li
         crs:What="Mask/Gradient"
         crs:MaskActive="true"
         crs:MaskName="${name}"
         crs:MaskBlendMode="0"
         crs:MaskInverted="${m?.inverted ? 'true' : 'false'}"
         crs:MaskValue="1"
         crs:ZeroX="${zx ?? '0.500'}"
         crs:ZeroY="${zy ?? '0.500'}"
         crs:FullX="${fx ?? '0.500'}"
         crs:FullY="${fy ?? '0.800'}"/>`;
            } else if (mType === 'radial') {
              const top = f3(n0_1(m.top));
              const left = f3(n0_1(m.left));
              const bottom = f3(n0_1(m.bottom));
              const right = f3(n0_1(m.right));
              const angle = f3(typeof m.angle === 'number' ? m.angle : 0);
              const midpoint = typeof m.midpoint === 'number' ? Math.round(Math.max(0, Math.min(100, m.midpoint))) : 50;
              const roundness = typeof m.roundness === 'number' ? Math.round(Math.max(-100, Math.min(100, m.roundness))) : 0;
              const feather = typeof m.feather === 'number' ? Math.round(Math.max(0, Math.min(100, m.feather))) : 75;
              maskLi = `<rdf:li
         crs:What="Mask/CircularGradient"
         crs:MaskActive="true"
         crs:MaskName="${name}"
         crs:MaskBlendMode="0"
         crs:MaskInverted="${m?.inverted ? 'true' : 'false'}"
         crs:MaskValue="1"
         crs:Top="${top ?? '0.200'}"
         crs:Left="${left ?? '0.200'}"
         crs:Bottom="${bottom ?? '0.800'}"
         crs:Right="${right ?? '0.800'}"
         crs:Angle="${angle ?? '0'}"
         crs:Midpoint="${midpoint}"
         crs:Roundness="${roundness}"
         crs:Feather="${feather}"
         crs:Flipped="${m?.flipped ? 'true' : 'false'}"
         crs:Version="2"/>`;
            } else if (getAllMaskTypes().includes(mType)) {
              // AI scene masks using configuration
              const rx = f3(n0_1(m.referenceX));
              const ry = f3(n0_1(m.referenceY));

              // Get mask configuration
              const maskConfig = getMaskConfig(mType);
              if (!maskConfig) {
                // Fallback to subject if config not found
                const subType = '1';
                const subCat = undefined;
                maskLi = `<rdf:li
         crs:What="Mask/Image"
         crs:MaskActive="true"
         crs:MaskName="${name}"
         crs:MaskBlendMode="0"
         crs:MaskInverted="${m?.inverted ? 'true' : 'false'}"
         crs:MaskSyncID="${maskSyncID}"
         crs:MaskValue="1"
         crs:MaskVersion="1"
         crs:MaskSubType="${subType}"${subCat ? `\n         crs:MaskSubCategoryID="${subCat}"` : ''}
         crs:ReferencePoint="${rx ?? '0.500'} ${ry ?? '0.500'}"
         crs:ErrorReason="0"/>`;
              } else {
                // Prefer configured subCategoryId when defined (canonical Lightroom values).
                // Only use provided subCategoryId when config doesn't specify one.
                const finalSubCat =
                  maskConfig.subCategoryId && maskConfig.subCategoryId.length > 0
                    ? maskConfig.subCategoryId
                    : typeof (m as any)?.subCategoryId === 'number'
                    ? String((m as any).subCategoryId)
                    : undefined;

                maskLi = `<rdf:li
         crs:What="Mask/Image"
         crs:MaskActive="true"
         crs:MaskName="${name}"
         crs:MaskBlendMode="0"
         crs:MaskInverted="${m?.inverted ? 'true' : 'false'}"
         crs:MaskSyncID="${maskSyncID}"
         crs:MaskValue="1"
         crs:MaskVersion="1"
         crs:MaskSubType="${maskConfig.subType}"${finalSubCat ? `\n         crs:MaskSubCategoryID="${finalSubCat}"` : ''}
         crs:ReferencePoint="${rx ?? '0.500'} ${ry ?? '0.500'}"
         crs:ErrorReason="0"/>`;
              }
            } else if (m?.type === 'range_color' || m?.type === 'range_luminance') {
              // Range masks
              const invert = m?.invert ? 'true' : 'false';
              if (m?.type === 'range_color') {
                const colorAmount = f3(n0_1(m.colorAmount));
                const pointModels = Array.isArray(m?.pointModels) ? m.pointModels : [];
                const pmLis = (pointModels as any[])
                  .map((pm: any) =>
                    Array.isArray(pm) ? (pm as any[]).map((v: any) => (typeof v === 'number' ? Number(v) : 0)).join(' ') : ''
                  )
                  .filter((s: string) => s.length > 0)
                  .map((s: string) => `           <rdf:li>${s}</rdf:li>`)
                  .join('\n');
                const pointModelsBlock = pmLis
                  ? `\n          <crs:PointModels>\n           <rdf:Seq>\n${pmLis}\n           </rdf:Seq>\n          </crs:PointModels>`
                  : '';
                maskLi = `<rdf:li>
         <rdf:Description
          crs:What="Mask/RangeMask"
          crs:MaskActive="true"
          crs:MaskName="${name}"
          crs:MaskBlendMode="0"
          crs:MaskInverted="false"
          crs:MaskSyncID=""
          crs:MaskValue="1">\n         <crs:CorrectionRangeMask>\n          <rdf:Description
           crs:Version="3"
           crs:Type="1"
           crs:ColorAmount="${colorAmount ?? '0.500'}"
           crs:Invert="${invert}"
           crs:SampleType="0">${pointModelsBlock}\n          </rdf:Description>\n         </crs:CorrectionRangeMask>\n         </rdf:Description>\n        </rdf:li>`;
              } else {
                // range_luminance
                const lum = Array.isArray(m?.lumRange) && m.lumRange.length === 4 ? m.lumRange : undefined;
                const lumStr = lum
                  ? lum.map((v: any) => (typeof v === 'number' ? Number(v).toFixed(6) : '0.000')).join(' ')
                  : '0.000 1.000 1.000 1.000';
                const lds =
                  Array.isArray(m?.luminanceDepthSampleInfo) && m.luminanceDepthSampleInfo.length === 3
                    ? m.luminanceDepthSampleInfo
                    : [0, 0.5, 0.5];
                const ldsStr = (lds as any[]).map((v: any) => (typeof v === 'number' ? Number(v).toFixed(6) : '0.000')).join(' ');
                maskLi = `<rdf:li>
         <rdf:Description
          crs:What="Mask/RangeMask"
          crs:MaskActive="true"
          crs:MaskName="${name}"
          crs:MaskBlendMode="0"
          crs:MaskInverted="false"
          crs:MaskSyncID=""
          crs:MaskValue="1">\n         <crs:CorrectionRangeMask
          crs:Version="3"
          crs:Type="2"
          crs:Invert="${invert}"
          crs:SampleType="0"
          crs:LumRange="${lumStr}"
          crs:LuminanceDepthSampleInfo="${ldsStr}"/>\n         </rdf:Description>\n        </rdf:li>`;
              }
            } else {
              // Default to subject/person if unknown
              const rx = f3(n0_1(m?.referenceX));
              const ry = f3(n0_1(m?.referenceY));
              maskLi = `<rdf:li
         crs:What="Mask/Image"
         crs:MaskActive="true"
         crs:MaskName="${name}"
         crs:MaskBlendMode="0"
         crs:MaskInverted="${m?.inverted ? 'true' : 'false'}"
         crs:MaskSyncID="${maskSyncID}"
         crs:MaskValue="1"
         crs:MaskVersion="1"
         crs:MaskSubType="1"
         crs:ReferencePoint="${rx ?? '0.500'} ${ry ?? '0.500'}"
         crs:ErrorReason="0"/>`;
            }

            return `     <rdf:li>
      <rdf:Description
       crs:What="Correction"
       crs:CorrectionAmount="1"
       crs:CorrectionActive="true"
       crs:CorrectionName="${name}"${adjAttrs}>
      <crs:CorrectionMasks>
       <rdf:Seq>
        ${maskLi}
       </rdf:Seq>
      </crs:CorrectionMasks>
      </rdf:Description>
     </rdf:li>`;
          })
          .join('\n');

        return `   <crs:MaskGroupBasedCorrections>
    <rdf:Seq>
${correctionLis}
    </rdf:Seq>
   </crs:MaskGroupBasedCorrections>`;
      })()
    : '';

  // Generate UUID for the preset
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16).toUpperCase();
    });
  };

  const xmp = `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:PresetType="Normal"
   crs:Cluster="${groupName}"
   crs:ClusterGroup="${groupName}"
   crs:UUID="${generateUUID()}"
   crs:SupportsAmount2="True"
   crs:SupportsAmount="True"
   crs:SupportsColor="True"
   crs:SupportsMonochrome="True"
   crs:SupportsHighDynamicRange="True"
   crs:SupportsNormalDynamicRange="True"
   crs:SupportsSceneReferred="True"
   crs:SupportsOutputReferred="True"
   crs:RequiresRGBTables="False"
   crs:ShowInPresets="True"
   crs:ShowInQuickActions="False"
   crs:CameraModelRestriction=""
   crs:Copyright=""
   crs:ContactInfo=""
   crs:Version="17.5"
   crs:CompatibleVersion="251854848"
   crs:ProcessVersion="15.4"
   crs:HasSettings="True"
   crs:ProfileName="${profileName}"
   crs:Look="${isBW ? 'Adobe Monochrome' : ''}"
   crs:PresetSubtype="Normal"
    crs:WhiteBalance="As Shot"
    crs:Name="${presetName}"${hslAttrs}>
   <crs:Name>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">${presetName}</rdf:li>
    </rdf:Alt>
   </crs:Name>
   <crs:ShortName>
    <rdf:Alt>
     <rdf:li xml:lang="x-default"/>
    </rdf:Alt>
   </crs:ShortName>
   <crs:SortName>
    <rdf:Alt>
     <rdf:li xml:lang="x-default"/>
    </rdf:Alt>
   </crs:SortName>
   <crs:Group>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">Film Recipe Wizard</rdf:li>
    </rdf:Alt>
   </crs:Group>
   <crs:Description>
    <rdf:Alt>
     <rdf:li xml:lang="x-default"/>
    </rdf:Alt>
   </crs:Description>
   ${isBW ? `<crs:Look>
     <rdf:Description
      crs:Name="Adobe Monochrome"
      crs:Amount="1"
      crs:UUID="0CFE8F8AB5F63B2A73CE0B0077D20817"
      crs:SupportsAmount="true"
      crs:SupportsMonochrome="false"
      crs:SupportsOutputReferred="false"
      crs:Copyright="© 2018 Adobe Systems, Inc."
      crs:Stubbed="true">
     <crs:Group>
      <rdf:Alt>
       <rdf:li xml:lang="x-default">Profiles</rdf:li>
      </rdf:Alt>
     </crs:Group>
     </rdf:Description>
    </crs:Look>` : ''}
   ${treatmentTag}
${wbBasicBlock}${parametricCurvesBlock}${toneCurvesBlock}${bwMixerBlock}${colorGradingBlock}${pointColorBlock}${grainBlock}${vignetteBlock}
   <!-- Masks (optional) -->
   ${masksBlock}
   <!-- Processing Notes -->
   
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>`;
  return xmp;
}
