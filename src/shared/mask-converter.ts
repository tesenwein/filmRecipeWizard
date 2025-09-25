/**
 * Simple mask conversion utilities
 * Converts complex recipe format to simple mask array
 */

export interface SimpleMask {
  name: string;
  type: string;
  adjustments: Record<string, number>;
  geometry?: {
    referenceX?: number;
    referenceY?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Convert recipe format to simple mask array
 * Handles both base masks and mask overrides
 */
// Generate a descriptive name based on mask type
function generateMaskName(type: string, index: number): string {
  const typeNames: Record<string, string> = {
    'face_skin': 'Face Skin',
    'iris_pupil': 'Eye Pop',
    'eye_whites': 'Eye Whites',
    'eyebrows': 'Eyebrows',
    'lips': 'Lips',
    'teeth': 'Teeth',
    'hair': 'Hair',
    'clothing': 'Clothing',
    'body_skin': 'Body Skin',
    'sky': 'Sky',
    'vegetation': 'Vegetation',
    'water': 'Water',
    'architecture': 'Architecture',
    'natural_ground': 'Ground',
    'artificial_ground': 'Ground',
    'mountains': 'Mountains',
    'background': 'Background',
    'subject': 'Subject',
    'person': 'Person',
    'radial': 'Radial Mask',
    'linear': 'Linear Mask',
    'brush': 'Brush Mask',
    'range_color': 'Color Range',
    'range_luminance': 'Luminance Range'
  };
  
  return typeNames[type] || `Mask ${index + 1}`;
}

export function convertRecipeToMasks(recipeData: any): SimpleMask[] {
  const masks: SimpleMask[] = [];
  
  // New format only: expect masks directly on the adjustments object
  const baseMasks = recipeData.masks || [];
  for (const mask of baseMasks) {
    // Flatten geometry values to top level
    const flattenedMask = {
      name: mask.name || generateMaskName(mask.type || 'subject', masks.length),
      type: mask.type || 'subject',
      adjustments: mask.adjustments || {},
      ...mask
    };
    
    // Flatten geometry values to top level
    if (mask.geometry) {
      Object.assign(flattenedMask, mask.geometry);
    }
    
    masks.push(flattenedMask);
  }
  
  // Apply mask overrides
  // New format only: expect overrides directly alongside masks
  const overrides = recipeData.maskOverrides || [];
  for (const override of overrides) {
    const operation = override.op || 'add';
    
    if (operation === 'remove_all' || operation === 'clear') {
      masks.length = 0;
      continue;
    }
    
    if (operation === 'remove') {
      // Remove by name or id
      const nameToRemove = override.name || override.id;
      if (nameToRemove) {
        // Handle "name:" prefix in id
        const cleanName = nameToRemove.startsWith('name:') ? nameToRemove.substring(5) : nameToRemove;
        const index = masks.findIndex(m => m.name === cleanName || m.name === nameToRemove || m.id === nameToRemove);
        if (index >= 0) {
          masks.splice(index, 1);
        }
      }
      continue;
    }
    
    if (operation === 'update') {
      // Update existing mask
      const nameToUpdate = override.name || override.id;
      if (nameToUpdate) {
        const index = masks.findIndex(m => m.name === nameToUpdate || m.id === nameToUpdate);
        if (index >= 0) {
          const updatedMask = {
            ...masks[index],
            ...override,
            adjustments: { ...masks[index].adjustments, ...(override.adjustments || {}) }
          };
          // Flatten geometry values to top level
          if (override.geometry) {
            Object.assign(updatedMask, override.geometry);
          }
          masks[index] = updatedMask;
        } else {
          // Add if not found
          const newMask = {
            name: override.name || generateMaskName(override.type || 'subject', masks.length),
            type: override.type || 'subject',
            adjustments: override.adjustments || {},
            ...override
          };
          // Flatten geometry values to top level
          if (override.geometry) {
            Object.assign(newMask, override.geometry);
          }
          masks.push(newMask);
        }
      }
      continue;
    }
    
    // Default: add
    const newMask = {
      name: override.name || generateMaskName(override.type || 'subject', masks.length),
      type: override.type || 'subject',
      adjustments: override.adjustments || {},
      ...override
    };
    // Flatten geometry values to top level
    if (override.geometry) {
      Object.assign(newMask, override.geometry);
    }
    masks.push(newMask);
  }
  
  return masks;
}
