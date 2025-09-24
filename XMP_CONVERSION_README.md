# XMP Conversion Guide

This document explains how Film Recipe Wizard converts AI-generated adjustments into Lightroom-compatible XMP files.

## Overview

The XMP conversion system takes AI-generated color adjustments and mask data and converts them into Adobe Lightroom XMP format. This involves several key transformations:

1. **Basic Tone Adjustments** - Direct mapping with no scaling
2. **Local Mask Adjustments** - Special scaling for exposure values
3. **Tone Curves** - Point-to-point curve generation
4. **Color Grading** - HSL and color wheel adjustments
5. **Camera Profiles** - Special handling for B&W vs Color profiles
6. **Presets** - General Lightroom presets with masks
7. **Profiles** - Camera-specific color profiles

## Key Files

- `src/main/xmp-generator.ts` - Main XMP generation logic
- `src/main/camera-profile-generator.ts` - Camera profile XMP generation
- `src/main/xmp-parser.ts` - XMP parsing and extraction
- `src/shared/mask-converter.ts` - Mask format conversion
- `src/shared/curve-utils.ts` - Tone curve utilities

## Scaling Requirements

### Local Exposure Scaling

**Critical**: `LocalExposure2012` in XMP requires special scaling for Lightroom compatibility.

```typescript
// Lightroom UI shows exposure in stops (±4 EV range)
// XMP values must be divided by 4 to match UI display
// Formula: XMP_value = UI_stops / 4

// Examples:
// AI generates: 0.18 → XMP: 0.045 (0.18 / 4)
// AI generates: 0.28 → XMP: 0.07 (0.28 / 4)
// AI generates: -0.25 → XMP: -0.0625 (-0.25 / 4)
```

### Other Adjustments

Most other adjustments use raw values without scaling:
- `LocalContrast2012` - Raw values
- `LocalHighlights2012` - Raw values  
- `LocalShadows2012` - Raw values
- `LocalClarity2012` - Raw values
- `LocalSaturation` - Raw values

## XMP Structure

### Presets vs Profiles

**Presets** (`crs:PresetType="Normal"`):
- General Lightroom presets that can be applied to any image
- Support masks and local adjustments
- Appear in Lightroom's Presets panel
- Can be used across different camera models

**Profiles** (`crs:PresetType="Look"`):
- Camera-specific color profiles
- Appear in Lightroom's Profile Browser
- Cannot include masks (Lightroom limitation)
- Provide color grading and tone mapping
- B&W profiles have special handling

### Basic Preset Structure

```xml
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
      crs:Version="17.5"
      crs:ProcessVersion="15.4"
      crs:PresetType="Normal"
      crs:HasSettings="True">
      
      <!-- Basic tone adjustments -->
      <crs:Exposure2012>0.5</crs:Exposure2012>
      <crs:Contrast2012>22</crs:Contrast2012>
      <crs:Highlights2012>-24</crs:Highlights2012>
      <crs:Shadows2012>18</crs:Shadows2012>
      
      <!-- Masks (if present) -->
      <crs:MaskGroupBasedCorrections>
        <!-- Mask definitions -->
      </crs:MaskGroupBasedCorrections>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
```

### Camera Profile Structure

Camera profiles use a different structure with `crs:Look` elements:

```xml
<!-- B&W Camera Profile -->
<crs:Look>
  <rdf:Description
    crs:Name="Adobe Monochrome"
    crs:Amount="1"
    crs:SupportsAmount="false"
    crs:SupportsMonochrome="false">
  </rdf:Description>
</crs:Look>
<crs:Treatment>Black &amp; White</crs:Treatment>
<crs:ConvertToGrayscale>True</crs:ConvertToGrayscale>
```

### Profile vs Preset Attributes

**Profile-specific attributes**:
```xml
crs:PresetType="Look"
crs:ProfileName="Adobe Monochrome"
crs:Look="Adobe Monochrome"
crs:SupportsAmount="True"
crs:SupportsAmount2="True"
crs:SupportsColor="True"
crs:SupportsMonochrome="True"
```

**Preset-specific attributes**:
```xml
crs:PresetType="Normal"
crs:SupportsAmount="True"
crs:SupportsAmount2="True"
crs:SupportsColor="True"
crs:SupportsMonochrome="True"
crs:SupportsHighDynamicRange="True"
crs:SupportsNormalDynamicRange="True"
crs:SupportsSceneReferred="True"
crs:SupportsOutputReferred="True"
```

## Mask Types and Conversion

### Supported Mask Types

1. **Radial Masks** - Circular gradient masks
2. **Linear Masks** - Linear gradient masks  
3. **AI Subject Masks** - AI-detected subjects
4. **Face Masks** - Face detection with subcategories
5. **Sky Masks** - Sky detection
6. **Background Masks** - Background detection
7. **Range Masks** - Luminance/color range selection
8. **Brush Masks** - Manual brush strokes

### Mask Geometry

Different mask types require different geometry attributes:

```typescript
// Radial masks
{
  top: 0.1, left: 0.1, bottom: 0.9, right: 0.9,
  feather: 50, roundness: 0
}

// Linear masks  
{
  zeroX: 0.2, zeroY: 0.3, fullX: 0.8, fullY: 0.7,
  angle: 45
}

// AI masks
{
  referenceX: 0.5, referenceY: 0.4,
  subCategoryId: 2  // Face skin
}
```

## AI Schema Ranges

The AI service uses unified schemas with consistent ranges:

```typescript
// Mask adjustments schema
export const maskAdjustmentsSchema = z.object({
  local_exposure: z.number().min(-0.1).max(0.1).optional(),
  local_contrast: z.number().min(-0.1).max(0.1).optional(),
  local_highlights: z.number().min(-0.1).max(0.1).optional(),
  local_shadows: z.number().min(-0.1).max(0.1).optional(),
  local_whites: z.number().min(-0.1).max(0.1).optional(),
  local_blacks: z.number().min(-0.1).max(0.1).optional(),
  local_clarity: z.number().min(-0.1).max(0.1).optional(),
  local_dehaze: z.number().min(-0.1).max(0.1).optional(),
  local_texture: z.number().min(-0.1).max(0.1).optional(),
  local_saturation: z.number().min(-0.1).max(0.1).optional(),
}).partial();
```

## Usage Examples

### Generating Preset XMP

```typescript
import { generateXMPContent } from './src/main/xmp-generator';

const adjustments: AIColorAdjustments = {
  exposure: 0.5,
  contrast: 22,
  highlights: -24,
  shadows: 18,
  masks: [
    {
      name: "Face Balance",
      type: "face_skin",
      adjustments: {
        local_exposure: 0.18,  // Will be scaled to 0.045 in XMP
        local_contrast: 0.08,
        local_clarity: 0.1
      },
      subCategoryId: 3
    }
  ]
};

const xmpContent = generateXMPContent(adjustments, { masks: true });
```

### Generating Camera Profile XMP

```typescript
import { generateCameraProfileXMP } from './src/main/camera-profile-generator';

// Color profile
const colorProfile = generateCameraProfileXMP(
  'Vintage Color Profile',
  {
    exposure: 0.3,
    contrast: 15,
    highlights: -20,
    shadows: 12,
    treatment: 'color',
    camera_profile: 'Adobe Color'
  }
);

// B&W profile
const bwProfile = generateCameraProfileXMP(
  'Classic B&W Profile',
  {
    exposure: 0.2,
    contrast: 25,
    highlights: -30,
    shadows: 15,
    treatment: 'black_and_white',
    camera_profile: 'Adobe Monochrome',
    monochrome: true
  }
);
```

### Profile vs Preset Decision

**Use Presets when**:
- You want to include masks and local adjustments
- The preset should work across different camera models
- You need complex editing capabilities

**Use Profiles when**:
- You want to create a camera-specific color look
- You need to appear in Lightroom's Profile Browser
- You want to provide a base color grading foundation
- You're creating B&W or color-specific looks

### Parsing XMP Content

```typescript
import { parseXMPContent } from './src/main/xmp-parser';

const parsed = parseXMPContent(xmpContent);
console.log(parsed.adjustments);
console.log(parsed.masks);
```

## Common Issues and Solutions

### Issue: Face Balance Values Too High

**Problem**: Face mask exposure values appear too strong in Lightroom.

**Solution**: Ensure `LocalExposure2012` is properly scaled by dividing by 4.

```typescript
// In normalizeLocal function
if (key === 'local_exposure') {
  return val / 4;  // Scale for Lightroom UI
}
```

### Issue: Masks Not Appearing in Lightroom

**Problem**: Generated masks don't show up in Lightroom.

**Solution**: Check mask geometry and ensure proper XMP structure:

1. Verify mask geometry values are within 0-1 range
2. Ensure `crs:MaskGroupBasedCorrections` is properly nested
3. Check that mask types have correct `crs:What` attributes

### Issue: B&W Profiles Not Importing

**Problem**: Black and white camera profiles fail to import.

**Solution**: Ensure proper B&W profile structure:

1. Use `crs:Look` element with `crs:SupportsAmount="false"`
2. Include `crs:ConvertToGrayscale>True</crs:ConvertToGrayscale>`
3. Set `crs:Treatment>Black &amp; White</crs:Treatment>`

### Issue: Profiles Not Showing in Lightroom

**Problem**: Generated profiles don't appear in Lightroom's Profile Browser.

**Solution**: Check profile-specific requirements:

1. **Correct PresetType**: Use `crs:PresetType="Look"` for profiles
2. **Profile Name**: Set `crs:ProfileName` to match the profile name
3. **Look Element**: Include proper `crs:Look` structure
4. **SupportsAmount**: Set to `"True"` for profiles (not "false")
5. **No Masks**: Profiles cannot include masks in Lightroom

### Issue: Presets vs Profiles Confusion

**Problem**: Generated XMP appears in wrong Lightroom location.

**Solution**: Understand the difference:

- **Presets** (`crs:PresetType="Normal"`): Appear in Presets panel, support masks
- **Profiles** (`crs:PresetType="Look"`): Appear in Profile Browser, no masks allowed

### Issue: Profile Amount Slider Not Working

**Problem**: Profile amount slider doesn't appear or doesn't work.

**Solution**: Check profile structure:

1. Ensure `crs:SupportsAmount="True"` (not "false")
2. Include `crs:SupportsAmount2="True"`
3. Verify `crs:Look` element is properly nested
4. Check that profile name matches `crs:ProfileName`

## Testing

Run the test suite to verify XMP generation and parsing:

```bash
npm test
```

Key test files:
- `tests/xmp-generator.test.ts` - Preset XMP generation tests
- `tests/xmp-parser.test.ts` - XMP parsing tests  
- `tests/xmp-integration.test.ts` - Round-trip tests
- `tests/camera-profile-generator.test.ts` - Camera profile tests
- `tests/lut-generator.test.ts` - LUT generation tests

## Debugging

### Enable Debug Logging

```typescript
// In xmp-generator.ts
console.log('Generated XMP:', xmpContent);

// In xmp-parser.ts  
console.log('Parsed adjustments:', parsed.adjustments);
console.log('Parsed masks:', parsed.masks);
```

### Validate XMP Structure

Use Adobe's XMP tools to validate generated XMP:
- XMP Toolkit
- Lightroom's preset import functionality
- Online XMP validators

## Performance Considerations

- **Large XMP files**: Masks add significant size to XMP files
- **Parsing speed**: Complex masks with many points can slow parsing
- **Memory usage**: Tone curves with many points consume more memory

## Future Enhancements

- Support for additional mask types
- Enhanced geometry validation
- Performance optimizations for large files
- Better error handling and validation
- Support for Lightroom's latest XMP features

## Contributing

When modifying XMP generation:

1. **Test thoroughly** - Run all tests after changes
2. **Validate in Lightroom** - Test generated XMP in actual Lightroom
3. **Update documentation** - Keep this README current
4. **Consider backwards compatibility** - Ensure changes don't break existing functionality

## References

- [Adobe XMP Specification](https://www.adobe.com/devnet/xmp.html)
- [Lightroom XMP Documentation](https://helpx.adobe.com/lightroom-classic/help/metadata-basics-lightroom.html)
- [Camera Raw Settings Namespace](https://helpx.adobe.com/camera-raw/using/supported-file-formats.html)
