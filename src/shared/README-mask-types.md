# Mask Types Configuration

This directory contains the centralized configuration for all Lightroom XMP mask types.

## Files

- `mask-types.ts` - Main configuration file with all mask type mappings

## Usage

### Adding New Mask Types

To add a new mask type, edit `src/shared/mask-types.ts` and add a new entry to the `MASK_TYPE_CONFIGS` array:

```typescript
{
  type: 'new_mask_type',
  subType: '3', // or '0', '1', '2', etc.
  subCategoryId: '123',
  description: 'Description of the new mask type',
  category: 'face' // or 'landscape', 'subject', 'background', 'other'
}
```

### Updating Existing Mask Types

To update an existing mask type, simply modify the corresponding entry in the `MASK_TYPE_CONFIGS` array.

### Using the Configuration

The configuration is automatically used by:

- **XMP Generator** (`src/main/xmp-generator.ts`) - Generates correct XMP with proper MaskSubType and MaskSubCategoryID
- **XMP Parser** (`src/main/xmp-parser.ts`) - Parses XMP back to correct mask types
- **AI Service** (`src/services/ai-streaming-service.ts`) - Validates mask types in AI responses

## Mask Type Categories

### Face Masks (MaskSubType="3")
- `face_skin` - Facial skin
- `iris_pupil` - Iris and pupil
- `eyebrows` - Eyebrows
- `lips` - Lips
- `facial_hair` - Facial hair (beard, mustache)
- `body_skin` - Body skin
- `eye_whites` - Eye whites (sclera)
- `hair` - Hair
- `clothing` - Clothing
- `teeth` - Teeth

### Landscape Masks (MaskSubType="0")
- `background` - General background
- `architecture` - Architecture and buildings
- `mountains` - Mountains and mountain ranges
- `artificial_ground` - Artificial ground (pavement, roads)
- `natural_ground` - Natural ground (dirt, grass)
- `vegetation` - Vegetation and plants
- `sky` - Sky
- `water` - Water bodies

### Subject Masks (MaskSubType="1")
- `subject` - Subject or person
- `person` - Person
- `vehicle` - Vehicle
- `animal` - Animal
- `object` - General object

## Based on Real Examples

The configuration is based on real Lightroom XMP examples:

- **Face masks**: From `exampleXmp/masks.xmp` showing face skin, eye whites, iris/pupil, and teeth
- **Landscape masks**: From `exampleXmp/landscape.xmp` showing architecture, mountains, vegetation, water, natural ground, and sky

## Functions Available

- `getMaskConfig(type)` - Get configuration for a specific mask type
- `getMaskTypeFromXMP(subType, subCategoryId)` - Convert XMP values back to mask type
- `getMaskTypesByCategory(category)` - Get all mask types in a category
- `getAllMaskTypes()` - Get all supported mask type names
- `isMaskTypeSupported(type)` - Check if a mask type is supported
