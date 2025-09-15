import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { AppSettings, ProcessHistory } from '../../shared/types';

interface AppState {
  // Setup wizard state
  setupWizardOpen: boolean;
  setupCompleted: boolean;

  // Settings
  settings: AppSettings;

  // Recipes (for future use)
  recipes: ProcessHistory[];

  // UI state
  currentRoute: string;

  // Actions
  setSetupWizardOpen: (open: boolean) => void;
  setSetupCompleted: (completed: boolean) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setRecipes: (recipes: ProcessHistory[]) => void;
  addRecipe: (recipe: ProcessHistory) => void;
  removeRecipe: (id: string) => void;
  setCurrentRoute: (route: string) => void;

  // Async actions
  loadSettings: () => Promise<void>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<void>;
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

      setRecipes: (recipes) =>
        set({ recipes }, false, 'setRecipes'),

      addRecipe: (recipe) =>
        set((state) => ({
          recipes: [...state.recipes, recipe]
        }), false, 'addRecipe'),

      removeRecipe: (id) =>
        set((state) => ({
          recipes: state.recipes.filter(r => r.id !== id)
        }), false, 'removeRecipe'),

      setCurrentRoute: (route) =>
        set({ currentRoute: route }, false, 'setCurrentRoute'),

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

      resetApp: async () => {
        try {
          // Clear all recipes
          const historyRes = await window.electronAPI.loadHistory();
          if (historyRes.success && historyRes.history) {
            for (const process of historyRes.history) {
              if (process.id) {
                await window.electronAPI.deleteProcess(process.id);
              }
            }
          }

          // Reset settings
          await window.electronAPI.updateSettings({ setupCompleted: false });

          // Update store state
          set({
            settings: { setupCompleted: false },
            setupCompleted: false,
            setupWizardOpen: true,
            recipes: []
          }, false, 'resetApp');

          // Navigate home without a hard reload for smoother UX
          try {
            window.location.hash = '#/home';
          } catch {
            // Navigation failed, but continue with reset
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
