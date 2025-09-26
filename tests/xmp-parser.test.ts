import { parseXMPContent } from '../src/main/xmp-parser';

describe('XMP Parser', () => {
  describe('Basic XMP Parsing', () => {
    it('should parse minimal XMP content', () => {
      const xmpContent = `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:PresetType="Normal"
   crs:Version="17.5"
   crs:HasSettings="True">
   <crs:Name>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">Test Preset</rdf:li>
    </rdf:Alt>
   </crs:Name>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>`;

      const result = parseXMPContent(xmpContent);

      expect(result.success).toBe(true);
      expect(result.adjustments?.preset_name).toBe('Test Preset');
      expect(result.presetName).toBe('Test Preset');
      expect(result.metadata?.version).toBe('17.5');
    });

    it('should handle invalid XMP content', () => {
      const invalidContent = 'Not XMP content';
      const result = parseXMPContent(invalidContent);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not a valid Lightroom XMP preset');
    });

    it('should handle empty content', () => {
      const result = parseXMPContent('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid XMP content');
    });

    it('should extract preset metadata correctly', () => {
      const xmpContent = `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:PresetType="Normal"
   crs:Version="17.5"
   crs:HasSettings="True">
   <crs:Name>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">Cinematic Shadows</rdf:li>
    </rdf:Alt>
   </crs:Name>
   <crs:Description>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">Dark, moody cinematic look with deep shadows</rdf:li>
    </rdf:Alt>
   </crs:Description>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>`;

      const result = parseXMPContent(xmpContent);

      expect(result.success).toBe(true);
      expect(result.adjustments?.preset_name).toBe('Cinematic Shadows');
      expect(result.description).toBe('Dark, moody cinematic look with deep shadows');
      expect(result.metadata?.presetType).toBe('Normal');
      expect(result.metadata?.version).toBe('17.5');
    });
  });

  describe('Basic Adjustments Parsing', () => {
    it('should parse basic tone adjustments', () => {
      const xmpContent = `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns/meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:PresetType="Normal"
   crs:Version="17.5"
   crs:HasSettings="True">
   <crs:Name>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">Basic Test</rdf:li>
    </rdf:Alt>
   </crs:Name>
   <crs:Exposure2012>0.5</crs:Exposure2012>
   <crs:Contrast2012>25</crs:Contrast2012>
   <crs:Highlights2012>-30</crs:Highlights2012>
   <crs:Shadows2012>40</crs:Shadows2012>
   <crs:Whites2012>-20</crs:Whites2012>
   <crs:Blacks2012>15</crs:Blacks2012>
   <crs:Vibrance>10</crs:Vibrance>
   <crs:Saturation>-5</crs:Saturation>
   <crs:Clarity2012>20</crs:Clarity2012>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>`;

      const result = parseXMPContent(xmpContent);

      expect(result.success).toBe(true);
      expect(result.adjustments?.exposure).toBe(0.5);
      expect(result.adjustments?.contrast).toBe(25);
      expect(result.adjustments?.highlights).toBe(-30);
      expect(result.adjustments?.shadows).toBe(40);
      expect(result.adjustments?.whites).toBe(-20);
      expect(result.adjustments?.blacks).toBe(15);
      expect(result.adjustments?.vibrance).toBe(10);
      expect(result.adjustments?.saturation).toBe(-5);
      expect(result.adjustments?.clarity).toBe(20);
    });

    it('should parse treatment settings', () => {
      const xmpContent = `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns/meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:PresetType="Normal"
   crs:Version="17.5"
   crs:HasSettings="True">
   <crs:Name>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">B&W Test</rdf:li>
    </rdf:Alt>
   </crs:Name>
   <crs:Treatment>Black &amp; White</crs:Treatment>
   <crs:ConvertToGrayscale>True</crs:ConvertToGrayscale>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>`;

      const result = parseXMPContent(xmpContent);

      expect(result.success).toBe(true);
      expect(result.adjustments?.treatment).toBe('black_and_white');
      expect(result.adjustments?.monochrome).toBe(true);
    });
  });

  describe('HSL Color Mixer Parsing', () => {
    it('should parse HSL adjustments', () => {
      const xmpContent = `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns/meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:PresetType="Normal"
   crs:Version="17.5"
   crs:HasSettings="True"
   crs:HueAdjustmentRed="-20"
   crs:HueAdjustmentOrange="15"
   crs:HueAdjustmentYellow="-10"
   crs:HueAdjustmentGreen="25"
   crs:HueAdjustmentAqua="-15"
   crs:HueAdjustmentBlue="30"
   crs:HueAdjustmentPurple="-25"
   crs:HueAdjustmentMagenta="20"
   crs:SaturationAdjustmentRed="-30"
   crs:SaturationAdjustmentOrange="20"
   crs:SaturationAdjustmentYellow="-15"
   crs:SaturationAdjustmentGreen="35"
   crs:SaturationAdjustmentAqua="-20"
   crs:SaturationAdjustmentBlue="25"
   crs:SaturationAdjustmentPurple="-35"
   crs:SaturationAdjustmentMagenta="15"
   crs:LuminanceAdjustmentRed="-25"
   crs:LuminanceAdjustmentOrange="15"
   crs:LuminanceAdjustmentYellow="-20"
   crs:LuminanceAdjustmentGreen="30"
   crs:LuminanceAdjustmentAqua="-15"
   crs:LuminanceAdjustmentBlue="20"
   crs:LuminanceAdjustmentPurple="-30"
   crs:LuminanceAdjustmentMagenta="10">
   <crs:Name>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">HSL Test</rdf:li>
    </rdf:Alt>
   </crs:Name>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>`;

      const result = parseXMPContent(xmpContent);

      expect(result.success).toBe(true);
      expect(result.metadata?.hasHSL).toBe(true);

      // Check hue adjustments
      expect(result.adjustments?.hue_red).toBe(-20);
      expect(result.adjustments?.hue_orange).toBe(15);
      expect(result.adjustments?.hue_yellow).toBe(-10);
      expect(result.adjustments?.hue_green).toBe(25);
      expect(result.adjustments?.hue_aqua).toBe(-15);
      expect(result.adjustments?.hue_blue).toBe(30);
      expect(result.adjustments?.hue_purple).toBe(-25);
      expect(result.adjustments?.hue_magenta).toBe(20);

      // Check saturation adjustments
      expect(result.adjustments?.sat_red).toBe(-30);
      expect(result.adjustments?.sat_orange).toBe(20);
      expect(result.adjustments?.sat_yellow).toBe(-15);
      expect(result.adjustments?.sat_green).toBe(35);
      expect(result.adjustments?.sat_aqua).toBe(-20);
      expect(result.adjustments?.sat_blue).toBe(25);
      expect(result.adjustments?.sat_purple).toBe(-35);
      expect(result.adjustments?.sat_magenta).toBe(15);

      // Check luminance adjustments
      expect(result.adjustments?.lum_red).toBe(-25);
      expect(result.adjustments?.lum_orange).toBe(15);
      expect(result.adjustments?.lum_yellow).toBe(-20);
      expect(result.adjustments?.lum_green).toBe(30);
      expect(result.adjustments?.lum_aqua).toBe(-15);
      expect(result.adjustments?.lum_blue).toBe(20);
      expect(result.adjustments?.lum_purple).toBe(-30);
      expect(result.adjustments?.lum_magenta).toBe(10);
    });
  });

  describe('Black & White Mixer Parsing', () => {
    it('should parse gray mixer adjustments', () => {
      const xmpContent = `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns/meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:PresetType="Normal"
   crs:Version="17.5"
   crs:HasSettings="True">
   <crs:Name>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">B&W Mixer Test</rdf:li>
    </rdf:Alt>
   </crs:Name>
   <crs:Treatment>Black &amp; White</crs:Treatment>
   <crs:GrayMixerRed>-30</crs:GrayMixerRed>
   <crs:GrayMixerOrange>20</crs:GrayMixerOrange>
   <crs:GrayMixerYellow>-15</crs:GrayMixerYellow>
   <crs:GrayMixerGreen>25</crs:GrayMixerGreen>
   <crs:GrayMixerAqua>-20</crs:GrayMixerAqua>
   <crs:GrayMixerBlue>15</crs:GrayMixerBlue>
   <crs:GrayMixerPurple>-25</crs:GrayMixerPurple>
   <crs:GrayMixerMagenta>10</crs:GrayMixerMagenta>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>`;

      const result = parseXMPContent(xmpContent);

      expect(result.success).toBe(true);
      expect(result.adjustments?.treatment).toBe('black_and_white');
      expect(result.adjustments?.monochrome).toBe(true);

      // Check gray mixer adjustments
      expect(result.adjustments?.gray_red).toBe(-30);
      expect(result.adjustments?.gray_orange).toBe(20);
      expect(result.adjustments?.gray_yellow).toBe(-15);
      expect(result.adjustments?.gray_green).toBe(25);
      expect(result.adjustments?.gray_aqua).toBe(-20);
      expect(result.adjustments?.gray_blue).toBe(15);
      expect(result.adjustments?.gray_purple).toBe(-25);
      expect(result.adjustments?.gray_magenta).toBe(10);
    });
  });

  describe('Color Grading Parsing', () => {
    it('should parse color grading adjustments', () => {
      const xmpContent = `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns/meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:PresetType="Normal"
   crs:Version="17.5"
   crs:HasSettings="True">
   <crs:Name>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">Color Grading Test</rdf:li>
    </rdf:Alt>
   </crs:Name>
   <crs:ColorGradeShadowHue>200</crs:ColorGradeShadowHue>
   <crs:ColorGradeShadowSat>30</crs:ColorGradeShadowSat>
   <crs:ColorGradeShadowLum>-20</crs:ColorGradeShadowLum>
   <crs:ColorGradeMidtoneHue>180</crs:ColorGradeMidtoneHue>
   <crs:ColorGradeMidtoneSat>25</crs:ColorGradeMidtoneSat>
   <crs:ColorGradeMidtoneLum>10</crs:ColorGradeMidtoneLum>
   <crs:ColorGradeHighlightHue>160</crs:ColorGradeHighlightHue>
   <crs:ColorGradeHighlightSat>20</crs:ColorGradeHighlightSat>
   <crs:ColorGradeHighlightLum>15</crs:ColorGradeHighlightLum>
   <crs:ColorGradeGlobalHue>170</crs:ColorGradeGlobalHue>
   <crs:ColorGradeGlobalSat>15</crs:ColorGradeGlobalSat>
   <crs:ColorGradeGlobalLum>-5</crs:ColorGradeGlobalLum>
   <crs:ColorGradeBlending>75</crs:ColorGradeBlending>
   <crs:ColorGradeBalance>25</crs:ColorGradeBalance>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>`;

      const result = parseXMPContent(xmpContent);

      expect(result.success).toBe(true);
      expect(result.metadata?.hasColorGrading).toBe(true);

      // Check shadow color grading
      expect(result.adjustments?.color_grade_shadow_hue).toBe(200);
      expect(result.adjustments?.color_grade_shadow_sat).toBe(30);
      expect(result.adjustments?.color_grade_shadow_lum).toBe(-20);

      // Check midtone color grading
      expect(result.adjustments?.color_grade_midtone_hue).toBe(180);
      expect(result.adjustments?.color_grade_midtone_sat).toBe(25);
      expect(result.adjustments?.color_grade_midtone_lum).toBe(10);

      // Check highlight color grading
      expect(result.adjustments?.color_grade_highlight_hue).toBe(160);
      expect(result.adjustments?.color_grade_highlight_sat).toBe(20);
      expect(result.adjustments?.color_grade_highlight_lum).toBe(15);

      // Check global color grading
      expect(result.adjustments?.color_grade_global_hue).toBe(170);
      expect(result.adjustments?.color_grade_global_sat).toBe(15);
      expect(result.adjustments?.color_grade_global_lum).toBe(-5);

      // Check blending and balance
      expect(result.adjustments?.color_grade_blending).toBe(75);
      expect(result.adjustments?.color_grade_balance).toBe(25);
    });
  });

  describe('Tone Curves Parsing', () => {
    it('should parse tone curves', () => {
      const xmpContent = `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns/meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:PresetType="Normal"
   crs:Version="17.5"
   crs:HasSettings="True">
   <crs:Name>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">Curves Test</rdf:li>
    </rdf:Alt>
   </crs:Name>
   <crs:ToneCurvePV2012>
    <rdf:Seq>
     <rdf:li>0, 0</rdf:li>
     <rdf:li>128, 140</rdf:li>
     <rdf:li>255, 255</rdf:li>
    </rdf:Seq>
   </crs:ToneCurvePV2012>
   <crs:ToneCurvePV2012Red>
    <rdf:Seq>
     <rdf:li>0, 0</rdf:li>
     <rdf:li>128, 120</rdf:li>
     <rdf:li>255, 255</rdf:li>
    </rdf:Seq>
   </crs:ToneCurvePV2012Red>
   <crs:ToneCurvePV2012Green>
    <rdf:Seq>
     <rdf:li>0, 0</rdf:li>
     <rdf:li>128, 130</rdf:li>
     <rdf:li>255, 255</rdf:li>
    </rdf:Seq>
   </crs:ToneCurvePV2012Green>
   <crs:ToneCurvePV2012Blue>
    <rdf:Seq>
     <rdf:li>0, 0</rdf:li>
     <rdf:li>128, 110</rdf:li>
     <rdf:li>255, 255</rdf:li>
    </rdf:Seq>
   </crs:ToneCurvePV2012Blue>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>`;

      const result = parseXMPContent(xmpContent);

      expect(result.success).toBe(true);
      expect(result.metadata?.hasCurves).toBe(true);

      // Check main tone curve
      expect(result.adjustments?.tone_curve).toBeDefined();
      expect(Array.isArray(result.adjustments?.tone_curve)).toBe(true);
      expect(result.adjustments?.tone_curve).toHaveLength(3);
      expect(result.adjustments?.tone_curve?.[0]).toEqual({ input: 0, output: 0 });
      expect(result.adjustments?.tone_curve?.[1]).toEqual({ input: 128, output: 140 });
      expect(result.adjustments?.tone_curve?.[2]).toEqual({ input: 255, output: 255 });

      // Check red tone curve
      expect(result.adjustments?.tone_curve_red).toBeDefined();
      expect(Array.isArray(result.adjustments?.tone_curve_red)).toBe(true);
      expect(result.adjustments?.tone_curve_red).toHaveLength(3);
      expect(result.adjustments?.tone_curve_red?.[1]).toEqual({ input: 128, output: 120 });

      // Check green tone curve
      expect(result.adjustments?.tone_curve_green).toBeDefined();
      expect(Array.isArray(result.adjustments?.tone_curve_green)).toBe(true);
      expect(result.adjustments?.tone_curve_green).toHaveLength(3);
      expect(result.adjustments?.tone_curve_green?.[1]).toEqual({ input: 128, output: 130 });

      // Check blue tone curve
      expect(result.adjustments?.tone_curve_blue).toBeDefined();
      expect(Array.isArray(result.adjustments?.tone_curve_blue)).toBe(true);
      expect(result.adjustments?.tone_curve_blue).toHaveLength(3);
      expect(result.adjustments?.tone_curve_blue?.[1]).toEqual({ input: 128, output: 110 });
    });
  });

  describe('Grain and Vignette Parsing', () => {
    it('should parse grain adjustments', () => {
      const xmpContent = `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns/meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:PresetType="Normal"
   crs:Version="17.5"
   crs:HasSettings="True">
   <crs:Name>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">Grain Test</rdf:li>
    </rdf:Alt>
   </crs:Name>
   <crs:GrainAmount>25</crs:GrainAmount>
   <crs:GrainSize>15</crs:GrainSize>
   <crs:GrainFrequency>30</crs:GrainFrequency>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>`;

      const result = parseXMPContent(xmpContent);

      expect(result.success).toBe(true);
      expect(result.adjustments?.grain_amount).toBe(25);
      expect(result.adjustments?.grain_size).toBe(15);
      expect(result.adjustments?.grain_frequency).toBe(30);
    });

    it('should parse vignette adjustments', () => {
      const xmpContent = `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns/meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:PresetType="Normal"
   crs:Version="17.5"
   crs:HasSettings="True">
   <crs:Name>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">Vignette Test</rdf:li>
    </rdf:Alt>
   </crs:Name>
   <crs:PostCropVignetteAmount>-40</crs:PostCropVignetteAmount>
   <crs:PostCropVignetteMidpoint>50</crs:PostCropVignetteMidpoint>
   <crs:PostCropVignetteFeather>75</crs:PostCropVignetteFeather>
   <crs:PostCropVignetteRoundness>25</crs:PostCropVignetteRoundness>
   <crs:PostCropVignetteStyle>1</crs:PostCropVignetteStyle>
   <crs:PostCropVignetteHighlightContrast>30</crs:PostCropVignetteHighlightContrast>
   <crs:OverrideLookVignette>True</crs:OverrideLookVignette>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>`;

      const result = parseXMPContent(xmpContent);

      expect(result.success).toBe(true);
      expect(result.adjustments?.vignette_amount).toBe(-40);
      expect(result.adjustments?.vignette_midpoint).toBe(50);
      expect(result.adjustments?.vignette_feather).toBe(75);
      expect(result.adjustments?.vignette_roundness).toBe(25);
      expect(result.adjustments?.vignette_style).toBe(1);
      expect(result.adjustments?.vignette_highlight_contrast).toBe(30);
    });
  });

  describe('Masks Parsing', () => {
    it('should parse radial mask', () => {
      const xmpContent = `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns/meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:PresetType="Normal"
   crs:Version="17.5"
   crs:HasSettings="True">
   <crs:Name>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">Radial Mask Test</rdf:li>
    </rdf:Alt>
   </crs:Name>
   <crs:MaskGroupBasedCorrections>
    <rdf:Seq>
     <rdf:li>
      <rdf:Description
       crs:What="Correction"
       crs:CorrectionName="Radial Vignette"
       crs:LocalExposure2012="-0.5"
       crs:LocalContrast2012="0.3"
       crs:LocalSaturation="0.2">
      <crs:CorrectionMasks>
       <rdf:Seq>
        <rdf:li
         crs:What="Mask/CircularGradient"
         crs:Top="0.1"
         crs:Left="0.1"
         crs:Bottom="0.9"
         crs:Right="0.9"
         crs:Feather="50"
         crs:Roundness="0"
         crs:MaskInverted="False"/>
       </rdf:Seq>
      </crs:CorrectionMasks>
      </rdf:Description>
     </rdf:li>
    </rdf:Seq>
   </crs:MaskGroupBasedCorrections>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>`;

      const result = parseXMPContent(xmpContent);

      expect(result.success).toBe(true);
      expect(result.metadata?.hasMasks).toBe(true);
      expect(result.adjustments?.masks).toBeDefined();
      expect(Array.isArray(result.adjustments?.masks)).toBe(true);
      expect(result.adjustments?.masks).toHaveLength(1);

      const mask = result.adjustments?.masks?.[0];
      expect(mask?.name).toBe('Radial Vignette');
      expect(mask?.type).toBe('radial');
      expect(mask?.adjustments?.local_exposure).toBe(-0.5);
      expect(mask?.adjustments?.local_contrast).toBe(0.3);
      expect(mask?.adjustments?.local_saturation).toBe(0.2);
      expect(mask?.top).toBe(0.1);
      expect(mask?.left).toBe(0.1);
      expect(mask?.bottom).toBe(0.9);
      expect(mask?.right).toBe(0.9);
      expect(mask?.feather).toBe(50);
      expect(mask?.roundness).toBe(0);
      expect(mask?.inverted).toBe(false);
    });

    it('should parse AI subject mask', () => {
      const xmpContent = `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns/meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:PresetType="Normal"
   crs:Version="17.5"
   crs:HasSettings="True">
   <crs:Name>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">Subject Mask Test</rdf:li>
    </rdf:Alt>
   </crs:Name>
   <crs:MaskGroupBasedCorrections>
    <rdf:Seq>
     <rdf:li>
      <rdf:Description
       crs:What="Correction"
       crs:CorrectionName="Person Enhancement"
       crs:LocalExposure2012="0.3"
       crs:LocalContrast2012="0.2"
       crs:LocalClarity2012="0.4">
      <crs:CorrectionMasks>
       <rdf:Seq>
        <rdf:li
         crs:What="Mask/Image"
         crs:MaskSubType="1"
         crs:MaskSubCategoryID="6"
         crs:ReferenceX="0.5"
         crs:ReferenceY="0.3"/>
       </rdf:Seq>
      </crs:CorrectionMasks>
      </rdf:Description>
     </rdf:li>
    </rdf:Seq>
   </crs:MaskGroupBasedCorrections>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>`;

      const result = parseXMPContent(xmpContent);

      expect(result.success).toBe(true);
      expect(result.metadata?.hasMasks).toBe(true);
      expect(result.adjustments?.masks).toBeDefined();
      expect(Array.isArray(result.adjustments?.masks)).toBe(true);
      expect(result.adjustments?.masks).toHaveLength(1);

      const mask = result.adjustments?.masks?.[0];
      expect(mask?.name).toBe('Person Enhancement');
      expect(mask?.type).toBe('subject'); // Parser returns 'subject' for MaskSubType="1"
      expect(mask?.adjustments?.local_exposure).toBe(0.3);
      expect(mask?.adjustments?.local_contrast).toBe(0.2);
      expect(mask?.adjustments?.local_clarity).toBe(0.4);
      expect(mask?.referenceX).toBe(0.5);
      expect(mask?.referenceY).toBe(0.3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed numeric values', () => {
      const xmpContent = `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns/meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:PresetType="Normal"
   crs:Version="17.5"
   crs:HasSettings="True">
   <crs:Name>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">Malformed Test</rdf:li>
    </rdf:Alt>
   </crs:Name>
   <crs:Exposure2012>invalid</crs:Exposure2012>
   <crs:Contrast2012>25.5</crs:Contrast2012>
   <crs:Highlights2012></crs:Highlights2012>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>`;

      const result = parseXMPContent(xmpContent);

      expect(result.success).toBe(true);
      expect(result.adjustments?.exposure).toBeUndefined(); // Invalid value should be ignored
      expect(result.adjustments?.contrast).toBe(25.5); // Valid value should be parsed
      expect(result.adjustments?.highlights).toBeUndefined(); // Empty value should be ignored
    });

    it('should handle missing optional elements', () => {
      const xmpContent = `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns/meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:PresetType="Normal"
   crs:Version="17.5"
   crs:HasSettings="True">
   <crs:Name>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">Minimal Test</rdf:li>
    </rdf:Alt>
   </crs:Name>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>`;

      const result = parseXMPContent(xmpContent);

      expect(result.success).toBe(true);
      expect(result.adjustments?.preset_name).toBe('Minimal Test');
      expect(result.metadata?.hasHSL).toBe(false);
      expect(result.metadata?.hasColorGrading).toBe(false);
      expect(result.metadata?.hasCurves).toBe(false);
      expect(result.metadata?.hasMasks).toBe(false);
    });

    it('should handle very large XMP content', () => {
      // Create a large XMP with many adjustments
      const largeAdjustments = Array.from({ length: 100 }, (_, i) => 
        `   <crs:CustomAdjustment${i}>${i * 0.1}</crs:CustomAdjustment${i}>`
      ).join('\n');

      const xmpContent = `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns/meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:PresetType="Normal"
   crs:Version="17.5"
   crs:HasSettings="True">
   <crs:Name>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">Large Test</rdf:li>
    </rdf:Alt>
   </crs:Name>
${largeAdjustments}
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>`;

      const result = parseXMPContent(xmpContent);

      expect(result.success).toBe(true);
      expect(result.adjustments?.preset_name).toBe('Large Test');
    });
  });
});
