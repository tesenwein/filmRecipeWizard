import { AIColorAdjustments } from '../services/openai-color-analyzer';

export function generateXMPContent(aiAdjustments: AIColorAdjustments, include: any): string {
  // Generate XMP content for Lightroom based on AI adjustments
  const isBW = !!aiAdjustments.monochrome || aiAdjustments.treatment === 'black_and_white' ||
    (typeof aiAdjustments.camera_profile === 'string' && /monochrome/i.test(aiAdjustments.camera_profile || '')) ||
    (typeof aiAdjustments.saturation === 'number' && aiAdjustments.saturation <= -100);
  const cameraProfile = aiAdjustments.camera_profile || (isBW ? 'Adobe Monochrome' : 'Adobe Color');
  const profileName = cameraProfile;
  const treatmentTag = isBW ? '<crs:Treatment>Black &amp; White</crs:Treatment>\n      <crs:ConvertToGrayscale>True</crs:ConvertToGrayscale>' : '<crs:Treatment>Color</crs:Treatment>';
  const tag = (name: string, val?: number | string) =>
    (val === 0 || val === '0' || !!val) ? `      <crs:${name}>${val}</crs:${name}>\n` : '';

  // Clamp helpers to keep values within Lightroom-expected ranges
  const clamp = (v: any, min: number, max: number): number | undefined => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
    return Math.max(min, Math.min(max, v));
  };
  const round = (v: number | undefined) => (typeof v === 'number' ? Math.round(v) : undefined);
  const fixed2 = (v: number | undefined) => (typeof v === 'number' ? v.toFixed(2) : undefined);

  // Sanitize all inputs
  // Use D65 (6500K) as a neutral default to avoid unintended warm/yellow bias
  const withDefault = (v: any, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const temp = round(clamp(withDefault(aiAdjustments.temperature, 6500), 2000, 50000));
  const tint = round(clamp(withDefault(aiAdjustments.tint, 0), -150, 150));
  const exposure = clamp(aiAdjustments.exposure as any, -5, 5);
  const contrast = round(clamp(aiAdjustments.contrast as any, -100, 100));
  const highlights = round(clamp(aiAdjustments.highlights as any, -100, 100));
  const shadows = round(clamp(aiAdjustments.shadows as any, -100, 100));
  const whites = round(clamp(aiAdjustments.whites as any, -100, 100));
  const blacks = round(clamp(aiAdjustments.blacks as any, -100, 100));
  const clarity = round(clamp(aiAdjustments.clarity as any, -100, 100));
  const vibrance = round(clamp(aiAdjustments.vibrance as any, -100, 100));
  const saturation = round(clamp(aiAdjustments.saturation as any, -100, 100));

  const sanitizeName = (n: string) =>
    n
      .replace(/\b(image\s*match|imagematch|match|target|base|ai|photo)\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  const fallback = `Preset-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
  const rawPresetName = ((aiAdjustments as any).preset_name && String((aiAdjustments as any).preset_name).trim()) || fallback;
  const presetName = sanitizeName(rawPresetName) || fallback;
  const groupName = 'foto-recipe-wizard';
  // Inclusion flags with sane defaults (back-compat: include everything when not specified)
  const inc = {
    wbBasic: include?.wbBasic !== false,
    exposure: !!include?.exposure, // exposure is separate and defaults to off unless explicitly enabled
    hsl: include?.hsl !== false,
    colorGrading: include?.colorGrading !== false,
    curves: include?.curves !== false,
    // Enable Point Color by default unless explicitly disabled
    pointColor: include?.pointColor !== false,
    // Film Grain optional export flag (default ON for back-compat)
    grain: include?.grain !== false,
    // Masks/local adjustments export flag (default OFF)
    masks: !!include?.masks,
    // sharpenNoise and vignette currently not emitted in XMP (placeholders)
  } as const;

  console.log('[XMP] include flags:', inc);

  // Build conditional blocks
  const wbBasicBlock = inc.wbBasic
    ? [
        tag('Temperature', temp),
        tag('Tint', tint),
        tag('Contrast2012', contrast),
        tag('Highlights2012', highlights),
        tag('Shadows2012', shadows),
        tag('Whites2012', whites),
        tag('Blacks2012', blacks),
        tag('Clarity2012', clarity),
        tag('Vibrance', vibrance),
        tag('Saturation', isBW ? 0 : saturation),
      ].join('')
    : '';

  const shouldIncludeExposure = inc.exposure && typeof exposure === 'number' && Number.isFinite(exposure);
  console.log('[XMP] exposure:', { value: exposure, include: shouldIncludeExposure });
  const exposureBlock = shouldIncludeExposure ? tag('Exposure2012', fixed2(exposure)) : '';

  const parametricCurvesBlock = inc.curves
    ? [
        tag('ParametricShadows', round(clamp((aiAdjustments as any).parametric_shadows, -100, 100))),
        tag('ParametricDarks', round(clamp((aiAdjustments as any).parametric_darks, -100, 100))),
        tag('ParametricLights', round(clamp((aiAdjustments as any).parametric_lights, -100, 100))),
        tag('ParametricHighlights', round(clamp((aiAdjustments as any).parametric_highlights, -100, 100))),
        tag('ParametricShadowSplit', round(clamp((aiAdjustments as any).parametric_shadow_split, 0, 100))),
        tag('ParametricMidtoneSplit', round(clamp((aiAdjustments as any).parametric_midtone_split, 0, 100))),
        tag('ParametricHighlightSplit', round(clamp((aiAdjustments as any).parametric_highlight_split, 0, 100))),
      ].join('')
    : '';

  const toneCurvesBlock = inc.curves
    ? [
        (aiAdjustments as any).tone_curve
          ? `<crs:ToneCurvePV2012>\n        <rdf:Seq>\n${(((aiAdjustments as any).tone_curve as any[]) || []).map(p => `          <rdf:li>${Math.max(0, Math.min(255, Math.round(p.input || 0)))}, ${Math.max(0, Math.min(255, Math.round(p.output || 0)))}</rdf:li>`).join('\n')}\n        </rdf:Seq>\n      </crs:ToneCurvePV2012>\n`
          : '',
        (aiAdjustments as any).tone_curve_red
          ? `<crs:ToneCurvePV2012Red>\n        <rdf:Seq>\n${(((aiAdjustments as any).tone_curve_red as any[]) || []).map(p => `          <rdf:li>${Math.max(0, Math.min(255, Math.round(p.input || 0)))}, ${Math.max(0, Math.min(255, Math.round(p.output || 0)))}</rdf:li>`).join('\n')}\n        </rdf:Seq>\n      </crs:ToneCurvePV2012Red>\n`
          : '',
        (aiAdjustments as any).tone_curve_green
          ? `<crs:ToneCurvePV2012Green>\n        <rdf:Seq>\n${(((aiAdjustments as any).tone_curve_green as any[]) || []).map(p => `          <rdf:li>${Math.max(0, Math.min(255, Math.round(p.input || 0)))}, ${Math.max(0, Math.min(255, Math.round(p.output || 0)))}</rdf:li>`).join('\n')}\n        </rdf:Seq>\n      </crs:ToneCurvePV2012Green>\n`
          : '',
        (aiAdjustments as any).tone_curve_blue
          ? `<crs:ToneCurvePV2012Blue>\n        <rdf:Seq>\n${(((aiAdjustments as any).tone_curve_blue as any[]) || []).map(p => `          <rdf:li>${Math.max(0, Math.min(255, Math.round(p.input || 0)))}, ${Math.max(0, Math.min(255, Math.round(p.output || 0)))}</rdf:li>`).join('\n')}\n        </rdf:Seq>\n      </crs:ToneCurvePV2012Blue>\n`
          : '',
      ].join('')
    : '';

  const hslBlock = inc.hsl
    ? [
        tag('HueAdjustmentRed', round(clamp((aiAdjustments as any).hue_red, -100, 100))),
        tag('HueAdjustmentOrange', (aiAdjustments as any).hue_orange),
        tag('HueAdjustmentYellow', (aiAdjustments as any).hue_yellow),
        tag('HueAdjustmentGreen', (aiAdjustments as any).hue_green),
        tag('HueAdjustmentAqua', (aiAdjustments as any).hue_aqua),
        tag('HueAdjustmentBlue', (aiAdjustments as any).hue_blue),
        tag('HueAdjustmentPurple', (aiAdjustments as any).hue_purple),
        tag('HueAdjustmentMagenta', (aiAdjustments as any).hue_magenta),
        tag('SaturationAdjustmentRed', (aiAdjustments as any).sat_red),
        tag('SaturationAdjustmentOrange', (aiAdjustments as any).sat_orange),
        tag('SaturationAdjustmentYellow', (aiAdjustments as any).sat_yellow),
        tag('SaturationAdjustmentGreen', (aiAdjustments as any).sat_green),
        tag('SaturationAdjustmentAqua', (aiAdjustments as any).sat_aqua),
        tag('SaturationAdjustmentBlue', (aiAdjustments as any).sat_blue),
        tag('SaturationAdjustmentPurple', (aiAdjustments as any).sat_purple),
        tag('SaturationAdjustmentMagenta', (aiAdjustments as any).sat_magenta),
        tag('LuminanceAdjustmentRed', (aiAdjustments as any).lum_red),
        tag('LuminanceAdjustmentOrange', (aiAdjustments as any).lum_orange),
        tag('LuminanceAdjustmentYellow', (aiAdjustments as any).lum_yellow),
        tag('LuminanceAdjustmentGreen', (aiAdjustments as any).lum_green),
        tag('LuminanceAdjustmentAqua', (aiAdjustments as any).lum_aqua),
        tag('LuminanceAdjustmentBlue', (aiAdjustments as any).lum_blue),
        tag('LuminanceAdjustmentPurple', (aiAdjustments as any).lum_purple),
        tag('LuminanceAdjustmentMagenta', (aiAdjustments as any).lum_magenta),
      ].join('')
    : '';

  // Color Grading block
  const colorGradingBlock = inc.colorGrading
    ? [
        tag('ColorGradeMidtoneHue', round(clamp((aiAdjustments as any).color_grade_midtone_hue, 0, 360))),
        tag('ColorGradeMidtoneSat', round(clamp((aiAdjustments as any).color_grade_midtone_sat, 0, 100))),
        tag('ColorGradeMidtoneLum', round(clamp((aiAdjustments as any).color_grade_midtone_lum, -100, 100))),
        tag('ColorGradeShadowHue', round(clamp((aiAdjustments as any).color_grade_shadow_hue, 0, 360))),
        tag('ColorGradeShadowSat', round(clamp((aiAdjustments as any).color_grade_shadow_sat, 0, 100))),
        tag('ColorGradeShadowLum', round(clamp((aiAdjustments as any).color_grade_shadow_lum, -100, 100))),
        tag('ColorGradeHighlightHue', round(clamp((aiAdjustments as any).color_grade_highlight_hue, 0, 360))),
        tag('ColorGradeHighlightSat', round(clamp((aiAdjustments as any).color_grade_highlight_sat, 0, 100))),
        tag('ColorGradeHighlightLum', round(clamp((aiAdjustments as any).color_grade_highlight_lum, -100, 100))),
        tag('ColorGradeGlobalHue', round(clamp((aiAdjustments as any).color_grade_global_hue, 0, 360))),
        tag('ColorGradeGlobalSat', round(clamp((aiAdjustments as any).color_grade_global_sat, 0, 100))),
        tag('ColorGradeGlobalLum', round(clamp((aiAdjustments as any).color_grade_global_lum, -100, 100))),
        tag('ColorGradeBlending', round(clamp((aiAdjustments as any).color_grade_blending, 0, 100))),
        tag('ColorGradeBalance', round(clamp((aiAdjustments as any).color_grade_balance, -100, 100))),
      ].join('')
    : '';

  // Point Color block (optional)
  const pointColorBlock = inc.pointColor && Array.isArray((aiAdjustments as any).point_colors)
    ? (() => {
        const points = ((aiAdjustments as any).point_colors as number[][]).slice(0, 4);
        if (!points.length) return '';
        return points
          .map((p, idx) =>
            `<crs:PointColor${idx + 1}>${p.map(v => Math.max(-100, Math.min(100, Math.round(v)))).join(',')}</crs:PointColor${idx + 1}>\n`
          )
          .join('');
      })()
    : '';

  // Grain block
  const grainBlock = inc.grain
    ? [
        tag('GrainAmount', round(clamp((aiAdjustments as any).grain_amount, 0, 100))),
        tag('GrainSize', round(clamp((aiAdjustments as any).grain_size, 0, 100))),
        tag('GrainFrequency', round(clamp((aiAdjustments as any).grain_frequency, 0, 100))),
      ].join('')
    : '';

  // Masks block (skipped unless enabled)
  const masksBlock = inc.masks && Array.isArray((aiAdjustments as any).masks)
    ? ((aiAdjustments as any).masks as any[])
        .map((m, i) => {
          const typ = m?.type === 'linear' ? 'Linear' : 'Radial';
          const name = typeof m?.name === 'string' ? m.name : `Mask ${i + 1}`;
          const adj = m?.adjustments || {};
          const tagIfNum = (k: string, v: any) => (typeof v === 'number' ? `<crs:${k}>${Math.round(v)}</crs:${k}>\n` : '');
          return `      <crs:LocalAdjustmentWhat>Mask</crs:LocalAdjustmentWhat>\n      <crs:LocalName>${name}</crs:LocalName>\n      <crs:Localize${typ}>True</crs:Localize${typ}>\n${tagIfNum('LocalExposure', adj.local_exposure)}${tagIfNum('LocalContrast', adj.local_contrast)}${tagIfNum('LocalHighlights', adj.local_highlights)}${tagIfNum('LocalShadows', adj.local_shadows)}${tagIfNum('LocalWhites', adj.local_whites)}${tagIfNum('LocalBlacks', adj.local_blacks)}${tagIfNum('LocalClarity', adj.local_clarity)}${tagIfNum('LocalDehaze', adj.local_dehaze)}${tagIfNum('LocalTemperature', adj.local_temperature)}${tagIfNum('LocalTint', adj.local_tint)}${tagIfNum('LocalTexture', adj.local_texture)}${tagIfNum('LocalSaturation', adj.local_saturation)}`;
        })
        .join('\n')
    : '';

  const xmp = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description
      xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
      crs:Version="14.0"
      crs:ProcessVersion="14.0"
      crs:CameraProfile="${profileName}"
      crs:Look=""
      crs:HasSettings="True"
      crs:PresetType="Normal"
      crs:Cluster="${groupName}"
      crs:ClusterGroup="${groupName}"
      crs:PresetSubtype="Normal"
      crs:SupportsAmount="True"
      crs:Name="${presetName}">
      ${treatmentTag}
${wbBasicBlock}${exposureBlock}${parametricCurvesBlock}${toneCurvesBlock}${hslBlock}${colorGradingBlock}${pointColorBlock}${grainBlock}
      <!-- Masks (optional) -->
      ${masksBlock}
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`;
  return xmp;
}
