import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { AppSettings, Recipe } from '../../shared/types';

interface AppState {
  // Setup wizard state
  setupWizardOpen: boolean;
  setupCompleted: boolean;

  // Settings
  settings: AppSettings;

  // Recipes state
  recipes: Recipe[];
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
  pollIntervalId: number | null;

  // Actions
  setSetupWizardOpen: (open: boolean) => void;
  setSetupCompleted: (completed: boolean) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setCurrentRoute: (route: string) => void;

  // Recipe actions
  setRecipes: (recipes: Recipe[]) => void;
  addRecipe: (recipe: Recipe) => void;
  updateRecipe: (id: string, updates: Partial<Recipe>) => void;
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
      currentRoute: '/gallery',
      pollIntervalId: null,

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
        set(() => {
          const generating = new Set<string>();
          recipes.forEach(r => {
            if (r.status === 'generating' && r.id) generating.add(r.id);
          });
          return { recipes, generatingRecipes: generating };
        }, false, 'setRecipes'),

      addRecipe: (recipe) =>
        set((state) => {
          const next: any = { recipes: [...state.recipes, recipe] };
          if (recipe?.status === 'generating' && recipe?.id) {
            const gen = new Set(state.generatingRecipes);
            gen.add(recipe.id);
            next.generatingRecipes = gen;
          }
          return next;
        }, false, 'addRecipe'),

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
              // Open wizard if setup not completed or key missing
              setupWizardOpen: !(settings.setupCompleted && !!settings.openaiKey)
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
            // Keep wizard open until setup completed AND key present
            const setupWizardOpen = shouldCloseWizard
              ? false
              : !(updatedSettings.setupCompleted && !!updatedSettings.openaiKey);

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

      // Simplified loadRecipes for startup loading
      loadRecipes: async () => {
        console.log('[STORE] loadRecipes called');
        try {
          set({ recipesLoading: true }, false, 'loadRecipes/start');
          const result = await window.electronAPI.loadHistory();

          if (result.success) {
            const recipes = (result.recipes as Recipe[]) || [];
            const generating = new Set<string>();
            recipes.forEach(r => {
              if (r.status === 'generating' && r.id) generating.add(r.id);
            });
            set({
              recipes,
              recipesLoading: false,
              generatingRecipes: generating
            }, false, 'loadRecipes/success');
            console.log('[STORE] Loaded', recipes.length, 'recipes');
          } else {
            set({
              recipes: [],
              recipesLoading: false,
              generatingRecipes: new Set()
            }, false, 'loadRecipes/error');
          }
        } catch (error) {
          console.error('[STORE] Error loading recipes:', error);
          set({
            recipes: [],
            recipesLoading: false,
            generatingRecipes: new Set()
          }, false, 'loadRecipes/error');
        }
      },

      saveRecipe: async (recipeData) => {
        try {
          const result = await window.electronAPI.saveProcess(recipeData);
          if (result.success && result.process) {
            const recipe = result.process as Recipe;
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
          // If status flips to completed/failed, ensure generating flag is cleared
          if (updates && (updates as any).status && (updates as any).status !== 'generating') {
            get().setGeneratingStatus(processId, false);
          }
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
            // Manually reload recipes to avoid recursive calls
            const loadResult = await window.electronAPI.loadHistory();
            if (loadResult.success) {
              const recipes = (loadResult.recipes as Recipe[]) || [];
              const generating = new Set<string>();
              recipes.forEach(recipe => {
                if (recipe.status === 'generating') {
                  generating.add(recipe.id);
                }
              });
              set({
                recipes,
                generatingRecipes: generating,
                recipesLoading: false
              }, false, 'importRecipes/reload');
            }
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
          // Stop any active polling interval to prevent leaks
          const prev = get().pollIntervalId;
          if (prev) {
            clearInterval(prev as any);
            set({ pollIntervalId: null }, false, 'resetApp/clearInterval');
          }

          // Fast clear all recipes
          if (window.electronAPI.clearHistory) {
            await window.electronAPI.clearHistory();
          } else {
            // Fallback: iterate deletes if IPC not available
            const recipesRes = await window.electronAPI.loadHistory();
            if (recipesRes.success && recipesRes.recipes) {
              for (const recipe of recipesRes.recipes) {
                if (recipe.id) {
                  await window.electronAPI.deleteProcess(recipe.id);
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
            currentRoute: '/setup',
            pollIntervalId: null
          }, false, 'resetApp');

          // Navigate to Setup smoothly
          try {
            window.location.hash = '#/setup';
          } catch (error) {
            console.warn('Failed to navigate to setup route:', error);
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
