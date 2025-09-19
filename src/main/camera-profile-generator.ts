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

  // Camera profiles should be minimal - just color space transformation and basic tonal mapping
  // No strength scaling for camera profiles - they should be the foundation
  const clamp = (v: any, min: number, max: number): number | undefined => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
    return Math.max(min, Math.min(max, v));
  };
  const round = (v: number | undefined) => (typeof v === 'number' ? Math.round(v) : undefined);
  const fixed2 = (v: number | undefined) => (typeof v === 'number' ? v.toFixed(2) : undefined);

  // Camera profile should only include basic color space and tonal foundation
  // Temperature and tint for color space
  const temp = round(clamp(adjustments.temperature || 6500, 2000, 50000));
  const tint = round(clamp(adjustments.tint || 0, -150, 150));

  // Basic tonal mapping (minimal adjustments)
  const exposure = adjustments.exposure !== undefined && adjustments.exposure !== 0 ? clamp(adjustments.exposure, -5, 5) : undefined;
  const contrast = round(clamp(adjustments.contrast, -100, 100));
  const highlights = round(clamp(adjustments.highlights, -100, 100));
  const shadows = round(clamp(adjustments.shadows, -100, 100));
  const whites = round(clamp(adjustments.whites, -100, 100));
  const blacks = round(clamp(adjustments.blacks, -100, 100));

  // Basic color adjustments (minimal)
  const vibrance = round(clamp(adjustments.vibrance, -100, 100));
  const saturation = isBW ? 0 : round(clamp(adjustments.saturation, -100, 100));

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

  // Camera profile should have minimal color grading - just basic color space transformation
  // Skip complex color grading - that should be in the preset

  // Helper function to generate tags
  const tag = (name: string, val?: number | string) =>
    val === 0 || val === '0' || !!val ? `      <crs:${name}>${val}</crs:${name}>\n` : '';

  // Camera profile should be minimal - only basic color space and tonal foundation
  // Complex adjustments (HSL, color grading, curves, masks, grain) should be in the preset

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
        crs:PresetSubtype="Look"
        crs:SupportsAmount="True"
        crs:SupportsAmount2="True"
        crs:SupportsColor="True"
        crs:SupportsMonochrome="True"
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
      ${tag('Treatment', isBW ? 'Black & White' : 'Color')}
      ${tag('Temperature', temp)}
      ${tag('Tint', tint)}
      ${exposure !== undefined ? tag('Exposure2012', fixed2(exposure)) : ''}
      ${tag('Contrast2012', contrast)}
      ${tag('Highlights2012', highlights)}
      ${tag('Shadows2012', shadows)}
      ${tag('Whites2012', whites)}
      ${tag('Blacks2012', blacks)}
      ${tag('Vibrance', vibrance)}
      ${tag('Saturation', saturation)}
      ${isBW ? '<crs:ConvertToGrayscale>True</crs:ConvertToGrayscale>\n' : ''}
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`;
}
