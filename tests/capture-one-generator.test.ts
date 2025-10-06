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

    it('should include masks when enabled', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Mask Style',
        description: 'Masks included',
        confidence: 0.8,
        treatment: 'color',
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
              contrast: 0.2,        // 0-1 normalized value
              highlights: -0.15,    // 0-1 normalized value
              shadows: 0.25,        // 0-1 normalized value
              saturation: -0.05,    // 0-1 normalized value
              vibrance: 0.1,        // 0-1 normalized value
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

      // Mask layers should include local adjustment values from recipe data (converted to percentages)
      expect(result).toContain('<E K="Contrast" V="20" />');           // 0.2 * 100
      expect(result).toContain('<E K="HighlightRecoveryEx" V="15" />'); // -(-0.15) * 100, inverted
      expect(result).toContain('<E K="ShadowRecovery" V="25" />');      // 0.25 * 100
      expect(result).toContain('<E K="Saturation" V="-5" />');          // -0.05 * 100
      expect(result).toContain('<E K="Vibrance" V="10" />');            // 0.1 * 100
    });

    it('should handle AI-detected masks correctly', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'AI Mask Style',
        description: 'AI-detected mask included',
        confidence: 0.8,
        treatment: 'color',
        masks: [
          {
            type: 'face_skin',
            name: 'Face Mask',
            referenceX: 0.4,
            referenceY: 0.3,
            inverted: false,
            adjustments: {
              exposure: 0.3,     // 0-1 normalized value
              saturation: 0.1,   // 0-1 normalized value
              clarity: 0.05,     // 0-1 normalized value (not currently mapped, but included in data)
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
      expect(result).toMatch(/<E K="Exposure" V="0\.3[0-9]*" \/>/); // Direct value (no conversion)
      expect(result).toContain('<E K="Saturation" V="10" />'); // 0.1 * 100
    });

    it('should have main adjustment layer plus mask layers', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Multi-Layer Style',
        confidence: 0.8,
        treatment: 'color',
        contrast: 20,
        saturation: 10,
        masks: [
          {
            type: 'face_skin',
            name: 'Face',
            adjustments: { saturation: 0.05 },  // 0-1 normalized value
          },
          {
            type: 'person',
            name: 'Person',
            adjustments: { contrast: 0.1 },     // 0-1 normalized value
          },
        ],
      };

      const include = {
        masks: true,
      };

      const result = generateCaptureOneStyle(adjustments, include);

      // Should have 3 layers total: 1 main + 2 masks (sky is filtered out in real scenarios)
      const ldMatches = result.match(/<LD>/g);
      expect(ldMatches).toHaveLength(3);

      // First layer should be main adjustment layer (MaskType 1) with adjustments
      const firstLayerMatch = result.match(/<LD>\s*<LA>([\s\S]*?)<\/LA>\s*<MD>([\s\S]*?)<\/MD>\s*<\/LD>/);
      expect(firstLayerMatch).toBeTruthy();
      if (firstLayerMatch) {
        expect(firstLayerMatch[1]).toContain('Contrast');
        expect(firstLayerMatch[1]).toContain('Saturation');
        expect(firstLayerMatch[2]).toContain('<E K="MaskType" V="1" />');
      }

      // Should have mask layers for face and person WITH their local adjustments
      expect(result).toContain('<E K="Name" V="Face" />');
      expect(result).toContain('<E K="Name" V="Person" />');

      // Face mask should have saturation: 0.05 -> 5%
      const faceLayerMatch = result.match(/<LD>[\s\S]*?<E K="Name" V="Face"[\s\S]*?<\/LD>/);
      expect(faceLayerMatch).toBeTruthy();
      if (faceLayerMatch) {
        expect(faceLayerMatch[0]).toContain('<E K="Saturation" V="5" />'); // 0.05 * 100
      }

      // Person mask should have contrast: 0.1 -> 10%
      const personLayerMatch = result.match(/<LD>[\s\S]*?<E K="Name" V="Person"[\s\S]*?<\/LD>/);
      expect(personLayerMatch).toBeTruthy();
      if (personLayerMatch) {
        expect(personLayerMatch[0]).toContain('<E K="Contrast" V="10" />'); // 0.1 * 100
      }
    });

    it('generates layered structure with main adjustment layer', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Layered Style',
        description: 'Uses layered architecture',
        confidence: 0.8,
        treatment: 'color',
        contrast: 15,
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

      // Should generate layered structure with main layer (MaskType 1)
      expect(result).toContain('<LDS>');
      expect(result).toContain('<LD>');
      expect(result).toContain('<LA>'); // Layer adjustments
      expect(result).toContain('<MD>'); // Mask definition
      expect(result).toContain('<E K="MaskType" V="1" />'); // Type 1 = global layer
      expect(result).toContain('</LD>');
      expect(result).toContain('</LDS>');

      // Adjustments should be in the layer
      expect(result).toContain('Contrast');
      expect(result).toContain('ColorCorrections');
    });

    it('should escape special characters in text content', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Style with "quotes" & <tags>',
        description: 'Description with "quotes" & <special> chars',
        confidence: 0.8,
        treatment: 'color',
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
    it('should clamp values correctly', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'Clamp Test',
        description: 'Testing value clamping',
        confidence: 0.8,
        treatment: 'color',
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
      expect(result).not.toContain('NaN');
      expect(result).not.toContain('Infinity');
    });
  });

  describe('Color Editor (HSL) Support', () => {
    it('should generate ColorCorrections with HSL adjustments', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'HSL Test',
        treatment: 'color',
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
        hue_orange: -8,
        sat_orange: 12,
        lum_orange: 3,
        hue_blue: -15,
        sat_blue: 20,
        lum_blue: -10,
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
      expect(colorCorrectionsMatch).toBeTruthy();

      if (colorCorrectionsMatch) {
        const zones = colorCorrectionsMatch[1].split(';');
        expect(zones.length).toBe(9);

        // Test Red zone (0°)
        const redZone = zones[0].split(',');
        expect(redZone[0]).toBe('1'); // enabled
        expect(redZone[3]).toBe('10'); // hue
        expect(redZone[4]).toBe('5'); // saturation
        expect(redZone[5]).toBe('-5'); // luminance
        expect(redZone[6]).toBe('255'); // R channel (red = 255)
        expect(redZone[7]).toBe('0'); // G channel (red = 0)
        expect(redZone[8]).toBe('255'); // B channel (red = 255 at 0°)
        expect(redZone[9]).toBe('-10'); // -hue symmetry
        expect(redZone[10]).toBe('10'); // +hue symmetry

        // Test Orange zone (30°)
        const orangeZone = zones[1].split(',');
        expect(orangeZone[0]).toBe('1'); // enabled
        expect(orangeZone[3]).toBe('-8'); // hue
        expect(orangeZone[4]).toBe('12'); // saturation
        expect(orangeZone[5]).toBe('3'); // luminance
        expect(orangeZone[6]).toBe('255'); // R channel (orange has high R)
        expect(orangeZone[7]).toBe('0'); // G channel
        expect(parseFloat(orangeZone[8])).toBeCloseTo(127.5, 1); // B channel (30° = halfway from 255 to 0)

        // Test Blue zone (240°)
        const blueZone = zones[5].split(',');
        expect(blueZone[0]).toBe('1'); // enabled
        expect(blueZone[3]).toBe('-15'); // hue
        expect(blueZone[4]).toBe('20'); // saturation
        expect(blueZone[5]).toBe('-10'); // luminance
        // RGB encoding varies - just check they're numeric
        expect(parseFloat(blueZone[6])).toBeGreaterThanOrEqual(0);
        expect(parseFloat(blueZone[7])).toBeGreaterThanOrEqual(0);
        expect(parseFloat(blueZone[8])).toBeGreaterThanOrEqual(0);

        // Test Rainbow zone (always disabled)
        const rainbowZone = zones[8].split(',');
        expect(rainbowZone[0]).toBe('0'); // disabled
        expect(rainbowZone[3]).toBe('0'); // no adjustments
        expect(rainbowZone[4]).toBe('0');
        expect(rainbowZone[5]).toBe('0');
      }
    });

    it('should validate all 8 color zones are properly enabled and structured', () => {
      const adjustments: AIColorAdjustments = {
        preset_name: 'All Colors Test',
        treatment: 'color',
        hue_red: 1, sat_red: 1, lum_red: 1,
        hue_orange: 2, sat_orange: 2, lum_orange: 2,
        hue_yellow: 3, sat_yellow: 3, lum_yellow: 3,
        hue_green: 4, sat_green: 4, lum_green: 4,
        hue_aqua: 5, sat_aqua: 5, lum_aqua: 5,
        hue_blue: 6, sat_blue: 6, lum_blue: 6,
        hue_purple: 7, sat_purple: 7, lum_purple: 7,
        hue_magenta: 8, sat_magenta: 8, lum_magenta: 8,
      };

      const result = generateCaptureOneStyle(adjustments, { basic: true, hsl: true });
      const colorCorrectionsMatch = result.match(/<E K="ColorCorrections" V="([^"]+)"/);
      expect(colorCorrectionsMatch).toBeTruthy();

      if (colorCorrectionsMatch) {
        const zones = colorCorrectionsMatch[1].split(';');
        expect(zones.length).toBe(9);

        // All 8 color zones should be enabled with their HSL values
        for (let i = 0; i < 8; i++) {
          const zone = zones[i].split(',');
          expect(zone.length).toBe(18); // 18 parameters per zone
          expect(zone[0]).toBe('1'); // enabled
          expect(zone[1]).toBe('1'); // constant
          expect(zone[2]).toBe('1'); // constant
          expect(parseInt(zone[3])).toBe(i + 1); // hue value
          expect(parseInt(zone[4])).toBe(i + 1); // sat value
          expect(parseInt(zone[5])).toBe(i + 1); // lum value
          // RGB encoding (params 6-8) varies by hue angle - just check they're numeric
          expect(parseFloat(zone[6])).toBeGreaterThanOrEqual(0);
          expect(parseFloat(zone[7])).toBeGreaterThanOrEqual(0);
          expect(parseFloat(zone[8])).toBeGreaterThanOrEqual(0);
        }

        // Rainbow zone (index 8) should be disabled
        const rainbowZone = zones[8].split(',');
        expect(rainbowZone[0]).toBe('0');
        expect(rainbowZone[3]).toBe('0'); // no adjustments
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
