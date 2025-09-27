/**
 * Lightroom XMP Mask Type Configuration
 * 
 * This file contains all the mappings between our internal mask types
 * and Lightroom's MaskSubType and MaskSubCategoryID values.
 * 
 * Based on real Lightroom XMP examples:
 * - Face masks: MaskSubType="3" with various MaskSubCategoryID values
 * - Landscape masks: MaskSubType="0" with 50000+ MaskSubCategoryID values
 */

export interface MaskTypeConfig {
  /** Our internal mask type name */
  type: string;
  /** Lightroom MaskSubType value */
  subType: string;
  /** Lightroom MaskSubCategoryID value */
  subCategoryId: string;
  /** Human-readable description */
  description: string;
  /** Category for grouping */
  category: 'face' | 'landscape' | 'subject' | 'background' | 'other';
}

/**
 * Complete mapping of all supported mask types
 */
export const MASK_TYPE_CONFIGS: MaskTypeConfig[] = [
  // Face/Skin masks (MaskSubType="3")
  // Based on working Lightroom XMP examples from masks.xmp
  {
    type: 'face_skin',
    subType: '3',
    subCategoryId: '2', // Correct value from working masks.xmp
    description: 'Facial skin',
    category: 'face'
  },
  {
    type: 'iris_pupil',
    subType: '3',
    subCategoryId: '3', // Correct value from working masks.xmp
    description: 'Iris and pupil',
    category: 'face'
  },
  {
    type: 'eyebrows',
    subType: '3',
    subCategoryId: '9', // Correct value from working portrait-masks.xmp
    description: 'Eyebrows',
    category: 'face'
  },
  {
    type: 'lips',
    subType: '3',
    subCategoryId: '6', // Correct value from working moremask.xmp
    description: 'Lips',
    category: 'face'
  },
  {
    type: 'facial_hair',
    subType: '3',
    subCategoryId: '13', // Using available ID since '6' is used by lips
    description: 'Facial hair (beard, mustache)',
    category: 'face'
  },
  {
    type: 'body_skin',
    subType: '3',
    subCategoryId: '4',
    description: 'Body skin',
    category: 'face'
  },
  {
    type: 'eye_whites',
    subType: '3',
    subCategoryId: '8', // Correct value from working masks.xmp
    description: 'Eye whites (sclera)',
    category: 'face'
  },
  {
    type: 'hair',
    subType: '3', // Hair should be face type based on working portrait-masks.xmp
    subCategoryId: '5', // Correct value from working portrait-masks.xmp
    description: 'Hair',
    category: 'face'
  },
  {
    type: 'clothing',
    subType: '3', // Clothing should be face type based on working portrait-masks.xmp
    subCategoryId: '11', // Correct value from working portrait-masks.xmp
    description: 'Clothing',
    category: 'face'
  },
  {
    type: 'teeth',
    subType: '3',
    subCategoryId: '12', // Correct value from working masks.xmp
    description: 'Teeth',
    category: 'face'
  },

  // Landscape/Background masks (MaskSubType="0")
  {
    type: 'background',
    subType: '0',
    subCategoryId: '22',
    description: 'General background',
    category: 'background'
  },
  {
    type: 'architecture',
    subType: '0',
    subCategoryId: '50001',
    description: 'Architecture and buildings',
    category: 'landscape'
  },
  {
    type: 'mountains',
    subType: '0',
    subCategoryId: '50002',
    description: 'Mountains and mountain ranges',
    category: 'landscape'
  },
  {
    type: 'artificial_ground',
    subType: '0',
    subCategoryId: '50003',
    description: 'Artificial ground (pavement, roads)',
    category: 'landscape'
  },
  {
    type: 'natural_ground',
    subType: '0',
    subCategoryId: '50004',
    description: 'Natural ground (dirt, grass)',
    category: 'landscape'
  },
  {
    type: 'vegetation',
    subType: '0',
    subCategoryId: '50005',
    description: 'Vegetation and plants',
    category: 'landscape'
  },
  {
    type: 'sky',
    subType: '0', // Correct value from working landscape.xmp
    subCategoryId: '50006',
    description: 'Sky',
    category: 'landscape'
  },
  {
    type: 'water',
    subType: '0',
    subCategoryId: '50007',
    description: 'Water bodies',
    category: 'landscape'
  },

  // Subject/Person masks (MaskSubType="1")
  {
    type: 'subject',
    subType: '1',
    subCategoryId: '0',
    description: 'Subject or person',
    category: 'subject'
  },
  {
    type: 'person',
    subType: '1',
    subCategoryId: '0',
    description: 'Person',
    category: 'subject'
  },

  // Other masks
  {
    type: 'vehicle',
    subType: '1',
    subCategoryId: '',
    description: 'Vehicle',
    category: 'other'
  },
  {
    type: 'animal',
    subType: '1',
    subCategoryId: '',
    description: 'Animal',
    category: 'other'
  },
  {
    type: 'object',
    subType: '1',
    subCategoryId: '',
    description: 'General object',
    category: 'other'
  },
  {
    type: 'radial',
    subType: '1',
    subCategoryId: '',
    description: 'Radial mask',
    category: 'other'
  }
];

/**
 * Create a lookup map for fast access by mask type
 */
export const MASK_TYPE_MAP = new Map<string, MaskTypeConfig>();
MASK_TYPE_CONFIGS.forEach(config => {
  MASK_TYPE_MAP.set(config.type, config);
});

/**
 * Create a reverse lookup map for parsing XMP (subType + subCategoryId -> type)
 */
export const XMP_MASK_TYPE_MAP = new Map<string, string>();
MASK_TYPE_CONFIGS.forEach(config => {
  const key = `${config.subType}:${config.subCategoryId}`;
  XMP_MASK_TYPE_MAP.set(key, config.type);
});

/**
 * Get mask configuration by type
 */
export function getMaskConfig(type: string): MaskTypeConfig | undefined {
  return MASK_TYPE_MAP.get(type);
}

/**
 * Get mask type from XMP subType and subCategoryId
 */
export function getMaskTypeFromXMP(subType: string, subCategoryId: string | null): string {
  const key = `${subType}:${subCategoryId || ''}`;
  return XMP_MASK_TYPE_MAP.get(key) || 'subject';
}

/**
 * Get all mask types by category
 */
export function getMaskTypesByCategory(category: MaskTypeConfig['category']): MaskTypeConfig[] {
  return MASK_TYPE_CONFIGS.filter(config => config.category === category);
}

/**
 * Get all supported mask type names
 */
export function getAllMaskTypes(): string[] {
  return MASK_TYPE_CONFIGS.map(config => config.type);
}

/**
 * Check if a mask type is supported
 */
export function isMaskTypeSupported(type: string): boolean {
  return MASK_TYPE_MAP.has(type);
}

/**
 * Normalize loosely specified mask types to our canonical supported types.
 * Handles common synonyms coming from AI outputs to avoid falling back to generic 'subject'.
 */
export function normalizeMaskType(inputType: string): string {
  if (!inputType) return 'subject';
  const t = String(inputType).toLowerCase().trim();

  // Direct pass-through if already supported
  if (MASK_TYPE_MAP.has(t)) return t;

  // Synonym mapping
  switch (t) {
    case 'face':
    case 'skin':
    case 'facial_skin':
    case 'face skin':
      return 'face_skin';
    case 'eye':
    case 'eyes':
    case 'iris':
    case 'pupil':
      return 'iris_pupil';
    case 'eye_white':
    case 'eye_whites':
    case 'sclera':
      return 'eye_whites';
    case 'teeth':
    case 'tooth':
      return 'teeth';
    case 'hair':
      return 'hair';
    case 'clothing':
      return 'clothing';
    case 'eyebrows':
      return 'eyebrows';
    case 'people':
    case 'person':
      return 'subject';
    case 'landscape':
      // Use background as a safe general scene mask
      return 'background';
    default:
      return MASK_TYPE_MAP.has(t) ? t : 'subject';
  }
}
