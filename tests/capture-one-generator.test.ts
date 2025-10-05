import { generateCaptureOneStyle } from '../src/main/capture-one-generator';
import { AIColorAdjustments } from '../src/services/types';

describe('Capture One Generator', () => {
  describe('Basic Capture One Style Generation', () => {
    it('should generate valid Capture One style with minimal adjustments', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Test Style',
        description: 'A test Capture One style',
        confidence: 0.8,
        treatment: 'color',
        camera_profile: 'Adobe Color',
      };

      const include = {
        basic: true,
        hsl: false,
        colorGrading: false,
        grain: false,
        vignette: false,
        masks: false,
      };

      const result = generateCaptureOneStyle(adjustments, include);

      expect(result).toContain('<?xml version="1.0"?>');
      expect(result).toContain('<SL Engine="1300">');
      expect(result).toContain('<E K="Name" V="Test Style" />');
      expect(result).toContain('<E K="UUID"');
      expect(result).not.toContain('<E K="FilmCurve"');
      expect(result).not.toContain('<E K="ICCProfile"');
      expect(result).toContain('<E K="ColorBalanceShadow" V="1;1;1" />');
      expect(result).toContain('<E K="ColorBalanceMidtone" V="1;1;1" />');
      expect(result).toContain('<E K="ColorBalanceHighlight" V="1;1;1" />');
      expect(result).toContain('<E K="ColorCorrections"');
      expect(result).toContain('<LDS>');
    });

    it('should include basic adjustments when enabled', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Basic Style',
        description: 'Basic adjustments only',
        confidence: 0.9,
        treatment: 'color',
        camera_profile: 'Adobe Color',
        exposure: 0.5,
        contrast: 15,
        highlights: -20,
        shadows: 25,
        whites: 10,
        blacks: -15,
        clarity: 5,
        vibrance: 10,
        saturation: 5,
      };

      const include = {
        basic: true,
        hsl: false,
        colorGrading: false,
        grain: false,
        vignette: false,
        masks: false,
      };

      const result = generateCaptureOneStyle(adjustments, include);

      expect(result).toContain('<E K="Exposure" V="0.500000" />');
      expect(result).toContain('<E K="Contrast" V="15" />');
      expect(result).toContain('<E K="HighlightRecoveryEx" V="20" />'); // Inverted
      expect(result).toContain('<E K="ShadowRecovery" V="25" />');
      expect(result).toContain('<E K="WhiteRecovery" V="10" />');
      expect(result).toContain('<E K="BlackRecovery" V="-15" />');
      expect(result).toContain('<E K="Saturation" V="5" />');
    });

    it('should include color grading when enabled', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Color Grading Style',
        description: 'Color grading included',
        confidence: 0.9,
        treatment: 'color',
        camera_profile: 'Adobe Color',
        color_grade_shadow_hue: 200,
        color_grade_shadow_sat: 15,
        color_grade_midtone_hue: 180,
        color_grade_midtone_sat: 20,
        color_grade_highlight_hue: 160,
        color_grade_highlight_sat: 25,
      };

      const include = {
        basic: true,
        hsl: false,
        colorGrading: true,
        grain: false,
        vignette: false,
        masks: false,
      };

      const result = generateCaptureOneStyle(adjustments, include);

      expect(result).toContain('<E K="ColorBalanceShadow"');
      expect(result).toContain('<E K="ColorBalanceMidtone"');
      expect(result).toContain('<E K="ColorBalanceHighlight"');
    });

    it('should include grain when enabled', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Grain Style',
        description: 'Film grain included',
        confidence: 0.8,
        treatment: 'color',
        camera_profile: 'Adobe Color',
        grain_amount: 25,
      };

      const include = {
        basic: true,
        hsl: false,
        colorGrading: false,
        grain: true,
        vignette: false,
        masks: false,
      };

      const result = generateCaptureOneStyle(adjustments, include);

      expect(result).toContain('<E K="FilmGrainAmount" V="25" />');
    });

    it('masks are not supported in Capture One generator', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Mask Style',
        description: 'Masks not supported',
        confidence: 0.8,
        treatment: 'color',
        camera_profile: 'Adobe Color',
        masks: [
          {
            type: 'radial',
            name: 'Test Radial Mask',
            top: 0.2,
            left: 0.3,
            bottom: 0.8,
            right: 0.7,
            angle: 45,
            midpoint: 50,
            roundness: 0,
            feather: 75,
            inverted: false,
            adjustments: {
              local_exposure: 0.5,
              local_contrast: 20,
              local_highlights: -15,
              local_shadows: 25,
            },
          },
        ],
      };

      const include = {
        basic: true,
        hsl: false,
        colorGrading: false,
        grain: false,
        vignette: false,
        masks: true,
      };

      const result = generateCaptureOneStyle(adjustments, include);

      // Masks are not supported - should have empty LDS block
      expect(result).toContain('<LDS>');
      expect(result).toContain('</LDS>');
      expect(result).not.toContain('<LD>');
    });

    it('should escape special characters in text content', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Style with "quotes" & <tags>',
        description: 'Description with "quotes" & <special> chars',
        confidence: 0.8,
        treatment: 'color',
        camera_profile: 'Adobe Color',
      };

      const include = {
        basic: true,
        hsl: false,
        colorGrading: false,
        grain: false,
        vignette: false,
        masks: false,
      };

      const result = generateCaptureOneStyle(adjustments, include);

      // XML special characters should be escaped
      expect(result).toContain('Style with &quot;quotes&quot; &amp; &lt;tags&gt;');
    });
  });

  describe('Basic Capture One Style Generation', () => {
    it('should generate basic style with only basic adjustments', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Basic Test Style',
        description: 'A basic Capture One style',
        confidence: 0.8,
        treatment: 'color',
        camera_profile: 'Adobe Color',
        exposure: 0.3,
        contrast: 10,
        highlights: -15,
        shadows: 20,
        whites: 5,
        blacks: -10,
        clarity: 8,
        vibrance: 12,
        saturation: 3,
      };

      const include = {
        basic: true,
        hsl: false,
        colorGrading: false,
        grain: false,
        vignette: false,
        masks: false,
      };

      const result = generateCaptureOneStyle(adjustments, include);

      expect(result).toContain('<?xml version="1.0"?>');
      expect(result).toContain('<SL Engine="1300">');
      expect(result).toContain('<E K="Name" V="Basic Test Style" />');
      expect(result).toContain('<E K="Exposure" V="0.300000" />');
      expect(result).toContain('<E K="Contrast" V="10" />');
      expect(result).toContain('<E K="HighlightRecoveryEx" V="15" />');
      expect(result).toContain('<E K="ShadowRecovery" V="20" />');
      expect(result).toContain('<E K="WhiteRecovery" V="5" />');
      expect(result).toContain('<E K="BlackRecovery" V="-10" />');
      expect(result).toContain('<E K="Saturation" V="3" />');

      // Default sections should be present with neutral values
      expect(result).toContain('<E K="ColorBalanceShadow" V="1;1;1" />');
      expect(result).toContain('<E K="ColorCorrections"');
      expect(result).toContain('<LDS>');
    });

    it('should handle missing adjustments gracefully', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Minimal Style',
        description: 'Minimal adjustments',
        confidence: 0.8,
        treatment: 'color',
        camera_profile: 'Adobe Color',
      };

      const include = {
        basic: true,
        hsl: false,
        colorGrading: false,
        grain: false,
        vignette: false,
        masks: false,
      };

      const result = generateCaptureOneStyle(adjustments, include);

      expect(result).toContain('<?xml version="1.0"?>');
      expect(result).toContain('<SL Engine="1300">');
      expect(result).toContain('<E K="Name" V="Minimal Style" />');
      expect(result).toContain('<E K="UUID"');
      expect(result).not.toContain('<E K="FilmCurve"');
      expect(result).not.toContain('<E K="ICCProfile"');
    });

    it('includes camera references only when explicitly provided', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Override Style',
        treatment: 'color',
        camera_profile: 'Adobe Color',
      };

      const include = {
        basic: true,
        hsl: false,
        colorGrading: false,
        grain: false,
        vignette: false,
        masks: false,
        captureOne: {
          iccProfile: 'LeicaSL2-ProStandard.icm',
          filmCurve: 'LeicaSL2-Auto.fcrv',
        },
      };

      const result = generateCaptureOneStyle(adjustments, include);

      expect(result).toContain('<E K="FilmCurve" V="LeicaSL2-Auto.fcrv" />');
      expect(result).toContain('<E K="ICCProfile" V="LeicaSL2-ProStandard.icm" />');
    });
  });

  describe('Value Clamping and Validation', () => {
    it('should clamp exposure values correctly', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Clamp Test',
        description: 'Testing value clamping',
        confidence: 0.8,
        treatment: 'color',
        camera_profile: 'Adobe Color',
        exposure: 10, // Should be clamped to 5
        contrast: 200, // Should be clamped to 100
        highlights: -200, // Should be clamped to -100
        shadows: 300, // Should be clamped to 100
      };

      const include = {
        basic: true,
        hsl: false,
        colorGrading: false,
        grain: false,
        vignette: false,
        masks: false,
      };

      const result = generateCaptureOneStyle(adjustments, include);

      expect(result).toContain('<E K="Exposure" V="5" />');
      expect(result).toContain('<E K="Contrast" V="100" />');
      expect(result).toContain('<E K="HighlightRecoveryEx" V="100" />');
      expect(result).toContain('<E K="ShadowRecovery" V="100" />');
    });

    it('should handle invalid numeric values', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Invalid Values Test',
        description: 'Testing invalid values',
        confidence: 0.8,
        treatment: 'color',
        camera_profile: 'Adobe Color',
        exposure: NaN,
        contrast: Infinity,
        highlights: -Infinity,
        shadows: null as any,
        whites: undefined,
      };

      const include = {
        basic: true,
        hsl: false,
        colorGrading: false,
        grain: false,
        vignette: false,
        masks: false,
      };

      const result = generateCaptureOneStyle(adjustments, include);

      // Should fall back to safe defaults and never emit invalid tokens
      expect(result).toContain('<E K="Exposure" V="0" />');
      expect(result).not.toContain('NaN');
      expect(result).not.toContain('Infinity');
    });
  });

  describe('Color Editor (HSL) Support', () => {
    it('should generate ColorCorrections with HSL adjustments', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'HSL Test',
        treatment: 'color',
        camera_profile: 'Adobe Color',
        hue_red: -10,
        sat_red: -5,
        lum_red: 6,
        hue_orange: 5,
        sat_orange: 10,
        lum_orange: -3,
        hue_blue: -15,
        sat_blue: 20,
        lum_blue: -8,
      };

      const include = {
        basic: true,
        hsl: true,
        colorGrading: false,
        grain: false,
        vignette: false,
        masks: false,
      };

      const result = generateCaptureOneStyle(adjustments, include);

      // Should contain ColorCorrections field
      expect(result).toContain('<E K="ColorCorrections"');

      // ColorCorrections should have 9 zones separated by semicolons
      const colorCorrectionsMatch = result.match(/<E K="ColorCorrections" V="([^"]+)"/);
      expect(colorCorrectionsMatch).toBeTruthy();

      if (colorCorrectionsMatch) {
        const zones = colorCorrectionsMatch[1].split(';');
        expect(zones.length).toBe(9); // 9 color zones

        // Each zone should have 18 parameters
        zones.forEach((zone, index) => {
          const params = zone.split(',');
          expect(params.length).toBe(18);

          // First param is enabled flag (1 for zones with adjustments, 0 for rainbow)
          if (index < 8) {
            expect(params[0]).toBe('1'); // Color zones should be enabled
          } else {
            expect(params[0]).toBe('0'); // Rainbow zone should be disabled
          }
        });
      }
    });

    it('should generate proper RGB encoding for color zones', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Color Zone Test',
        treatment: 'color',
        hue_red: 10,
        sat_red: 5,
        lum_red: -5,
      };

      const include = {
        basic: true,
        hsl: true,
        colorGrading: false,
        grain: false,
        vignette: false,
        masks: false,
      };

      const result = generateCaptureOneStyle(adjustments, include);

      // Should have ColorCorrections with proper values
      expect(result).toContain('<E K="ColorCorrections"');

      const colorCorrectionsMatch = result.match(/<E K="ColorCorrections" V="([^"]+)"/);
      if (colorCorrectionsMatch) {
        const zones = colorCorrectionsMatch[1].split(';');
        const redZone = zones[0].split(',');

        // Red zone: enabled,1,1,H,S,L,R,G,B,...
        expect(redZone[0]).toBe('1'); // enabled
        expect(redZone[3]).toBe('10'); // hue
        expect(redZone[4]).toBe('5'); // saturation
        expect(redZone[5]).toBe('-5'); // luminance
        expect(redZone[6]).toBe('255'); // Red channel should be 255 for red color
      }
    });
  });

  describe('XML Structure Validation', () => {
    it('should generate well-formed XML', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'XML Test',
        description: 'Testing XML structure',
        confidence: 0.8,
        treatment: 'color',
        camera_profile: 'Adobe Color',
        exposure: 0.5,
        contrast: 15,
      };

      const include = {
        basic: true,
        hsl: false,
        colorGrading: false,
        grain: false,
        vignette: false,
        masks: false,
      };

      const result = generateCaptureOneStyle(adjustments, include);

      // Check XML declaration
      expect(result).toMatch(/^<\?xml version="1\.0"\?>/);

      // Check root element
      expect(result).toContain('<SL Engine="1300">');
      expect(result).toContain('</SL>');

      // Check that all opening tags have closing tags
      const slTags = result.match(/<SL[^>]*>/g) || [];
      const closeTags = result.match(/<\/SL>/g) || [];
      expect(slTags.length).toBe(closeTags.length);
    });
  });
});
