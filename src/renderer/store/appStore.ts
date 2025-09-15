import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { AppSettings, ProcessHistory } from '../../shared/types';

interface AppState {
  // Setup wizard state
  setupWizardOpen: boolean;
  setupCompleted: boolean;

  // Settings
  settings: AppSettings;

  // Recipes state
  recipes: ProcessHistory[];
  recipesLoading: boolean;
  generatingRecipes: Set<string>; // Track which recipes are generating

  // Processing state
  currentProcessId: string | null;
  processingState: {
    isProcessing: boolean;
    progress: number;
    status: string;
  };

  // UI state
  currentRoute: string;

  // Actions
  setSetupWizardOpen: (open: boolean) => void;
  setSetupCompleted: (completed: boolean) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setCurrentRoute: (route: string) => void;

  // Recipe actions
  setRecipes: (recipes: ProcessHistory[]) => void;
  addRecipe: (recipe: ProcessHistory) => void;
  updateRecipe: (id: string, updates: Partial<ProcessHistory>) => void;
  removeRecipe: (id: string) => void;
  setGeneratingStatus: (id: string, isGenerating: boolean) => void;

  // Processing actions
  setCurrentProcessId: (id: string | null) => void;
  setProcessingState: (state: { isProcessing: boolean; progress: number; status: string }) => void;

  // Async actions
  loadSettings: () => Promise<void>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<void>;
  loadRecipes: () => Promise<void>;
  saveRecipe: (recipeData: any) => Promise<{ success: boolean; processId?: string; error?: string }>;
  updateRecipeInStorage: (processId: string, updates: any) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  importRecipes: () => Promise<{ success: boolean; count?: number; error?: string }>;
  exportRecipe: (id: string) => Promise<{ success: boolean; error?: string }>;
  exportAllRecipes: () => Promise<{ success: boolean; count?: number; error?: string }>;
  resetApp: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Initial state
      setupWizardOpen: false,
      setupCompleted: false,
      settings: {},
      recipes: [],
      recipesLoading: false,
      generatingRecipes: new Set(),
      currentProcessId: null,
      processingState: {
        isProcessing: false,
        progress: 0,
        status: '',
      },
      currentRoute: '/home',

      // Sync actions
      setSetupWizardOpen: (open) =>
        set({ setupWizardOpen: open }, false, 'setSetupWizardOpen'),

      setSetupCompleted: (completed) =>
        set({ setupCompleted: completed }, false, 'setSetupCompleted'),

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        }), false, 'updateSettings'),

      setCurrentRoute: (route) =>
        set({ currentRoute: route }, false, 'setCurrentRoute'),

      // Recipe actions
      setRecipes: (recipes) =>
        set({ recipes }, false, 'setRecipes'),

      addRecipe: (recipe) =>
        set((state) => ({
          recipes: [...state.recipes, recipe]
        }), false, 'addRecipe'),

      updateRecipe: (id, updates) =>
        set((state) => ({
          recipes: state.recipes.map(r => r.id === id ? { ...r, ...updates } : r)
        }), false, 'updateRecipe'),

      removeRecipe: (id) =>
        set((state) => {
          const newGenerating = new Set(state.generatingRecipes);
          newGenerating.delete(id);
          return {
            recipes: state.recipes.filter(r => r.id !== id),
            generatingRecipes: newGenerating
          };
        }, false, 'removeRecipe'),

      setGeneratingStatus: (id, isGenerating) =>
        set((state) => {
          const newGenerating = new Set(state.generatingRecipes);
          if (isGenerating) {
            newGenerating.add(id);
          } else {
            newGenerating.delete(id);
          }
          return {
            generatingRecipes: newGenerating,
            recipes: state.recipes.map(r =>
              r.id === id
                ? { ...r, status: isGenerating ? 'generating' : 'completed' }
                : r
            )
          };
        }, false, 'setGeneratingStatus'),

      // Processing actions
      setCurrentProcessId: (id) =>
        set({ currentProcessId: id }, false, 'setCurrentProcessId'),

      setProcessingState: (processingState) =>
        set({ processingState }, false, 'setProcessingState'),

      // Async actions
      loadSettings: async () => {
        try {
          const response = await window.electronAPI.getSettings();
          if (response.success && response.settings) {
            const settings = response.settings;
            set({
              settings,
              setupCompleted: !!settings.setupCompleted,
              // Wizard should only depend on setup completion; once completed, never reopen
              setupWizardOpen: !settings.setupCompleted
            }, false, 'loadSettings');
          } else {
            // No settings found - fresh install
            set({
              settings: {},
              setupCompleted: false,
              setupWizardOpen: true
            }, false, 'loadSettings/noSettings');
          }
        } catch (error) {
          console.error('[STORE] Error loading settings:', error);
          set({
            settings: {},
            setupCompleted: false,
            setupWizardOpen: true
          }, false, 'loadSettings/error');
        }
      },

      saveSettings: async (newSettings) => {
        try {
          const result = await window.electronAPI.updateSettings(newSettings);
          if (result.success) {
            const state = get();
            const updatedSettings = { ...state.settings, ...newSettings };

            // If setup is being completed, close the wizard regardless
            const shouldCloseWizard = newSettings.setupCompleted === true;
            // Keep wizard open until setup is explicitly completed; never reopen after
            const setupWizardOpen = shouldCloseWizard ? false : !updatedSettings.setupCompleted;

            set({
              settings: updatedSettings,
              setupCompleted: !!updatedSettings.setupCompleted,
              setupWizardOpen
            }, false, 'saveSettings/success');
          } else {
            console.error('[STORE] Failed to save settings:', result.error);
            throw new Error(result.error || 'Failed to save settings');
          }
        } catch (error) {
          console.error('[STORE] Error saving settings:', error);
          throw error;
        }
      },

      // Recipe async actions
      loadRecipes: async () => {
        set({ recipesLoading: true }, false, 'loadRecipes/start');
        try {
          const result = await window.electronAPI.loadHistory();
          if (result.success) {
            const recipes = (result.history as ProcessHistory[]) || [];
            const generating = new Set<string>();

            // Track which recipes are generating
            recipes.forEach(recipe => {
              if (recipe.status === 'generating') {
                generating.add(recipe.id);
              }
            });

            set({
              recipes,
              generatingRecipes: generating,
              recipesLoading: false
            }, false, 'loadRecipes/success');

            // Set up polling for generating recipes
            const hasGenerating = generating.size > 0;
            if (hasGenerating) {
              const pollInterval = setInterval(async () => {
                const state = get();
                if (state.generatingRecipes.size === 0) {
                  clearInterval(pollInterval);
                  return;
                }

                try {
                  const pollResult = await window.electronAPI.loadHistory();
                  if (pollResult.success) {
                    const updatedRecipes = (pollResult.history as ProcessHistory[]) || [];
                    const stillGenerating = new Set<string>();

                    updatedRecipes.forEach(recipe => {
                      if (recipe.status === 'generating') {
                        stillGenerating.add(recipe.id);
                      }
                    });

                    set({
                      recipes: updatedRecipes,
                      generatingRecipes: stillGenerating
                    }, false, 'loadRecipes/poll');

                    if (stillGenerating.size === 0) {
                      clearInterval(pollInterval);
                    }
                  }
                } catch (error) {
                  console.error('[STORE] Error polling recipes:', error);
                }
              }, 3000);
            }
          } else {
            set({ recipesLoading: false }, false, 'loadRecipes/error');
          }
        } catch (error) {
          console.error('[STORE] Error loading recipes:', error);
          set({ recipesLoading: false }, false, 'loadRecipes/error');
        }
      },

      saveRecipe: async (recipeData) => {
        try {
          const result = await window.electronAPI.saveProcess(recipeData);
          if (result.success && result.process) {
            const recipe = result.process as ProcessHistory;
            get().addRecipe(recipe);
            return { success: true, processId: recipe.id };
          } else {
            return { success: false, error: result.error || 'Failed to save recipe' };
          }
        } catch (error) {
          console.error('[STORE] Error saving recipe:', error);
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      },

      updateRecipeInStorage: async (processId, updates) => {
        try {
          await window.electronAPI.updateProcess(processId, updates);
          get().updateRecipe(processId, updates);
        } catch (error) {
          console.error('[STORE] Error updating recipe:', error);
          throw error;
        }
      },

      deleteRecipe: async (id) => {
        try {
          await window.electronAPI.deleteProcess(id);
          get().removeRecipe(id);
        } catch (error) {
          console.error('[STORE] Error deleting recipe:', error);
          throw error;
        }
      },

      importRecipes: async () => {
        try {
          const result = await window.electronAPI.importRecipe();
          if (result.success) {
            // Reload recipes after import
            await get().loadRecipes();
          }
          return result;
        } catch (error) {
          console.error('[STORE] Error importing recipes:', error);
          throw error;
        }
      },

      exportRecipe: async (id) => {
        try {
          const result = await window.electronAPI.exportRecipe(id);
          return result;
        } catch (error) {
          console.error('[STORE] Error exporting recipe:', error);
          throw error;
        }
      },

      exportAllRecipes: async () => {
        try {
          const result = await window.electronAPI.exportAllRecipes();
          return result;
        } catch (error) {
          console.error('[STORE] Error exporting all recipes:', error);
          throw error;
        }
      },

      resetApp: async () => {
        try {
          // Fast clear all recipes
          if (window.electronAPI.clearHistory) {
            await window.electronAPI.clearHistory();
          } else {
            // Fallback: iterate deletes if IPC not available
            const historyRes = await window.electronAPI.loadHistory();
            if (historyRes.success && historyRes.history) {
              for (const process of historyRes.history) {
                if (process.id) {
                  await window.electronAPI.deleteProcess(process.id);
                }
              }
            }
          }

          // Reset settings and clear API key
          await window.electronAPI.updateSettings({ setupCompleted: false, openaiKey: '' });

          // Reset entire store to initial state (no hard reload)
          set({
            setupWizardOpen: true,
            setupCompleted: false,
            settings: { setupCompleted: false, openaiKey: '' as any },
            recipes: [],
            recipesLoading: false,
            generatingRecipes: new Set(),
            currentProcessId: null,
            processingState: {
              isProcessing: false,
              progress: 0,
              status: '',
            },
            currentRoute: '/create'
          }, false, 'resetApp');

          // Navigate to Create smoothly
          try {
            window.location.hash = '#/create';
          } catch (error) {
            console.warn('Failed to navigate to create route:', error);
          }

        } catch (error) {
          console.error('[STORE] Error resetting app:', error);
          throw error;
        }
      }
    }),
    {
      name: 'foto-recipe-wizard-store',
    }
  )
);
