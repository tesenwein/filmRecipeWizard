import { useCallback, useRef, useState } from 'react';
import { logError } from '../../shared/error-utils';
import { Recipe } from '../../shared/types';

interface ChatModificationsState {
  pendingModifications: any | null;
  pendingUpdatedAt: string | undefined;
  isApplying: boolean;
  error: string | null;
}

interface UseChatModificationsProps {
  processId: string | undefined;
  onRecipeModification: (modifications: Partial<Recipe>) => Promise<void>;
  onAcceptChanges: () => Promise<void>;
  onRejectChanges: () => void;
}

export const useChatModifications = ({
  processId,
  onRecipeModification,
  onAcceptChanges,
  onRejectChanges,
}: UseChatModificationsProps) => {
  const [state, setState] = useState<ChatModificationsState>({
    pendingModifications: null,
    pendingUpdatedAt: undefined,
    isApplying: false,
    error: null,
  });

  // Prevent race where a late process-updated reintroduces pending modifications after Apply
  const suppressPendingRef = useRef(false);
  // Track when we last cleared pending (to ignore older reintroductions)
  const lastClearedPendingAtRef = useRef<string | undefined>(undefined);

  const setPendingModifications = useCallback((modifications: any | null, updatedAt?: string) => {
    setState(prev => ({
      ...prev,
      pendingModifications: modifications,
      pendingUpdatedAt: updatedAt,
      error: null,
    }));
  }, []);

  const handleAcceptModifications = useCallback(async () => {
    if (!state.pendingModifications || !processId) return;

    setState(prev => ({ ...prev, isApplying: true, error: null }));

    try {
      const mods = state.pendingModifications;
      
      // Clear banner immediately for responsive UX
      setPendingModifications(null);
      
      // Persist changes upstream and wait for completion
      await onRecipeModification(mods);
      
      // Fire apply (reprocess) after modifications are fully applied
      await onAcceptChanges();
      
      // Clear suppression flags
      suppressPendingRef.current = false;
      const clearStamp = new Date().toISOString();
      lastClearedPendingAtRef.current = clearStamp;
      
    } catch (error) {
      logError('CHAT', 'Failed to apply modifications', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to apply changes',
      }));
    } finally {
      setState(prev => ({ ...prev, isApplying: false }));
    }
  }, [state.pendingModifications, processId, onRecipeModification, onAcceptChanges, setPendingModifications]);

  const handleRejectModifications = useCallback(() => {
    setPendingModifications(null);
    suppressPendingRef.current = false;
    onRejectChanges();
  }, [setPendingModifications, onRejectChanges]);

  const handleProcessUpdate = useCallback((payload: { processId: string; updates: any }) => {
    if (!processId || payload.processId !== processId) return;
    
    if (payload.updates && Object.prototype.hasOwnProperty.call(payload.updates, 'pendingModifications')) {
      const pend = payload.updates.pendingModifications;
      const pendAt = payload.updates.pendingModificationsUpdatedAt as string | undefined;
      
      // If we recently cleared and this update is older or equal, ignore
      if (pendAt && lastClearedPendingAtRef.current && pendAt <= lastClearedPendingAtRef.current) {
        suppressPendingRef.current = false;
        return;
      }
      
      if (pend && typeof pend === 'object') {
        if (suppressPendingRef.current) {
          // Ignore first re-introduction and clear suppression
          suppressPendingRef.current = false;
          return;
        }
        setPendingModifications(pend, pendAt);
      } else {
        setPendingModifications(null, pendAt);
        suppressPendingRef.current = false;
      }
    }
  }, [processId, setPendingModifications]);

  return {
    ...state,
    setPendingModifications,
    handleAcceptModifications,
    handleRejectModifications,
    handleProcessUpdate,
    suppressPendingRef,
    lastClearedPendingAtRef,
  };
};
