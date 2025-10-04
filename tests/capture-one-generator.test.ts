import { generateCaptureOneBasicStyle, generateCaptureOneStyle } from '../src/main/capture-one-generator';
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
      expect(result).toContain('<E K="StyleSource" V="Styles" />');
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
      expect(result).toContain('<E K="Contrast" V="15.000000" />');
      expect(result).toContain('<E K="HighlightRecoveryEx" V="20.000000" />'); // Inverted
      expect(result).toContain('<E K="ShadowRecovery" V="25.000000" />');
      expect(result).toContain('<E K="WhiteRecovery" V="10.000000" />');
      expect(result).toContain('<E K="BlackRecovery" V="-15.000000" />');
      expect(result).toContain('<E K="Saturation" V="5.000000" />');
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

      expect(result).toContain('<E K="FilmGrainAmount" V="25.000000" />');
    });

    it('should include masks when enabled', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Mask Style',
        description: 'Masks included',
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

      expect(result).toContain('<LDS>');
      expect(result).toContain('<LD>');
      expect(result).toContain('<LA>');
      expect(result).toContain('<E K="Name" V="Test Radial Mask" />');
      expect(result).toContain('<E K="MaskType" V="2" />'); // Radial
      expect(result).toContain('<E K="Exposure" V="0.500000" />');
      expect(result).toContain('<E K="Contrast" V="20.000000" />');
      expect(result).toContain('<E K="HighlightRecoveryEx" V="15.000000" />');
      expect(result).toContain('<E K="ShadowRecovery" V="25.000000" />');
    });

    it('should handle AI-detected masks correctly', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'AI Mask Style',
        description: 'AI-detected mask included',
        confidence: 0.8,
        treatment: 'color',
        camera_profile: 'Adobe Color',
        masks: [
          {
            type: 'face_skin',
            name: 'Face Mask',
            referenceX: 0.4,
            referenceY: 0.3,
            inverted: false,
            adjustments: {
              local_exposure: 0.2,
              local_saturation: 10,
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

      expect(result).toContain('<E K="Name" V="Face Mask" />');
      expect(result).toContain('<E K="MaskType" V="4" />'); // AI/Subject mask
      expect(result).toContain('<SO>'); // Subject options
      expect(result).toContain('<E K="Face" V="1" />'); // face_skin maps to Face
      expect(result).toContain('<E K="Exposure" V="0.200000" />');
      expect(result).toContain('<E K="Saturation" V="10.000000" />');
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

      const result = generateCaptureOneBasicStyle(adjustments, include);

      expect(result).toContain('<?xml version="1.0"?>');
      expect(result).toContain('<SL Engine="1300">');
      expect(result).toContain('<E K="Name" V="Basic Test Style" />');
      expect(result).toContain('<E K="Exposure" V="0.300000" />');
      expect(result).toContain('<E K="Contrast" V="10.000000" />');
      expect(result).toContain('<E K="HighlightRecoveryEx" V="15.000000" />');
      expect(result).toContain('<E K="ShadowRecovery" V="20.000000" />');
      expect(result).toContain('<E K="WhiteRecovery" V="5.000000" />');
      expect(result).toContain('<E K="BlackRecovery" V="-10.000000" />');
      expect(result).toContain('<E K="Saturation" V="3.000000" />');

      // Should not include advanced features
      expect(result).not.toContain('ColorBalance');
      expect(result).not.toContain('<LDS>');
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

      const result = generateCaptureOneBasicStyle(adjustments, include);

      expect(result).toContain('<?xml version="1.0"?>');
      expect(result).toContain('<SL Engine="1300">');
      expect(result).toContain('<E K="Name" V="Minimal Style" />');
      expect(result).toContain('<E K="UUID"');
      expect(result).toContain('<E K="StyleSource" V="Styles" />');
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

      expect(result).toContain('<E K="Exposure" V="5.000000" />');
      expect(result).toContain('<E K="Contrast" V="100.000000" />');
      expect(result).toContain('<E K="HighlightRecoveryEx" V="100.000000" />');
      expect(result).toContain('<E K="ShadowRecovery" V="100.000000" />');
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

      // Should not include invalid values
      expect(result).not.toContain('<E K="Exposure"');
      expect(result).not.toContain('<E K="Contrast"');
      expect(result).not.toContain('<E K="HighlightRecoveryEx"');
      expect(result).not.toContain('<E K="ShadowRecovery"');
      expect(result).not.toContain('<E K="WhiteRecovery"');
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
