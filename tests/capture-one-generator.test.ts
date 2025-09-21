import { generateCaptureOneStyle } from '../src/main/capture-one-generator';
import { AIColorAdjustments } from '../src/services/types';

describe('Capture One Generator', () => {
  describe('Basic Style Generation', () => {
    it('should generate valid Capture One style with minimal adjustments', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Test Style',
        description: 'A test style',
        confidence: 0.8,
        treatment: 'color',
        camera_profile: 'Adobe Color',
      };

      const result = generateCaptureOneStyle(adjustments, 'Test Style', 'A test style');

      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<CaptureOneStyle version="1.0">');
      expect(result).toContain('<StyleInfo>');
      expect(result).toContain('<Name>Test Style</Name>');
      expect(result).toContain('<Description>A test style</Description>');
      expect(result).toContain('<Author>Film Recipe Wizard</Author>');
      expect(result).toContain('<Adjustments>');
      expect(result).toContain('</CaptureOneStyle>');
    });

    it('should handle empty adjustments gracefully', () => {
      const adjustments: AIColorAdjustments = {};

      const result = generateCaptureOneStyle(adjustments, 'Empty Style', 'Empty test');

      expect(result).toContain('<CaptureOneStyle version="1.0">');
      expect(result).toContain('<Name>Empty Style</Name>');
      expect(result).toContain('<Adjustments>');
      expect(result).toContain('</Adjustments>');
    });

    it('should escape XML special characters in style name and description', () => {
      const adjustments: AIColorAdjustments = {};

      const result = generateCaptureOneStyle(
        adjustments, 
        'Style with <>&"\' characters', 
        'Description with <>&"\' characters'
      );

      expect(result).toContain('<Name>Style with &lt;&gt;&amp;&quot;&#39; characters</Name>');
      expect(result).toContain('<Description>Description with &lt;&gt;&amp;&quot;&#39; characters</Description>');
    });
  });

  describe('Basic Adjustments', () => {
    it('should include exposure adjustment', () => {
      const adjustments: AIColorAdjustments = {
        exposure: 1.5,
      };

      const result = generateCaptureOneStyle(adjustments, 'Exposure Test', 'Test exposure');

      expect(result).toContain('<Exposure>1.5</Exposure>');
    });

    it('should include contrast adjustment', () => {
      const adjustments: AIColorAdjustments = {
        contrast: 25,
      };

      const result = generateCaptureOneStyle(adjustments, 'Contrast Test', 'Test contrast');

      expect(result).toContain('<Contrast>25</Contrast>');
    });

    it('should include saturation adjustment', () => {
      const adjustments: AIColorAdjustments = {
        saturation: -15,
      };

      const result = generateCaptureOneStyle(adjustments, 'Saturation Test', 'Test saturation');

      expect(result).toContain('<Saturation>-15</Saturation>');
    });

    it('should include vibrance adjustment', () => {
      const adjustments: AIColorAdjustments = {
        vibrance: 20,
      };

      const result = generateCaptureOneStyle(adjustments, 'Vibrance Test', 'Test vibrance');

      expect(result).toContain('<Vibrance>20</Vibrance>');
    });

    it('should clamp exposure values to valid range', () => {
      const adjustments: AIColorAdjustments = {
        exposure: 10, // Should be clamped to 5
      };

      const result = generateCaptureOneStyle(adjustments, 'Clamp Test', 'Test clamping');

      expect(result).toContain('<Exposure>5</Exposure>');
    });

    it('should clamp contrast values to valid range', () => {
      const adjustments: AIColorAdjustments = {
        contrast: 150, // Should be clamped to 100
      };

      const result = generateCaptureOneStyle(adjustments, 'Clamp Test', 'Test clamping');

      expect(result).toContain('<Contrast>100</Contrast>');
    });
  });

  describe('Tone Adjustments', () => {
    it('should include tone mapping adjustments', () => {
      const adjustments: AIColorAdjustments = {
        highlights: -30,
        shadows: 25,
        whites: 10,
        blacks: -15,
      };

      const result = generateCaptureOneStyle(adjustments, 'Tone Test', 'Test tone mapping');

      expect(result).toContain('<ToneMapping>');
      expect(result).toContain('<Highlights>-30</Highlights>');
      expect(result).toContain('<Shadows>25</Shadows>');
      expect(result).toContain('<Whites>10</Whites>');
      expect(result).toContain('<Blacks>-15</Blacks>');
      expect(result).toContain('</ToneMapping>');
    });

    it('should include clarity adjustment', () => {
      const adjustments: AIColorAdjustments = {
        clarity: 15,
      };

      const result = generateCaptureOneStyle(adjustments, 'Clarity Test', 'Test clarity');

      expect(result).toContain('<Clarity>15</Clarity>');
    });
  });

  describe('Color Grading', () => {
    it('should include shadow color grading', () => {
      const adjustments: AIColorAdjustments = {
        color_grade_shadow_hue: 200,
        color_grade_shadow_sat: 25,
        color_grade_shadow_lum: -10,
      };

      const result = generateCaptureOneStyle(adjustments, 'Color Grade Test', 'Test color grading');

      expect(result).toContain('<ColorGrading>');
      expect(result).toContain('<Shadows>');
      expect(result).toContain('<Hue>200</Hue>');
      expect(result).toContain('<Saturation>25</Saturation>');
      expect(result).toContain('<Lightness>-10</Lightness>');
      expect(result).toContain('</Shadows>');
      expect(result).toContain('</ColorGrading>');
    });

    it('should include midtone color grading', () => {
      const adjustments: AIColorAdjustments = {
        color_grade_midtone_hue: 30,
        color_grade_midtone_sat: 15,
        color_grade_midtone_lum: 5,
      };

      const result = generateCaptureOneStyle(adjustments, 'Color Grade Test', 'Test color grading');

      expect(result).toContain('<ColorGrading>');
      expect(result).toContain('<Midtones>');
      expect(result).toContain('<Hue>30</Hue>');
      expect(result).toContain('<Saturation>15</Saturation>');
      expect(result).toContain('<Lightness>5</Lightness>');
      expect(result).toContain('</Midtones>');
      expect(result).toContain('</ColorGrading>');
    });

    it('should include highlight color grading', () => {
      const adjustments: AIColorAdjustments = {
        color_grade_highlight_hue: 60,
        color_grade_highlight_sat: 10,
        color_grade_highlight_lum: 8,
      };

      const result = generateCaptureOneStyle(adjustments, 'Color Grade Test', 'Test color grading');

      expect(result).toContain('<ColorGrading>');
      expect(result).toContain('<Highlights>');
      expect(result).toContain('<Hue>60</Hue>');
      expect(result).toContain('<Saturation>10</Saturation>');
      expect(result).toContain('<Lightness>8</Lightness>');
      expect(result).toContain('</Highlights>');
      expect(result).toContain('</ColorGrading>');
    });

    it('should clamp color grading hue values to 0-360 range', () => {
      const adjustments: AIColorAdjustments = {
        color_grade_shadow_hue: 400, // Should be clamped to 360
      };

      const result = generateCaptureOneStyle(adjustments, 'Clamp Test', 'Test clamping');

      expect(result).toContain('<Hue>360</Hue>');
    });
  });

  describe('HSL Adjustments', () => {
    it('should include HSL adjustments for red', () => {
      const adjustments: AIColorAdjustments = {
        hue_red: 5,
        sat_red: -10,
        lum_red: 3,
      };

      const result = generateCaptureOneStyle(adjustments, 'HSL Test', 'Test HSL');

      expect(result).toContain('<HSL>');
      expect(result).toContain('<Red>');
      expect(result).toContain('<Hue>5</Hue>');
      expect(result).toContain('<Saturation>-10</Saturation>');
      expect(result).toContain('<Lightness>3</Lightness>');
      expect(result).toContain('</Red>');
      expect(result).toContain('</HSL>');
    });

    it('should include HSL adjustments for blue', () => {
      const adjustments: AIColorAdjustments = {
        hue_blue: -8,
        sat_blue: 12,
        lum_blue: -5,
      };

      const result = generateCaptureOneStyle(adjustments, 'HSL Test', 'Test HSL');

      expect(result).toContain('<HSL>');
      expect(result).toContain('<Blue>');
      expect(result).toContain('<Hue>-8</Hue>');
      expect(result).toContain('<Saturation>12</Saturation>');
      expect(result).toContain('<Lightness>-5</Lightness>');
      expect(result).toContain('</Blue>');
      expect(result).toContain('</HSL>');
    });

    it('should include HSL adjustments for all color channels', () => {
      const adjustments: AIColorAdjustments = {
        hue_orange: 2,
        sat_yellow: -5,
        lum_green: 8,
        hue_aqua: -3,
        sat_purple: 15,
        lum_magenta: -2,
      };

      const result = generateCaptureOneStyle(adjustments, 'HSL Test', 'Test HSL');

      expect(result).toContain('<HSL>');
      expect(result).toContain('<Orange>');
      expect(result).toContain('<Yellow>');
      expect(result).toContain('<Green>');
      expect(result).toContain('<Aqua>');
      expect(result).toContain('<Purple>');
      expect(result).toContain('<Magenta>');
      expect(result).toContain('</HSL>');
    });
  });

  describe('Grain Adjustments', () => {
    it('should include grain adjustments', () => {
      const adjustments: AIColorAdjustments = {
        grain_amount: 25,
        grain_size: 15,
        grain_frequency: 20,
      };

      const result = generateCaptureOneStyle(adjustments, 'Grain Test', 'Test grain');

      expect(result).toContain('<Grain>');
      expect(result).toContain('<Amount>25</Amount>');
      expect(result).toContain('<Size>15</Size>');
      expect(result).toContain('<Roughness>20</Roughness>');
      expect(result).toContain('</Grain>');
    });

    it('should clamp grain values to valid range', () => {
      const adjustments: AIColorAdjustments = {
        grain_amount: 150, // Should be clamped to 100
        grain_size: -10,   // Should be clamped to 0
        grain_frequency: 200, // Should be clamped to 100
      };

      const result = generateCaptureOneStyle(adjustments, 'Grain Clamp Test', 'Test grain clamping');

      expect(result).toContain('<Amount>100</Amount>');
      expect(result).toContain('<Size>0</Size>');
      expect(result).toContain('<Roughness>100</Roughness>');
    });
  });

  describe('Vignette Adjustments', () => {
    it('should include vignette adjustments', () => {
      const adjustments: AIColorAdjustments = {
        vignette_amount: -15,
        vignette_midpoint: 50,
        vignette_roundness: 0,
        vignette_feather: 50,
      };

      const result = generateCaptureOneStyle(adjustments, 'Vignette Test', 'Test vignette');

      expect(result).toContain('<Vignette>');
      expect(result).toContain('<Amount>-15</Amount>');
      expect(result).toContain('<Midpoint>50</Midpoint>');
      expect(result).toContain('<Roundness>0</Roundness>');
      expect(result).toContain('<Feather>50</Feather>');
      expect(result).toContain('</Vignette>');
    });

    it('should clamp vignette values to valid range', () => {
      const adjustments: AIColorAdjustments = {
        vignette_amount: -150, // Should be clamped to -100
        vignette_midpoint: 150, // Should be clamped to 100
        vignette_roundness: -150, // Should be clamped to -100
        vignette_feather: -10, // Should be clamped to 0
      };

      const result = generateCaptureOneStyle(adjustments, 'Vignette Clamp Test', 'Test vignette clamping');

      expect(result).toContain('<Amount>-100</Amount>');
      expect(result).toContain('<Midpoint>100</Midpoint>');
      expect(result).toContain('<Roundness>-100</Roundness>');
      expect(result).toContain('<Feather>0</Feather>');
    });
  });

  describe('Complex Style Generation', () => {
    it('should generate complete style with all adjustment types', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Complete Film Style',
        description: 'A complete test style with all adjustments',
        exposure: 0.5,
        contrast: 20,
        saturation: -10,
        vibrance: 15,
        highlights: -20,
        shadows: 15,
        whites: 5,
        blacks: -5,
        clarity: 10,
        color_grade_shadow_hue: 200,
        color_grade_shadow_sat: 20,
        color_grade_shadow_lum: -10,
        color_grade_midtone_hue: 30,
        color_grade_midtone_sat: 15,
        color_grade_midtone_lum: 5,
        color_grade_highlight_hue: 60,
        color_grade_highlight_sat: 10,
        color_grade_highlight_lum: 8,
        hue_red: 5,
        sat_red: -10,
        lum_red: 3,
        hue_blue: -8,
        sat_blue: 12,
        lum_blue: -5,
        grain_amount: 25,
        grain_size: 15,
        grain_frequency: 20,
        vignette_amount: -15,
        vignette_midpoint: 50,
        vignette_roundness: 0,
        vignette_feather: 50,
      };

      const result = generateCaptureOneStyle(adjustments, 'Complete Film Style', 'Complete test');

      // Check all major sections are present
      expect(result).toContain('<StyleInfo>');
      expect(result).toContain('<Adjustments>');
      expect(result).toContain('<Exposure>0.5</Exposure>');
      expect(result).toContain('<Contrast>20</Contrast>');
      expect(result).toContain('<Saturation>-10</Saturation>');
      expect(result).toContain('<Vibrance>15</Vibrance>');
      expect(result).toContain('<ToneMapping>');
      expect(result).toContain('<ColorGrading>');
      expect(result).toContain('<HSL>');
      expect(result).toContain('<Grain>');
      expect(result).toContain('<Vignette>');
      expect(result).toContain('<Clarity>10</Clarity>');
      expect(result).toContain('</Adjustments>');
      expect(result).toContain('</CaptureOneStyle>');
    });

    it('should handle undefined values gracefully', () => {
      const adjustments: AIColorAdjustments = {
        exposure: undefined,
        contrast: 20,
        saturation: undefined,
        vibrance: 15,
      };

      const result = generateCaptureOneStyle(adjustments, 'Undefined Test', 'Test undefined values');

      expect(result).toContain('<Contrast>20</Contrast>');
      expect(result).toContain('<Vibrance>15</Vibrance>');
      expect(result).not.toContain('<Exposure>');
      expect(result).not.toContain('<Saturation>');
    });

    it('should handle NaN and Infinity values gracefully', () => {
      const adjustments: AIColorAdjustments = {
        exposure: NaN,
        contrast: Infinity,
        saturation: -Infinity,
        vibrance: 15,
      };

      const result = generateCaptureOneStyle(adjustments, 'NaN Test', 'Test NaN values');

      expect(result).toContain('<Vibrance>15</Vibrance>');
      expect(result).not.toContain('<Exposure>');
      expect(result).not.toContain('<Contrast>');
      expect(result).not.toContain('<Saturation>');
    });
  });

  describe('Default Values', () => {
    it('should use default style name when not provided', () => {
      const adjustments: AIColorAdjustments = {};

      const result = generateCaptureOneStyle(adjustments, '', '');

      expect(result).toContain('<Name></Name>');
      expect(result).toContain('<Description>Generated by Film Recipe Wizard</Description>');
    });

    it('should use default description when not provided', () => {
      const adjustments: AIColorAdjustments = {};

      const result = generateCaptureOneStyle(adjustments, 'Test Style');

      expect(result).toContain('<Name>Test Style</Name>');
      expect(result).toContain('<Description>Generated by Film Recipe Wizard</Description>');
    });
  });
});
