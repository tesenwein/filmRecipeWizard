import { extractCurveData, generateAllToneCurvesXML } from '../shared/curve-utils';

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    })
    .toUpperCase();
}

export function generateCameraProfileXMP(profileName: string, adjustments: any): string {
  // Check if this is a black and white conversion
  const isBW =
    !!adjustments.monochrome ||
    adjustments.treatment === 'black_and_white' ||
    (typeof adjustments.camera_profile === 'string' && /monochrome/i.test(adjustments.camera_profile || '')) ||
    (typeof adjustments.saturation === 'number' && adjustments.saturation <= -100);

  // Apply strength scaling (same as preset export - default 1.0 for full intensity)
  const strength = 1.0; // Default strength multiplier
  const scale = (v: any): number | undefined =>
    typeof v === 'number' && Number.isFinite(v) ? v * strength : undefined;

  // Clamp helpers to keep values within Lightroom-expected ranges
  const clamp = (v: any, min: number, max: number): number | undefined => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
    return Math.max(min, Math.min(max, v));
  };
  const round = (v: number | undefined) => (typeof v === 'number' ? Math.round(v) : undefined);
  const fixed2 = (v: number | undefined) => (typeof v === 'number' ? v.toFixed(2) : undefined);

  // Extract and scale color adjustments (only include exposure if it's actually set and non-zero)
  const exposure = adjustments.exposure !== undefined && adjustments.exposure !== 0 ? clamp(scale(adjustments.exposure), -5, 5) : undefined;
  const contrast = round(clamp(scale(adjustments.contrast), -100, 100));
  const highlights = round(clamp(scale(adjustments.highlights), -100, 100));
  const shadows = round(clamp(scale(adjustments.shadows), -100, 100));
  const whites = round(clamp(scale(adjustments.whites), -100, 100));
  const blacks = round(clamp(scale(adjustments.blacks), -100, 100));
  const clarity = round(clamp(scale(adjustments.clarity), -100, 100));
  const vibrance = round(clamp(scale(adjustments.vibrance), -100, 100));
  const saturation = isBW ? 0 : round(clamp(scale(adjustments.saturation), -100, 100));


  // Normalize/select camera profile same way as preset generator
  const normalizeCameraProfile = (name?: string): string | undefined => {
    if (!name) return undefined;
    const n = String(name).toLowerCase();
    if (/mono|black\s*&?\s*white|b\s*&\s*w/.test(n)) return 'Adobe Monochrome';
    if (/portrait|people|skin/.test(n)) return 'Adobe Portrait';
    if (/landscape|sky|mountain|nature/.test(n)) return 'Adobe Landscape';
    if (/color|standard|default|auto/.test(n)) return 'Adobe Color';
    return 'Adobe Color';
  };
  const autoSelectCameraProfile = (): string => {
    if (isBW) return 'Adobe Monochrome';
    const masks = Array.isArray((adjustments as any).masks) ? ((adjustments as any).masks as any[]) : [];
    let faceCount = 0;
    let landscapeLike = 0;
    let hasSky = false;
    for (const m of masks) {
      const t = String(m?.type || '').toLowerCase();
      if (t === 'subject' || t === 'person' || t === 'face') faceCount++;
      if (t === 'background' || t === 'landscape') landscapeLike++;
      if (t === 'sky') hasSky = true;
    }
    if (faceCount > 0) return 'Adobe Portrait';
    if (hasSky || landscapeLike > 0) return 'Adobe Landscape';
    return 'Adobe Color';
  };
  const cameraProfileName = normalizeCameraProfile((adjustments as any)?.camera_profile) || autoSelectCameraProfile();

  // Color grading (use proper field names from AI adjustments)
  const shadowsHue = round(clamp(adjustments.color_grade_shadow_hue, 0, 360));
  const shadowsSat = round(clamp(scale(adjustments.color_grade_shadow_sat), 0, 100));
  const shadowsLum = round(clamp(scale(adjustments.color_grade_shadow_lum), -100, 100));
  const midtonesHue = round(clamp(adjustments.color_grade_midtone_hue, 0, 360));
  const midtonesSat = round(clamp(scale(adjustments.color_grade_midtone_sat), 0, 100));
  const midtonesLum = round(clamp(scale(adjustments.color_grade_midtone_lum), -100, 100));
  const highlightsHue = round(clamp(adjustments.color_grade_highlight_hue, 0, 360));
  const highlightsSat = round(clamp(scale(adjustments.color_grade_highlight_sat), 0, 100));
  const highlightsLum = round(clamp(scale(adjustments.color_grade_highlight_lum), -100, 100));

  // Helper function to generate tags
  const tag = (name: string, val?: number | string) =>
    val === 0 || val === '0' || !!val ? `      <crs:${name}>${val}</crs:${name}>\n` : '';

  // HSL adjustments (only for color images)
  const hslBlock = !isBW ? [
    tag('HueAdjustmentRed', round(clamp(adjustments.hue_red, -100, 100))),
    tag('HueAdjustmentOrange', round(clamp(adjustments.hue_orange, -100, 100))),
    tag('HueAdjustmentYellow', round(clamp(adjustments.hue_yellow, -100, 100))),
    tag('HueAdjustmentGreen', round(clamp(adjustments.hue_green, -100, 100))),
    tag('HueAdjustmentAqua', round(clamp(adjustments.hue_aqua, -100, 100))),
    tag('HueAdjustmentBlue', round(clamp(adjustments.hue_blue, -100, 100))),
    tag('HueAdjustmentPurple', round(clamp(adjustments.hue_purple, -100, 100))),
    tag('HueAdjustmentMagenta', round(clamp(adjustments.hue_magenta, -100, 100))),
    tag('SaturationAdjustmentRed', round(clamp(scale(adjustments.sat_red), -100, 100))),
    tag('SaturationAdjustmentOrange', round(clamp(scale(adjustments.sat_orange), -100, 100))),
    tag('SaturationAdjustmentYellow', round(clamp(scale(adjustments.sat_yellow), -100, 100))),
    tag('SaturationAdjustmentGreen', round(clamp(scale(adjustments.sat_green), -100, 100))),
    tag('SaturationAdjustmentAqua', round(clamp(scale(adjustments.sat_aqua), -100, 100))),
    tag('SaturationAdjustmentBlue', round(clamp(scale(adjustments.sat_blue), -100, 100))),
    tag('SaturationAdjustmentPurple', round(clamp(scale(adjustments.sat_purple), -100, 100))),
    tag('SaturationAdjustmentMagenta', round(clamp(scale(adjustments.sat_magenta), -100, 100))),
    tag('LuminanceAdjustmentRed', round(clamp(scale(adjustments.lum_red), -100, 100))),
    tag('LuminanceAdjustmentOrange', round(clamp(scale(adjustments.lum_orange), -100, 100))),
    tag('LuminanceAdjustmentYellow', round(clamp(scale(adjustments.lum_yellow), -100, 100))),
    tag('LuminanceAdjustmentGreen', round(clamp(scale(adjustments.lum_green), -100, 100))),
    tag('LuminanceAdjustmentAqua', round(clamp(scale(adjustments.lum_aqua), -100, 100))),
    tag('LuminanceAdjustmentBlue', round(clamp(scale(adjustments.lum_blue), -100, 100))),
    tag('LuminanceAdjustmentPurple', round(clamp(scale(adjustments.lum_purple), -100, 100))),
    tag('LuminanceAdjustmentMagenta', round(clamp(scale(adjustments.lum_magenta), -100, 100))),
  ].join('') : '';

  // Color grading block
  const colorGradingBlock = [
    tag('ColorGradeMidtoneHue', midtonesHue),
    tag('ColorGradeMidtoneSat', midtonesSat),
    tag('ColorGradeMidtoneLum', midtonesLum),
    tag('ColorGradeShadowHue', shadowsHue),
    tag('ColorGradeShadowSat', shadowsSat),
    tag('ColorGradeShadowLum', shadowsLum),
    tag('ColorGradeHighlightHue', highlightsHue),
    tag('ColorGradeHighlightSat', highlightsSat),
    tag('ColorGradeHighlightLum', highlightsLum),
    tag('ColorGradeGlobalHue', round(clamp(adjustments.color_grade_global_hue, 0, 360))),
    tag('ColorGradeGlobalSat', round(clamp(scale(adjustments.color_grade_global_sat), 0, 100))),
    tag('ColorGradeGlobalLum', round(clamp(scale(adjustments.color_grade_global_lum), -100, 100))),
    tag('ColorGradeBlending', round(clamp(scale(adjustments.color_grade_blending), 0, 100))),
    tag('ColorGradeBalance', round(clamp(scale(adjustments.color_grade_balance), -100, 100))),
  ].join('');

  // Parametric curves
  const parametricCurvesBlock = [
    tag('ParametricShadows', round(clamp(scale(adjustments.parametric_shadows), -100, 100))),
    tag('ParametricDarks', round(clamp(scale(adjustments.parametric_darks), -100, 100))),
    tag('ParametricLights', round(clamp(scale(adjustments.parametric_lights), -100, 100))),
    tag('ParametricHighlights', round(clamp(scale(adjustments.parametric_highlights), -100, 100))),
    tag('ParametricShadowSplit', round(clamp(adjustments.parametric_shadow_split, 0, 100))),
    tag('ParametricMidtoneSplit', round(clamp(adjustments.parametric_midtone_split, 0, 100))),
    tag('ParametricHighlightSplit', round(clamp(adjustments.parametric_highlight_split, 0, 100))),
  ].join('');

  // Black & White Mix block (GrayMixer*) when in monochrome
  const bwMixerBlock = isBW ? (() => {
    const src = adjustments;
    const vals = [
      src.gray_red, src.gray_orange, src.gray_yellow, src.gray_green,
      src.gray_aqua, src.gray_blue, src.gray_purple, src.gray_magenta,
    ];
    const hasAny = vals.some(v => typeof v === 'number' && Number.isFinite(v));
    if (!hasAny) return '';
    return [
      tag('GrayMixerRed', round(clamp(scale(src.gray_red), -100, 100))),
      tag('GrayMixerOrange', round(clamp(scale(src.gray_orange), -100, 100))),
      tag('GrayMixerYellow', round(clamp(scale(src.gray_yellow), -100, 100))),
      tag('GrayMixerGreen', round(clamp(scale(src.gray_green), -100, 100))),
      tag('GrayMixerAqua', round(clamp(scale(src.gray_aqua), -100, 100))),
      tag('GrayMixerBlue', round(clamp(scale(src.gray_blue), -100, 100))),
      tag('GrayMixerPurple', round(clamp(scale(src.gray_purple), -100, 100))),
      tag('GrayMixerMagenta', round(clamp(scale(src.gray_magenta), -100, 100))),
    ].join('');
  })() : '';

  // Point Color block
  const pointColorBlock = Array.isArray(adjustments.point_colors) ? (() => {
    const points = adjustments.point_colors.slice(0, 4);
    if (!points.length) return '';
    return points
      .map(
        (p: number[], idx: number) =>
          `<crs:PointColor${idx + 1}>${p
            .map(v => Math.max(-100, Math.min(100, Math.round(v))))
            .join(',')}</crs:PointColor${idx + 1}>\n`
      )
      .join('');
  })() : '';

  // Tone curves block
  const toneCurvesBlock = generateAllToneCurvesXML(extractCurveData(adjustments));

  // Grain block
  const grainBlock = [
    tag('GrainAmount', round(clamp(adjustments.grain_amount, 0, 100))),
    tag('GrainSize', round(clamp(adjustments.grain_size, 0, 100))),
    tag('GrainFrequency', round(clamp(adjustments.grain_frequency, 0, 100))),
  ].join('');

  const vignetteBlock = [
    tag('PostCropVignetteAmount', round(clamp(adjustments.vignette_amount, -100, 100))),
    tag('PostCropVignetteMidpoint', round(clamp(adjustments.vignette_midpoint, 0, 100))),
    tag('PostCropVignetteFeather', round(clamp(adjustments.vignette_feather, 0, 100))),
    tag('PostCropVignetteRoundness', round(clamp(adjustments.vignette_roundness, -100, 100))),
    tag('PostCropVignetteStyle', round(clamp(adjustments.vignette_style, 0, 2))),
    tag('PostCropVignetteHighlightContrast', round(clamp(adjustments.vignette_highlight_contrast, 0, 100))),
    adjustments.override_look_vignette ? tag('OverrideLookVignette', 'True') : '',
  ].join('');

  // Note: Local adjustment masks are not supported in camera profiles; omitted intentionally

  // Generate proper camera profile XMP (Look type, not Normal preset)
  return `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
        crs:Version="17.5"
        crs:ProcessVersion="15.4"
        crs:ProfileName="${cameraProfileName}"
        crs:Look=""
        crs:HasSettings="True"
        crs:PresetType="Look"
        crs:Cluster="film-recipe-wizard"
        crs:ClusterGroup="film-recipe-wizard"
        crs:PresetSubtype="Normal"
        crs:SupportsAmount="True"
        crs:SupportsAmount2="True"
        crs:SupportsColor="True"
        crs:SupportsMonochrome="True"
        crs:WhiteBalance="As Shot"
        crs:Name="${profileName}">
      <crs:Name>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${profileName}</rdf:li>
        </rdf:Alt>
      </crs:Name>
      <crs:Group>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">Film Recipe Wizard</rdf:li>
        </rdf:Alt>
      </crs:Group>
      <crs:Description>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${adjustments.description || 'Camera profile generated from Film Recipe Wizard'}</rdf:li>
        </rdf:Alt>
      </crs:Description>
      ${tag('Treatment', isBW ? 'Black &amp; White' : 'Color')}
      ${(() => {
      // Match preset generator behavior: exclude Exposure by default unless explicitly requested
      const includeExposure = !!((adjustments as any)?.include?.exposure || (adjustments as any)?.includeExposure);
      return includeExposure && exposure !== undefined ? tag('Exposure2012', fixed2(exposure)) : '';
    })()}
      ${tag('Contrast2012', contrast)}
      ${tag('Highlights2012', highlights)}
      ${tag('Shadows2012', shadows)}
      ${tag('Whites2012', whites)}
      ${tag('Blacks2012', blacks)}
      ${tag('Clarity2012', clarity)}
      ${tag('Vibrance', vibrance)}
      ${tag('Saturation', saturation)}
      ${isBW ? '<crs:ConvertToGrayscale>True</crs:ConvertToGrayscale>\n' : ''}
      ${toneCurvesBlock}
      ${hslBlock}
      ${colorGradingBlock}
      ${parametricCurvesBlock}
      ${bwMixerBlock}
      ${pointColorBlock}
      ${grainBlock}
      ${vignetteBlock}
      <!-- Local adjustment masks are not supported in camera profiles; omitted intentionally -->
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}
