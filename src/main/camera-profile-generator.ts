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

  // Extract color adjustments
  const exposure = adjustments.exposure || 0;
  const contrast = adjustments.contrast || 0;
  const highlights = adjustments.highlights || 0;
  const shadows = adjustments.shadows || 0;
  const whites = adjustments.whites || 0;
  const blacks = adjustments.blacks || 0;
  const vibrance = adjustments.vibrance || 0;
  const saturation = isBW ? -100 : adjustments.saturation || 0;

  // Color grading
  const shadowsHue = adjustments.shadows_hue || 0;
  const shadowsSat = adjustments.shadows_sat || 0;
  const midtonesSat = adjustments.midtones_sat || 0;
  const highlightsHue = adjustments.highlights_hue || 0;
  const highlightsSat = adjustments.highlights_sat || 0;

  // Generate XMP for camera profile
  return `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
        crs:PresetType="Look"
        crs:Cluster=""
        crs:UUID="${generateUUID()}"
        crs:SupportsAmount="true"
        crs:SupportsColor="true"
        crs:SupportsMonochrome="true"
        crs:SupportsHighDynamicRange="true"
        crs:SupportsNormalDynamicRange="true"
        crs:SupportsSceneReferred="true"
        crs:SupportsOutputReferred="true"
        crs:CameraModelRestriction=""
        crs:Copyright=""
        crs:ContactInfo=""
        crs:Version="16.5"
        crs:ProcessVersion="15.4"
        crs:Exposure2012="${(exposure / 100).toFixed(2)}"
        crs:Contrast2012="${Math.round(contrast)}"
        crs:Highlights2012="${Math.round(highlights)}"
        crs:Shadows2012="${Math.round(shadows)}"
        crs:Whites2012="${Math.round(whites)}"
        crs:Blacks2012="${Math.round(blacks)}"
        crs:Vibrance="${Math.round(vibrance)}"
        crs:Saturation="${Math.round(saturation)}"
        crs:ConvertToGrayscale="${isBW ? 'true' : 'false'}"
        ${isBW ? 'crs:Treatment="Black &amp; White"' : 'crs:Treatment="Color"'}
        crs:SplitToningShadowHue="${Math.round(shadowsHue)}"
        crs:SplitToningShadowSaturation="${Math.round(shadowsSat)}"
        crs:SplitToningHighlightHue="${Math.round(highlightsHue)}"
        crs:SplitToningHighlightSaturation="${Math.round(highlightsSat)}"
        crs:SplitToningBalance="${Math.round(midtonesSat)}"
        ${isBW && adjustments.bw_red !== undefined ? `crs:GrayMixerRed="${Math.round(adjustments.bw_red)}"` : ''}
        ${isBW && adjustments.bw_orange !== undefined ? `crs:GrayMixerOrange="${Math.round(adjustments.bw_orange)}"` : ''}
        ${isBW && adjustments.bw_yellow !== undefined ? `crs:GrayMixerYellow="${Math.round(adjustments.bw_yellow)}"` : ''}
        ${isBW && adjustments.bw_green !== undefined ? `crs:GrayMixerGreen="${Math.round(adjustments.bw_green)}"` : ''}
        ${isBW && adjustments.bw_aqua !== undefined ? `crs:GrayMixerAqua="${Math.round(adjustments.bw_aqua)}"` : ''}
        ${isBW && adjustments.bw_blue !== undefined ? `crs:GrayMixerBlue="${Math.round(adjustments.bw_blue)}"` : ''}
        ${isBW && adjustments.bw_purple !== undefined ? `crs:GrayMixerPurple="${Math.round(adjustments.bw_purple)}"` : ''}
        ${isBW && adjustments.bw_magenta !== undefined ? `crs:GrayMixerMagenta="${Math.round(adjustments.bw_magenta)}"` : ''}
        crs:HasSettings="true">
      <crs:Name>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${profileName}</rdf:li>
        </rdf:Alt>
      </crs:Name>
      <crs:ShortName>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${profileName}</rdf:li>
        </rdf:Alt>
      </crs:ShortName>
      <crs:Group>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">Foto Recipe Wizard</rdf:li>
        </rdf:Alt>
      </crs:Group>
      <crs:Description>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">Camera profile generated from Foto Recipe Wizard</rdf:li>
        </rdf:Alt>
      </crs:Description>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`;
}

