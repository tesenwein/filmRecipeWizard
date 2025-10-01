import { logError } from '../../shared/error-utils';
import { ProcessingResult } from '../../shared/types';

export interface RecipeModificationUpdates {
  userOptions?: any;
  aiAdjustments?: Record<string, number>;
  prompt?: string;
  description?: string;
  maskOverrides?: any[];
  pendingModifications?: any;
  pendingModificationsUpdatedAt?: string;
  xmpPreset?: string;
  xmpCreatedAt?: string;
  status?: string;
}

export class RecipeModificationService {
  static async applyModifications(
    processId: string,
    modifications: any,
    currentState: {
      processOptions: any;
      processPrompt: string | undefined;
      processDescription: string | undefined;
      adjustmentOverrides: Record<string, number> | undefined;
      maskOverrides: any[] | undefined;
      successfulResults: ProcessingResult[];
      selectedResult: number;
      processName: string | undefined;
    }
  ): Promise<RecipeModificationUpdates> {
    const updates: RecipeModificationUpdates = {};
    
    try {
      // Handle userOptions modifications
      if (modifications.userOptions) {
        const merged = { ...(currentState.processOptions || {}), ...modifications.userOptions };
        updates.userOptions = merged;
      }

      // Handle AI adjustment overrides
      if (modifications.aiAdjustments && typeof modifications.aiAdjustments === 'object') {
        const cur = currentState.adjustmentOverrides || {};
        const merged = { ...cur, ...modifications.aiAdjustments };
        updates.aiAdjustments = merged;
      }

      // Handle prompt changes
      if (typeof modifications.prompt === 'string' && modifications.prompt !== currentState.processPrompt) {
        updates.prompt = modifications.prompt;
      }

      // Handle description changes
      if (typeof modifications.description === 'string' && modifications.description !== currentState.processDescription) {
        updates.description = modifications.description;
      }

      // Handle mask overrides
      const modAny = modifications as any;
      const incomingOps: any[] | undefined = Array.isArray(modAny.maskOverrides)
        ? modAny.maskOverrides
        : Array.isArray(modAny.masks)
          ? modAny.masks
          : undefined;
      
      if (Array.isArray(incomingOps)) {
        updates.maskOverrides = incomingOps;
      }

      // Clear pending modifications
      const clearStamp = new Date().toISOString();
      updates.pendingModifications = null;
      updates.pendingModificationsUpdatedAt = clearStamp;

      // Generate XMP content with updated adjustments
      const current = currentState.successfulResults[currentState.selectedResult];
      const adjustments = this.getEffectiveAdjustments(current, {
        processOptions: currentState.processOptions,
        adjustmentOverrides: currentState.adjustmentOverrides,
        maskOverrides: currentState.maskOverrides,
      });

      if (adjustments) {
        const adjForExport = { ...adjustments } as any;
        if (currentState.processName) adjForExport.preset_name = currentState.processName;
        if (currentState.processDescription) adjForExport.description = currentState.processDescription;

        const gen = await (window.electronAPI as any).generateXmpContent({
          adjustments: adjForExport,
          include: {
            basic: true,
            hsl: true,
            colorGrading: true,
            curves: true,
            pointColor: true,
            grain: true,
            vignette: true,
            masks: true,
            exposure: false,
            sharpenNoise: false,
          },
          recipeName: currentState.processName,
        });

        if (gen?.success && gen?.content) {
          updates.xmpPreset = gen.content;
          updates.xmpCreatedAt = new Date().toISOString();
          updates.status = 'completed';
        }
      }

      return updates;
    } catch (error) {
      logError('RECIPE_SERVICE', 'Failed to apply modifications', error);
      throw error;
    }
  }

  static getEffectiveAdjustments(
    result: ProcessingResult,
    overrides: {
      processOptions?: any;
      adjustmentOverrides?: Record<string, number>;
      maskOverrides?: any[];
    }
  ): any {
    const originalAdjustments = result.metadata?.aiAdjustments;
    if (!originalAdjustments) return null;

    // Start with a copy of the original adjustments
    const effectiveAdjustments: any = { ...originalAdjustments };

    // Apply userOptions modifications if they exist
    if (overrides.processOptions) {
      if (typeof overrides.processOptions.contrast === 'number') {
        effectiveAdjustments.contrast = overrides.processOptions.contrast;
      }
      if (typeof overrides.processOptions.vibrance === 'number') {
        effectiveAdjustments.vibrance = overrides.processOptions.vibrance;
      }
      if (typeof overrides.processOptions.saturationBias === 'number') {
        effectiveAdjustments.saturation = overrides.processOptions.saturationBias;
      }
    }

    // Apply mask overrides if they exist
    if (Array.isArray(overrides.maskOverrides) && overrides.maskOverrides.length > 0) {
      const masks = effectiveAdjustments.masks || [];
      const { applyMaskOverrides } = require('../../shared/mask-utils');
      effectiveAdjustments.masks = applyMaskOverrides(masks, overrides.maskOverrides);
    }

    // Apply global adjustment overrides (e.g., grain, vignette) if present
    if (overrides.adjustmentOverrides && typeof overrides.adjustmentOverrides === 'object') {
      Object.assign(effectiveAdjustments, overrides.adjustmentOverrides);
    }

    return effectiveAdjustments;
  }

  static async updateProcess(processId: string, updates: RecipeModificationUpdates): Promise<void> {
    if (Object.keys(updates).length > 0) {
      await window.electronAPI.updateProcess(processId, updates);
    }
  }
}
