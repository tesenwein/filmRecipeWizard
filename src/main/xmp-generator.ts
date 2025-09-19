import type { AIColorAdjustments } from '../services/types';
import { getMaskConfig, getAllMaskTypes, normalizeMaskType } from '../shared/mask-types';

// Example B&W mixer derived from example-bw.xmp (available for optional use elsewhere)
export function getExampleBWMixer(): Pick<
  AIColorAdjustments,
  | 'gray_red'
  | 'gray_orange'
  | 'gray_yellow'
  | 'gray_green'
  | 'gray_aqua'
  | 'gray_blue'
  | 'gray_purple'
  | 'gray_magenta'
> {
  return {
    gray_red: -20,
    gray_orange: 31,
    gray_yellow: -70,
    gray_green: -32,
    gray_aqua: 0,
    gray_blue: -13,
    gray_purple: -43,
    gray_magenta: -32,
  };
}

export function generateXMPContent(
  aiAdjustments: AIColorAdjustments,
  include: any
): string {
  // Generate XMP content for Lightroom based on AI adjustments
  const isBW =
    !!aiAdjustments.monochrome ||
    aiAdjustments.treatment === 'black_and_white' ||
    (typeof aiAdjustments.camera_profile === 'string' &&
      /monochrome/i.test(aiAdjustments.camera_profile || '')) ||
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
    const masks = Array.isArray((aiAdjustments as any).masks) ? ((aiAdjustments as any).masks as any[]) : [];
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

  // Clamp helpers to keep values within Lightroom-expected ranges
  const clamp = (v: any, min: number, max: number): number | undefined => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
    return Math.max(min, Math.min(max, v));
  };
  const round = (v: number | undefined) => (typeof v === 'number' ? Math.round(v) : undefined);
  const fixed2 = (v: number | undefined) => (typeof v === 'number' ? v.toFixed(2) : undefined);

  // Apply a global strength scaling to reduce effect intensity.
  // Default to 0.5 based on feedback that presets were ~2x too strong.
  const strength =
    typeof include?.strength === 'number' && Number.isFinite(include.strength)
      ? Math.max(0, Math.min(2, include.strength))
      : 0.5;
  const scale = (v: any): number | undefined =>
    typeof v === 'number' && Number.isFinite(v) ? v * strength : undefined;

  // Sanitize all inputs
  // Use D65 (6500K) as a neutral default to avoid unintended warm/yellow bias
  const withDefault = (v: any, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const temp = round(clamp(withDefault(aiAdjustments.temperature, 6500), 2000, 50000));
  const tint = round(clamp(withDefault(aiAdjustments.tint, 0), -150, 150));
  const exposure = clamp(scale(aiAdjustments.exposure as any), -5, 5);
  const contrast = round(clamp(scale(aiAdjustments.contrast as any), -100, 100));
  const highlights = round(clamp(scale(aiAdjustments.highlights as any), -100, 100));
  const shadows = round(clamp(scale(aiAdjustments.shadows as any), -100, 100));
  const whites = round(clamp(scale(aiAdjustments.whites as any), -100, 100));
  const blacks = round(clamp(scale(aiAdjustments.blacks as any), -100, 100));
  const clarity = round(clamp(scale(aiAdjustments.clarity as any), -100, 100));
  const vibrance = round(clamp(scale(aiAdjustments.vibrance as any), -100, 100));
  const saturation = round(clamp(scale(aiAdjustments.saturation as any), -100, 100));

  const sanitizeName = (n: string) =>
    n
      .replace(/\b(image\s*match|imagematch|match|target|base|ai|photo)\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  const fallback = `Preset-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
  const rawPresetName =
    ((aiAdjustments as any).preset_name && String((aiAdjustments as any).preset_name).trim()) ||
    fallback;
  const presetName = sanitizeName(rawPresetName) || fallback;
  const groupName = 'film-recipe-wizard';
  // Inclusion flags with flexible defaults (back-compat: include everything when not specified)
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
  } as const;

  // Build conditional blocks - always include what's available
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

  const shouldIncludeExposure =
    inc.exposure && typeof exposure === 'number' && Number.isFinite(exposure);
  const exposureBlock = shouldIncludeExposure ? tag('Exposure2012', fixed2(exposure)) : '';

  const parametricCurvesBlock = inc.curves
    ? [
      tag(
        'ParametricShadows',
        round(clamp(scale((aiAdjustments as any).parametric_shadows), -100, 100))
      ),
      tag(
        'ParametricDarks',
        round(clamp(scale((aiAdjustments as any).parametric_darks), -100, 100))
      ),
      tag(
        'ParametricLights',
        round(clamp(scale((aiAdjustments as any).parametric_lights), -100, 100))
      ),
      tag(
        'ParametricHighlights',
        round(clamp(scale((aiAdjustments as any).parametric_highlights), -100, 100))
      ),
      tag(
        'ParametricShadowSplit',
        round(clamp((aiAdjustments as any).parametric_shadow_split, 0, 100))
      ),
      tag(
        'ParametricMidtoneSplit',
        round(clamp((aiAdjustments as any).parametric_midtone_split, 0, 100))
      ),
      tag(
        'ParametricHighlightSplit',
        round(clamp((aiAdjustments as any).parametric_highlight_split, 0, 100))
      ),
    ].join('')
    : '';

  const toneCurvesBlock = inc.curves
    ? [
      (aiAdjustments as any).tone_curve
        ? `<crs:ToneCurvePV2012>\n        <rdf:Seq>\n${(
          ((aiAdjustments as any).tone_curve as any[]) || []
        )
          .map(
            p =>
              `          <rdf:li>${Math.max(
                0,
                Math.min(255, Math.round(p.input || 0))
              )}, ${Math.max(0, Math.min(255, Math.round(p.output || 0)))}</rdf:li>`
          )
          .join('\n')}\n        </rdf:Seq>\n      </crs:ToneCurvePV2012>\n`
        : '',
      (aiAdjustments as any).tone_curve_red
        ? `<crs:ToneCurvePV2012Red>\n        <rdf:Seq>\n${(
          ((aiAdjustments as any).tone_curve_red as any[]) || []
        )
          .map(
            p =>
              `          <rdf:li>${Math.max(
                0,
                Math.min(255, Math.round(p.input || 0))
              )}, ${Math.max(0, Math.min(255, Math.round(p.output || 0)))}</rdf:li>`
          )
          .join('\n')}\n        </rdf:Seq>\n      </crs:ToneCurvePV2012Red>\n`
        : '',
      (aiAdjustments as any).tone_curve_green
        ? `<crs:ToneCurvePV2012Green>\n        <rdf:Seq>\n${(
          ((aiAdjustments as any).tone_curve_green as any[]) || []
        )
          .map(
            p =>
              `          <rdf:li>${Math.max(
                0,
                Math.min(255, Math.round(p.input || 0))
              )}, ${Math.max(0, Math.min(255, Math.round(p.output || 0)))}</rdf:li>`
          )
          .join('\n')}\n        </rdf:Seq>\n      </crs:ToneCurvePV2012Green>\n`
        : '',
      (aiAdjustments as any).tone_curve_blue
        ? `<crs:ToneCurvePV2012Blue>\n        <rdf:Seq>\n${(
          ((aiAdjustments as any).tone_curve_blue as any[]) || []
        )
          .map(
            p =>
              `          <rdf:li>${Math.max(
                0,
                Math.min(255, Math.round(p.input || 0))
              )}, ${Math.max(0, Math.min(255, Math.round(p.output || 0)))}</rdf:li>`
          )
          .join('\n')}\n        </rdf:Seq>\n      </crs:ToneCurvePV2012Blue>\n`
        : '',
    ].join('')
    : '';

  // HSL only applies to color treatment; B&W uses GrayMixer tags
  const hslBlock =
    inc.hsl && !isBW
      ? [
        tag('HueAdjustmentRed', round(clamp((aiAdjustments as any).hue_red, -100, 100))),
        tag('HueAdjustmentOrange', (aiAdjustments as any).hue_orange),
        tag('HueAdjustmentYellow', (aiAdjustments as any).hue_yellow),
        tag('HueAdjustmentGreen', (aiAdjustments as any).hue_green),
        tag('HueAdjustmentAqua', (aiAdjustments as any).hue_aqua),
        tag('HueAdjustmentBlue', (aiAdjustments as any).hue_blue),
        tag('HueAdjustmentPurple', (aiAdjustments as any).hue_purple),
        tag('HueAdjustmentMagenta', (aiAdjustments as any).hue_magenta),
        tag(
          'SaturationAdjustmentRed',
          round(clamp(scale((aiAdjustments as any).sat_red), -100, 100))
        ),
        tag(
          'SaturationAdjustmentOrange',
          round(clamp(scale((aiAdjustments as any).sat_orange), -100, 100))
        ),
        tag(
          'SaturationAdjustmentYellow',
          round(clamp(scale((aiAdjustments as any).sat_yellow), -100, 100))
        ),
        tag(
          'SaturationAdjustmentGreen',
          round(clamp(scale((aiAdjustments as any).sat_green), -100, 100))
        ),
        tag(
          'SaturationAdjustmentAqua',
          round(clamp(scale((aiAdjustments as any).sat_aqua), -100, 100))
        ),
        tag(
          'SaturationAdjustmentBlue',
          round(clamp(scale((aiAdjustments as any).sat_blue), -100, 100))
        ),
        tag(
          'SaturationAdjustmentPurple',
          round(clamp(scale((aiAdjustments as any).sat_purple), -100, 100))
        ),
        tag(
          'SaturationAdjustmentMagenta',
          round(clamp(scale((aiAdjustments as any).sat_magenta), -100, 100))
        ),
        tag(
          'LuminanceAdjustmentRed',
          round(clamp(scale((aiAdjustments as any).lum_red), -100, 100))
        ),
        tag(
          'LuminanceAdjustmentOrange',
          round(clamp(scale((aiAdjustments as any).lum_orange), -100, 100))
        ),
        tag(
          'LuminanceAdjustmentYellow',
          round(clamp(scale((aiAdjustments as any).lum_yellow), -100, 100))
        ),
        tag(
          'LuminanceAdjustmentGreen',
          round(clamp(scale((aiAdjustments as any).lum_green), -100, 100))
        ),
        tag(
          'LuminanceAdjustmentAqua',
          round(clamp(scale((aiAdjustments as any).lum_aqua), -100, 100))
        ),
        tag(
          'LuminanceAdjustmentBlue',
          round(clamp(scale((aiAdjustments as any).lum_blue), -100, 100))
        ),
        tag(
          'LuminanceAdjustmentPurple',
          round(clamp(scale((aiAdjustments as any).lum_purple), -100, 100))
        ),
        tag(
          'LuminanceAdjustmentMagenta',
          round(clamp(scale((aiAdjustments as any).lum_magenta), -100, 100))
        ),
      ].join('')
      : '';

  // Color Grading block
  const colorGradingBlock = inc.colorGrading
    ? [
      tag(
        'ColorGradeMidtoneHue',
        round(clamp((aiAdjustments as any).color_grade_midtone_hue, 0, 360))
      ),
      tag(
        'ColorGradeMidtoneSat',
        round(clamp(scale((aiAdjustments as any).color_grade_midtone_sat), 0, 100))
      ),
      tag(
        'ColorGradeMidtoneLum',
        round(clamp(scale((aiAdjustments as any).color_grade_midtone_lum), -100, 100))
      ),
      tag(
        'ColorGradeShadowHue',
        round(clamp((aiAdjustments as any).color_grade_shadow_hue, 0, 360))
      ),
      tag(
        'ColorGradeShadowSat',
        round(clamp(scale((aiAdjustments as any).color_grade_shadow_sat), 0, 100))
      ),
      tag(
        'ColorGradeShadowLum',
        round(clamp(scale((aiAdjustments as any).color_grade_shadow_lum), -100, 100))
      ),
      tag(
        'ColorGradeHighlightHue',
        round(clamp((aiAdjustments as any).color_grade_highlight_hue, 0, 360))
      ),
      tag(
        'ColorGradeHighlightSat',
        round(clamp(scale((aiAdjustments as any).color_grade_highlight_sat), 0, 100))
      ),
      tag(
        'ColorGradeHighlightLum',
        round(clamp(scale((aiAdjustments as any).color_grade_highlight_lum), -100, 100))
      ),
      tag(
        'ColorGradeGlobalHue',
        round(clamp((aiAdjustments as any).color_grade_global_hue, 0, 360))
      ),
      tag(
        'ColorGradeGlobalSat',
        round(clamp(scale((aiAdjustments as any).color_grade_global_sat), 0, 100))
      ),
      tag(
        'ColorGradeGlobalLum',
        round(clamp(scale((aiAdjustments as any).color_grade_global_lum), -100, 100))
      ),
      tag(
        'ColorGradeBlending',
        round(clamp(scale((aiAdjustments as any).color_grade_blending), 0, 100))
      ),
      tag(
        'ColorGradeBalance',
        round(clamp(scale((aiAdjustments as any).color_grade_balance), -100, 100))
      ),
    ].join('')
    : '';

  // Black & White Mix block (GrayMixer*) when in monochrome
  const bwMixerBlock = isBW
    ? (() => {
      const clamp = (v: any, min: number, max: number): number | undefined => {
        if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
        return Math.max(min, Math.min(max, v));
      };
      const round = (v: number | undefined) =>
        typeof v === 'number' ? Math.round(v) : undefined;
      const src = aiAdjustments as any;
      const vals = [
        src.gray_red,
        src.gray_orange,
        src.gray_yellow,
        src.gray_green,
        src.gray_aqua,
        src.gray_blue,
        src.gray_purple,
        src.gray_magenta,
      ];
      const hasAny = vals.some(v => typeof v === 'number' && Number.isFinite(v));
      if (!hasAny) return '';
      const tag = (name: string, val?: number) =>
        val === 0 || (typeof val === 'number' && Number.isFinite(val))
          ? `      <crs:${name}>${val}</crs:${name}>\n`
          : '';
      return [
        tag('GrayMixerRed', round(clamp(src.gray_red, -100, 100) as any)),
        tag('GrayMixerOrange', round(clamp(src.gray_orange, -100, 100) as any)),
        tag('GrayMixerYellow', round(clamp(src.gray_yellow, -100, 100) as any)),
        tag('GrayMixerGreen', round(clamp(src.gray_green, -100, 100) as any)),
        tag('GrayMixerAqua', round(clamp(src.gray_aqua, -100, 100) as any)),
        tag('GrayMixerBlue', round(clamp(src.gray_blue, -100, 100) as any)),
        tag('GrayMixerPurple', round(clamp(src.gray_purple, -100, 100) as any)),
        tag('GrayMixerMagenta', round(clamp(src.gray_magenta, -100, 100) as any)),
      ].join('');
    })()
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
              `<crs:PointColor${idx + 1}>${p
                .map(v => Math.max(-100, Math.min(100, Math.round(v))))
                .join(',')}</crs:PointColor${idx + 1}>\n`
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

  // Masks block (skipped unless disabled). Emits Lightroom MaskGroupBasedCorrections.
  const masksBlock =
    inc.masks
      ? (() => {
        const masks = Array.isArray((aiAdjustments as any).masks)
          ? ((aiAdjustments as any).masks as any[])
          : [];
        if (!masks.length) return '';
        const f3 = (v: any) =>
          typeof v === 'number' && Number.isFinite(v) ? Number(v).toFixed(3) : undefined;
        const n0_1 = (v: any) =>
          typeof v === 'number' ? Math.max(0, Math.min(1, v)) : undefined;
        // Apply reduced strength for mask adjustments to make them less strong
        const maskStrength = strength * 0.6; // 60% of the main strength
        const nM1_1_scaled = (v: any) =>
          typeof v === 'number' ? Math.max(-1, Math.min(1, v * maskStrength)) : undefined;
        const attrIf = (k: string, val?: string | number) =>
          val === 0 || val === '0' || (val !== undefined && val !== null)
            ? ` crs:${k}="${val}"`
            : '';

        // Helper to generate a 32-character uppercase hex string (Lightroom expects 32 hex chars)
        const randomHex32 = () =>
          Array.from({ length: 32 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)])
            .join('');

        const correctionLis = masks
          .map((m, i) => {
            const name = typeof m?.name === 'string' ? m.name : `Mask ${i + 1}`;
            const adj = m?.adjustments || {};

            // Generate proper 32-char unique IDs per correction/mask
            const correctionSyncID = randomHex32();
            const maskSyncID = randomHex32();

            // Build adjustment attributes using 2012 naming where applicable
            const adjAttrs = [
              attrIf('CorrectionSyncID', correctionSyncID),
              attrIf('LocalExposure', 0),
              attrIf('LocalHue', 0),
              attrIf('LocalSaturation', 0),
              attrIf('LocalContrast', 0),
              attrIf('LocalClarity', 0),
              attrIf('LocalSharpness', 0),
              attrIf('LocalBrightness', 0),
              attrIf('LocalToningHue', 0),
              attrIf('LocalToningSaturation', 0),
              attrIf('LocalExposure2012', f3(nM1_1_scaled(adj.local_exposure) as any)),
              attrIf('LocalContrast2012', f3(nM1_1_scaled(adj.local_contrast) as any)),
              attrIf('LocalHighlights2012', f3(nM1_1_scaled(adj.local_highlights) as any)),
              attrIf('LocalShadows2012', f3(nM1_1_scaled(adj.local_shadows) as any)),
              attrIf('LocalWhites2012', f3(nM1_1_scaled(adj.local_whites) as any)),
              attrIf('LocalBlacks2012', f3(nM1_1_scaled(adj.local_blacks) as any)),
              attrIf('LocalClarity2012', f3(nM1_1_scaled(adj.local_clarity) as any)),
              attrIf('LocalDehaze', f3(nM1_1_scaled(adj.local_dehaze) as any)),
              attrIf('LocalLuminanceNoise', 0),
              attrIf('LocalMoire', 0),
              attrIf('LocalDefringe', 0),
              attrIf('LocalTemperature', 0),
              attrIf('LocalTint', 0),
              attrIf('LocalTexture', f3(nM1_1_scaled(adj.local_texture) as any)),
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
              const midpoint =
                typeof m.midpoint === 'number'
                  ? Math.round(Math.max(0, Math.min(100, m.midpoint)))
                  : 50;
              const roundness =
                typeof m.roundness === 'number'
                  ? Math.round(Math.max(-100, Math.min(100, m.roundness)))
                  : 0;
              const feather =
                typeof m.feather === 'number'
                  ? Math.round(Math.max(0, Math.min(100, m.feather)))
                  : 75;
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
                const finalSubCat = (maskConfig.subCategoryId && maskConfig.subCategoryId.length > 0)
                  ? maskConfig.subCategoryId
                  : (typeof (m as any)?.subCategoryId === 'number'
                    ? String((m as any).subCategoryId)
                    : undefined);

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
                    Array.isArray(pm)
                      ? (pm as any[])
                        .map((v: any) => (typeof v === 'number' ? Number(v) : 0))
                        .join(' ')
                      : ''
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
                const lum =
                  Array.isArray(m?.lumRange) && m.lumRange.length === 4 ? m.lumRange : undefined;
                const lumStr = lum
                  ? lum
                    .map((v: any) =>
                      typeof v === 'number' ? Number(v).toFixed(6) : '0.000000'
                    )
                    .join(' ')
                  : '0.000000 1.000000 1.000000 1.000000';
                const lds =
                  Array.isArray(m?.luminanceDepthSampleInfo) &&
                    m.luminanceDepthSampleInfo.length === 3
                    ? m.luminanceDepthSampleInfo
                    : [0, 0.5, 0.5];
                const ldsStr = (lds as any[])
                  .map((v: any) => (typeof v === 'number' ? Number(v).toFixed(6) : '0.000000'))
                  .join(' ');
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

  const xmp = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description
      xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
      crs:Version="17.5"
      crs:ProcessVersion="15.4"
      crs:ProfileName="${profileName}"
      crs:Look=""
      crs:HasSettings="True"
      crs:PresetType="Normal"
      crs:Cluster="${groupName}"
      crs:ClusterGroup="${groupName}"
      crs:PresetSubtype="Normal"
      crs:SupportsAmount="True"
      crs:SupportsAmount2="True"
      crs:SupportsColor="True"
      crs:SupportsMonochrome="True"
      crs:Name="${presetName}">
      <crs:Name>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${presetName}</rdf:li>
        </rdf:Alt>
      </crs:Name>
      <crs:Group>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">Film Recipe Wizard</rdf:li>
        </rdf:Alt>
      </crs:Group>
      ${treatmentTag}
${wbBasicBlock}${exposureBlock}${parametricCurvesBlock}${toneCurvesBlock}${hslBlock}${bwMixerBlock}${colorGradingBlock}${pointColorBlock}${grainBlock}
      <!-- Masks (optional) -->
      ${masksBlock}
      <!-- Processing Notes -->
      
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`;
  return xmp;
}
