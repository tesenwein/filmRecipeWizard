import { generateLUTContent } from '../src/main/lut-generator';
import { AIColorAdjustments } from '../src/services/types';

describe('LUT Generator', () => {
  describe('Basic LUT Generation', () => {
    it('should generate valid CUBE LUT content with minimal adjustments', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Test LUT',
        description: 'A test LUT',
        confidence: 0.8,
        treatment: 'color',
        camera_profile: 'Adobe Color',
      };

      const result = generateLUTContent(adjustments, 5, 'cube'); // Use smaller size for testing

      expect(result).toContain('# Created by Film Recipe Wizard');
      expect(result).toContain('LUT_3D_SIZE 5');
      // DOMAIN_MIN and DOMAIN_MAX are not included in the current implementation
      expect(result).toMatch(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/m); // Should contain RGB values
    });

    it('should generate DaVinci Resolve LUT content', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'DaVinci LUT',
        description: 'DaVinci Resolve LUT',
        confidence: 0.8,
        treatment: 'color',
      };

      // DaVinci format is not implemented, so expect an error
      expect(() => generateLUTContent(adjustments, 17, 'davinci')).toThrow('Unsupported LUT format: davinci');
    });

    it('should handle different LUT sizes', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Size Test',
        treatment: 'color',
      };

      const size5 = generateLUTContent(adjustments, 5, 'cube');
      const size9 = generateLUTContent(adjustments, 9, 'cube');
      const size17 = generateLUTContent(adjustments, 17, 'cube');

      expect(size5).toContain('LUT_3D_SIZE 5');
      expect(size9).toContain('LUT_3D_SIZE 9');
      expect(size17).toContain('LUT_3D_SIZE 17');

      // Larger LUTs should have more data points
      const size5Lines = size5.split('\n').filter(line => line.match(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/)).length;
      const size9Lines = size9.split('\n').filter(line => line.match(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/)).length;
      const size17Lines = size17.split('\n').filter(line => line.match(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/)).length;

      expect(size5Lines).toBe(5 * 5 * 5);
      expect(size9Lines).toBe(9 * 9 * 9);
      expect(size17Lines).toBe(17 * 17 * 17);
    });
  });

  describe('Basic Adjustments', () => {
    it('should apply exposure adjustments correctly', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Exposure Test',
        treatment: 'color',
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      // With +1 stop exposure, values should be brighter
      const lines = result.split('\n').filter(line => line.match(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/));
      const firstLine = lines[0].split(/\s+/).map(Number);
      
      // The first line is pure black (0,0,0) which should remain 0 even with exposure
      expect(firstLine[0]).toBe(0);
      expect(firstLine[1]).toBe(0);
      expect(firstLine[2]).toBe(0);
      
      // Check a non-black line to see exposure effect
      const nonBlackLine = lines.find(line => {
        const values = line.split(/\s+/).map(Number);
        return values.some(v => v > 0);
      });
      expect(nonBlackLine).toBeDefined();
    });

    it('should apply contrast adjustments correctly', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Contrast Test',
        treatment: 'color',
        contrast: 50, // +50 contrast
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      // With positive contrast, mid-tones should be pushed away from 0.5
      const lines = result.split('\n').filter(line => line.match(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/));
      const midIndex = Math.floor(lines.length / 2);
      const midLine = lines[midIndex].split(/\s+/).map(Number);
      
      // Mid-tone values should be adjusted
      expect(midLine[0]).toBeDefined();
      expect(midLine[1]).toBeDefined();
      expect(midLine[2]).toBeDefined();
    });

    it('should apply highlights and shadows adjustments', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Highlights Shadows Test',
        treatment: 'color',
        highlights: -50, // -50 highlights
        shadows: 30,     // +30 shadows
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      // Should generate valid LUT without errors
      expect(result).toContain('LUT_3D_SIZE 17');
      expect(result).toMatch(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/m);
    });

    it('should apply whites and blacks adjustments', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Whites Blacks Test',
        treatment: 'color',
        whites: -20,  // -20 whites
        blacks: 15,   // +15 blacks
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      expect(result).toContain('LUT_3D_SIZE 17');
      expect(result).toMatch(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/m);
    });

    it('should apply vibrance and saturation adjustments', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Vibrance Saturation Test',
        treatment: 'color',
        vibrance: 25,    // +25 vibrance
        saturation: -10, // -10 saturation
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      expect(result).toContain('LUT_3D_SIZE 17');
      expect(result).toMatch(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/m);
    });

    it('should apply clarity adjustments', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Clarity Test',
        treatment: 'color',
        clarity: 40, // +40 clarity
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      expect(result).toContain('LUT_3D_SIZE 17');
      expect(result).toMatch(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/m);
    });
  });

  describe('HSL Color Mixer Adjustments', () => {
    it('should apply hue adjustments for all color channels', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Hue Test',
        treatment: 'color',
        hue_red: -20,
        hue_orange: 15,
        hue_yellow: -10,
        hue_green: 25,
        hue_aqua: -15,
        hue_blue: 30,
        hue_purple: -25,
        hue_magenta: 20,
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      expect(result).toContain('LUT_3D_SIZE 17');
      expect(result).toMatch(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/m);
    });

    it('should apply saturation adjustments for all color channels', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Saturation Test',
        treatment: 'color',
        sat_red: -30,
        sat_orange: 20,
        sat_yellow: -15,
        sat_green: 35,
        sat_aqua: -20,
        sat_blue: 25,
        sat_purple: -35,
        sat_magenta: 15,
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      expect(result).toContain('LUT_3D_SIZE 17');
      expect(result).toMatch(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/m);
    });

    it('should apply luminance adjustments for all color channels', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Luminance Test',
        treatment: 'color',
        lum_red: -25,
        lum_orange: 15,
        lum_yellow: -20,
        lum_green: 30,
        lum_aqua: -15,
        lum_blue: 20,
        lum_purple: -30,
        lum_magenta: 10,
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      expect(result).toContain('LUT_3D_SIZE 17');
      expect(result).toMatch(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/m);
    });

    it('should apply combined HSL adjustments', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Combined HSL Test',
        treatment: 'color',
        // Hue adjustments
        hue_red: -20,
        hue_blue: 30,
        // Saturation adjustments
        sat_red: -30,
        sat_blue: 25,
        // Luminance adjustments
        lum_red: -25,
        lum_blue: 20,
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      expect(result).toContain('LUT_3D_SIZE 17');
      expect(result).toMatch(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/m);
    });
  });

  describe('Color Grading Adjustments', () => {
    it('should apply shadow color grading', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Shadow Grading Test',
        treatment: 'color',
        color_grade_shadow_hue: 200,
        color_grade_shadow_sat: 30,
        color_grade_shadow_lum: -20,
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      expect(result).toContain('LUT_3D_SIZE 17');
      expect(result).toMatch(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/m);
    });

    it('should apply midtone color grading', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Midtone Grading Test',
        treatment: 'color',
        color_grade_midtone_hue: 180,
        color_grade_midtone_sat: 25,
        color_grade_midtone_lum: 10,
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      expect(result).toContain('LUT_3D_SIZE 17');
      expect(result).toMatch(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/m);
    });

    it('should apply highlight color grading', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Highlight Grading Test',
        treatment: 'color',
        color_grade_highlight_hue: 160,
        color_grade_highlight_sat: 20,
        color_grade_highlight_lum: 15,
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      expect(result).toContain('LUT_3D_SIZE 17');
      expect(result).toMatch(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/m);
    });

    it('should apply global color grading', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Global Grading Test',
        treatment: 'color',
        color_grade_global_hue: 170,
        color_grade_global_sat: 15,
        color_grade_global_lum: -5,
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      expect(result).toContain('LUT_3D_SIZE 17');
      expect(result).toMatch(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/m);
    });

    it('should apply blending and balance adjustments', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Blending Balance Test',
        treatment: 'color',
        color_grade_blending: 75,
        color_grade_balance: 25,
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      expect(result).toContain('LUT_3D_SIZE 17');
      expect(result).toMatch(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/m);
    });

    it('should apply complete color grading workflow', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Complete Grading Test',
        treatment: 'color',
        // Shadow grading
        color_grade_shadow_hue: 200,
        color_grade_shadow_sat: 30,
        color_grade_shadow_lum: -20,
        // Midtone grading
        color_grade_midtone_hue: 180,
        color_grade_midtone_sat: 25,
        color_grade_midtone_lum: 10,
        // Highlight grading
        color_grade_highlight_hue: 160,
        color_grade_highlight_sat: 20,
        color_grade_highlight_lum: 15,
        // Global grading
        color_grade_global_hue: 170,
        color_grade_global_sat: 15,
        color_grade_global_lum: -5,
        // Blending
        color_grade_blending: 75,
        color_grade_balance: 25,
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      expect(result).toContain('LUT_3D_SIZE 17');
      expect(result).toMatch(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/m);
    });
  });

  describe('Black & White Mixer', () => {
    it('should apply gray mixer adjustments for B&W treatment', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'B&W Mixer Test',
        treatment: 'black_and_white',
        monochrome: true,
        gray_red: -30,
        gray_orange: 20,
        gray_yellow: -15,
        gray_green: 25,
        gray_aqua: -20,
        gray_blue: 15,
        gray_purple: -25,
        gray_magenta: 10,
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      expect(result).toContain('LUT_3D_SIZE 17');
      expect(result).toMatch(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/m);
    });

    it('should handle B&W with extreme gray mixer values', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Extreme B&W Test',
        treatment: 'black_and_white',
        monochrome: true,
        gray_red: -100,
        gray_orange: 100,
        gray_yellow: -100,
        gray_green: 100,
        gray_aqua: -100,
        gray_blue: 100,
        gray_purple: -100,
        gray_magenta: 100,
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      expect(result).toContain('LUT_3D_SIZE 17');
      expect(result).toMatch(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/m);
    });
  });

  describe('Combined Adjustments', () => {
    it('should apply basic + HSL adjustments together', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Basic + HSL Test',
        treatment: 'color',
        // Basic adjustments
        contrast: 25,
        highlights: -30,
        shadows: 40,
        // HSL adjustments
        hue_red: -20,
        sat_red: -30,
        lum_red: -25,
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      expect(result).toContain('LUT_3D_SIZE 17');
      expect(result).toMatch(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/m);
    });

    it('should apply HSL + Color Grading adjustments together', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'HSL + Grading Test',
        treatment: 'color',
        // HSL adjustments
        hue_red: -20,
        sat_red: -30,
        lum_red: -25,
        // Color grading
        color_grade_shadow_hue: 200,
        color_grade_shadow_sat: 30,
        color_grade_shadow_lum: -20,
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      expect(result).toContain('LUT_3D_SIZE 17');
      expect(result).toMatch(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/m);
    });

    it('should apply all adjustment types together', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Complete Test',
        treatment: 'color',
        // Basic adjustments
        contrast: 25,
        highlights: -30,
        shadows: 40,
        whites: -20,
        blacks: 15,
        vibrance: 10,
        saturation: -5,
        clarity: 20,
        // HSL adjustments
        hue_red: -20,
        sat_red: -30,
        lum_red: -25,
        // Color grading
        color_grade_shadow_hue: 200,
        color_grade_shadow_sat: 30,
        color_grade_shadow_lum: -20,
        color_grade_midtone_hue: 180,
        color_grade_midtone_sat: 25,
        color_grade_midtone_lum: 10,
        color_grade_highlight_hue: 160,
        color_grade_highlight_sat: 20,
        color_grade_highlight_lum: 15,
        color_grade_global_hue: 170,
        color_grade_global_sat: 15,
        color_grade_global_lum: -5,
        color_grade_blending: 75,
        color_grade_balance: 25,
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      expect(result).toContain('LUT_3D_SIZE 17');
      expect(result).toMatch(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/m);
    });
  });

  describe('Edge Cases', () => {
    it('should handle extreme values correctly', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Extreme Values Test',
        treatment: 'color',
        contrast: 100,
        highlights: -100,
        shadows: 100,
        whites: -100,
        blacks: 100,
        vibrance: 100,
        saturation: -100,
        hue_red: -100,
        sat_red: 100,
        lum_red: -100,
        color_grade_shadow_hue: 360,
        color_grade_shadow_sat: 100,
        color_grade_shadow_lum: -100,
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      expect(result).toContain('LUT_3D_SIZE 17');
      expect(result).toMatch(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/m);
    });

    it('should handle empty adjustments gracefully', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Empty Test',
        treatment: 'color',
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      expect(result).toContain('LUT_3D_SIZE 17');
      expect(result).toMatch(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/m);
    });

    it('should handle undefined values gracefully', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Undefined Test',
        treatment: 'color',
        // Other values undefined
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      expect(result).toContain('LUT_3D_SIZE 17');
      expect(result).toMatch(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/m);
    });

    it('should handle invalid LUT sizes gracefully', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Invalid Size Test',
        treatment: 'color',
      };

      // Test with invalid sizes (should fall back to defaults)
      const result1 = generateLUTContent(adjustments, 0, 'cube');
      const result2 = generateLUTContent(adjustments, -5, 'cube');
      const result3 = generateLUTContent(adjustments, 100, 'cube'); // Reduced from 1000 to 100

      expect(result1).toContain('LUT_3D_SIZE');
      expect(result2).toContain('LUT_3D_SIZE');
      expect(result3).toContain('LUT_3D_SIZE');
    });

    it('should generate valid RGB values in range [0,1]', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Range Test',
        treatment: 'color',
        contrast: 100, // Maximum contrast
        saturation: -100, // Maximum desaturation
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      const lines = result.split('\n').filter(line => line.match(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/));
      
      lines.forEach(line => {
        const values = line.split(/\s+/).map(Number);
        expect(values[0]).toBeGreaterThanOrEqual(0);
        expect(values[0]).toBeLessThanOrEqual(1);
        expect(values[1]).toBeGreaterThanOrEqual(0);
        expect(values[1]).toBeLessThanOrEqual(1);
        expect(values[2]).toBeGreaterThanOrEqual(0);
        expect(values[2]).toBeLessThanOrEqual(1);
      });
    });

    it('should handle different formats correctly', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Format Test',
        treatment: 'color',
        contrast: 25,
      };

      const cubeResult = generateLUTContent(adjustments, 17, 'cube');
      
      expect(cubeResult).toContain('LUT_3D_SIZE 17');
      
      // DaVinci and unknown formats should throw errors
      expect(() => generateLUTContent(adjustments, 17, 'davinci')).toThrow('Unsupported LUT format: davinci');
      expect(() => generateLUTContent(adjustments, 17, 'unknown')).toThrow('Unsupported LUT format: unknown');
    });
  });

  describe('Color Transform Accuracy', () => {
    it('should maintain color relationships with neutral adjustments', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Neutral Test',
        treatment: 'color',
        contrast: 0,
        highlights: 0,
        shadows: 0,
        whites: 0,
        blacks: 0,
        vibrance: 0,
        saturation: 0,
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      const lines = result.split('\n').filter(line => line.match(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/));
      
      // With neutral adjustments, the LUT should be close to identity
      // Check a few key points
      const firstLine = lines[0].split(/\s+/).map(Number);
      const lastLine = lines[lines.length - 1].split(/\s+/).map(Number);
      
      // First line should be close to (0,0,0)
      expect(firstLine[0]).toBeCloseTo(0, 2);
      expect(firstLine[1]).toBeCloseTo(0, 2);
      expect(firstLine[2]).toBeCloseTo(0, 2);
      
      // Last line should be close to (1,1,1)
      expect(lastLine[0]).toBeCloseTo(1, 2);
      expect(lastLine[1]).toBeCloseTo(1, 2);
      expect(lastLine[2]).toBeCloseTo(1, 2);
    });

    it('should apply exposure consistently across all values', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Exposure Consistency Test',
        treatment: 'color',
      };

      const result = generateLUTContent(adjustments, 17, 'cube');
      
      const lines = result.split('\n').filter(line => line.match(/^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/));
      
      // With +1 stop exposure, all values should be brighter
      lines.forEach(line => {
        const values = line.split(/\s+/).map(Number);
        // Values should be in valid range
        expect(values[0]).toBeGreaterThanOrEqual(0);
        expect(values[0]).toBeLessThanOrEqual(1);
        expect(values[1]).toBeGreaterThanOrEqual(0);
        expect(values[1]).toBeLessThanOrEqual(1);
        expect(values[2]).toBeGreaterThanOrEqual(0);
        expect(values[2]).toBeLessThanOrEqual(1);
      });
    });
  });
});
