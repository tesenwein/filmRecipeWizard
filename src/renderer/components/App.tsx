import React, { useEffect, useRef, useState } from 'react';
import {
  Recipe,
  ProcessingResult,
  StyleOptions,
  LightroomProfile,
} from '../../shared/types';
import { AlertProvider } from '../context/AlertContext';
import { useAppStore } from '../store/appStore';
import AppHeader from './AppHeader';
import Router from './Router';

const App: React.FC = () => {
  // Zustand store
  const {
    currentProcessId,
    setCurrentProcessId,
    processingState,
    setProcessingState,
    addRecipe,
    updateRecipeInStorage,
    setGeneratingStatus,
  } = useAppStore();

  // Simple hash-based router with query support
  const parseHash = () => {
    const raw = (typeof window !== 'undefined' ? window.location.hash : '') || '#/splash';
    const path = raw.replace(/^#/, '');
    const [route, queryStr = ''] = path.split('?');
    const query = Object.fromEntries(new URLSearchParams(queryStr));
    return { route: route || '/splash', query } as { route: string; query: Record<string, string> };
  };
  const initialHash = parseHash();
  const [route, setRoute] = useState<string>(initialHash.route);
  const [routeQuery, setRouteQuery] = useState<Record<string, string>>(initialHash.query);

  const [baseImages, setBaseImages] = useState<string[]>([]);
  const [targetImages, setTargetImages] = useState<string[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [currentStep, setCurrentStep] = useState<'gallery' | 'upload' | 'processing' | 'results'>(
    'gallery'
  );
  const currentProcessIdRef = useRef<string | null>(null);
  const startingRef = useRef<boolean>(false);
  useEffect(() => {
    currentProcessIdRef.current = currentProcessId;
  }, [currentProcessId]);
  const targetImagesRef = useRef<string[]>([]);
  useEffect(() => {
    targetImagesRef.current = targetImages;
  }, [targetImages]);
  const [startupStatus, setStartupStatus] = useState<{
    status: string;
    progress: number;
  }>({ status: 'Loading...', progress: 0 });
  const [styleOptions, setStyleOptions] = useState<StyleOptions>({
    lightroomProfile: LightroomProfile.ADOBE_COLOR // Default to Adobe Color as specified
  });

  // Force start at splash, then redirect based on setup completion (run only once)
  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      // Always force start at splash
      if (window.location.hash !== '#/splash') {
        window.location.hash = '#/splash';
        return;
      }

      try {
        setStartupStatus({ status: 'Loading settings...', progress: 20 });
        const res = await window.electronAPI.getSettings();
        if (!mounted) return;

        const setupCompleted = !!(res.success && res.settings && res.settings.setupCompleted);
        const hasKey = !!(res.success && res.settings && res.settings.openaiKey);
        const wizardNeeded = !setupCompleted || !hasKey;

        setStartupStatus({ status: 'Loading recipes...', progress: 60 });
        const { loadRecipes } = useAppStore.getState();
        await loadRecipes();
        if (!mounted) return;

        setStartupStatus({ status: 'Finalizing...', progress: 90 });
        setTimeout(() => {
          if (!mounted) return;
          window.location.hash = wizardNeeded ? '#/setup' : '#/gallery';
        }, 300);
      } catch {
        if (!mounted) return;
        // On error, prefer wizard to help user configure
        window.location.hash = '#/setup';
      }
    };
    boot();

    // Safety timeout to prevent getting stuck on splash
    const safetyTimeout = setTimeout(async () => {
      if (mounted && window.location.hash === '#/splash') {
        try {
          const res = await window.electronAPI.getSettings();
          const setupCompleted = !!(res.success && res.settings && res.settings.setupCompleted);
          const hasKey = !!(res.success && res.settings && res.settings.openaiKey);
          const wizardNeeded = !setupCompleted || !hasKey;
          window.location.hash = wizardNeeded ? '#/setup' : '#/gallery';
        } catch {
          window.location.hash = '#/setup';
        }
      }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
    };
  }, []); // Remove route dependency to prevent endless loop

  // No settings dialog anymore; routing controls settings page

  const handleImagesSelected = (bases: string[], targets: string[]) => {
    setBaseImages(bases.slice(0, 3));
    setTargetImages(targets.slice(0, 3));
    setResults([]);
  };

  const handleStartProcessing = async () => {
    // Prevent concurrent runs and require at least one target image
    if (startingRef.current || processingState.isProcessing || targetImages.length === 0) return;
    startingRef.current = true;

    // Save process to storage (converts to base64 and persists only base64 + results)
    let newProcessId: string | null = null;
    let returnedBase64: { base?: string | null; targets?: string[] } = {};
    try {
      const processData = {
        baseImages: baseImages.length ? baseImages.slice(0, 3) : undefined,
        targetImages,
        results: [],
        prompt: prompt && prompt.trim() ? prompt.trim() : undefined,
        userOptions: styleOptions,
      } as any;

      // Call electronAPI directly to get the base64 data for processing
      const result = await window.electronAPI.saveProcess(processData);
      if (result.success) {
        newProcessId = result.process.id;
        setCurrentProcessId(newProcessId);
        currentProcessIdRef.current = newProcessId;
        // Update the store with the newly created process without re-saving
        addRecipe(result.process);
        // Mark as generating in gallery
        if (newProcessId) {
          try {
            setGeneratingStatus(newProcessId, true);
          } catch {
            // Ignore status update errors
          }
        }
        // Use the single recipe image (first reference) for processing only
        returnedBase64.base = result?.process?.recipeImageData
          ? [result.process.recipeImageData]
          : (null as any);
        // Use ephemeral target base64 data returned by save-process (not persisted)
        returnedBase64.targets = Array.isArray((result as any)?.targetImageData)
          ? (result as any).targetImageData
          : [];
      } else {
        console.warn('[APP] Failed to save process', result.error);
        startingRef.current = false;
        return;
      }
    } catch {
      console.error('Failed to save process:', error);
      startingRef.current = false;
      return;
    }

    setCurrentStep('processing');
    setProcessingState({
      isProcessing: true,
      progress: 0,
      status: 'Starting AI analysis...',
    });

    // Kick off processing using stored base64 data
    if (newProcessId) {
      window.electronAPI.processWithStoredImages({
        processId: newProcessId,
        targetIndex: 0,
        baseImageData: (returnedBase64.base || undefined) as any,
        targetImageData: returnedBase64.targets || undefined,
        prompt: prompt && prompt.trim() ? prompt.trim() : undefined,
        styleOptions: styleOptions,
      });
    }
  };

  const handleProcessingUpdate = (progress: number, status: string) => {
    setProcessingState({
      isProcessing: processingState.isProcessing,
      progress,
      status,
    });
  };

  const handleProcessingComplete = async (processingResults: any[]) => {
    startingRef.current = false;
    // Convert the results to include inputPath for proper storage
    const inputs = targetImagesRef.current || [];
    const results: ProcessingResult[] = processingResults.map((result, index) => ({
      inputPath: inputs[index],
      outputPath: result.outputPath,
      success: result.success,
      error: result.error,
      metadata: result.metadata,
    }));

    setResults(results);
    setProcessingState({
      isProcessing: false,
      progress: 100,
      status: 'Processing complete!',
    });

    // Update process in storage
    const pid = currentProcessIdRef.current;
    if (pid) {
      try {
        const anySuccess = results.some(r => r.success);
        await updateRecipeInStorage(pid, {
          results,
          status: anySuccess ? 'completed' : 'failed',
        } as any);
      } catch {
        console.error('Failed to update process:', error);
      }
    }

    setCurrentStep('results');
  };

  const handleReset = () => {
    setBaseImages([]);
    setTargetImages([]);
    setResults([]);
    setCurrentProcessId(null);
    setCurrentStep('upload');
    setPrompt('');
    setStyleOptions({});
    setProcessingState({
      isProcessing: false,
      progress: 0,
      status: '',
    });
    // Do not mutate recipe status on reset; completion handler will update store
  };

  const handleNewProcess = () => {
    handleReset();
  };

  const handleOpenRecipe = async (recipe: Recipe) => {
    setProcessingState({ isProcessing: false, progress: 0, status: '' });
    // Do not rely on legacy file paths in stored recipe
    setBaseImages([]);
    setTargetImages([]);
    setCurrentProcessId(recipe.id);
    try {
      if (recipe.id) {
        const res = await window.electronAPI.getProcess(recipe.id);
        if (
          res?.success &&
          res.process &&
          Array.isArray(res.process.results) &&
          res.process.results.length > 0
        ) {
          setResults(res.process.results);
        } else {
          setResults(recipe.results || []);
        }
      } else {
        setResults(recipe.results || []);
      }
    } finally {
      setCurrentStep('results');
      navigate(`/recipedetails?id=${recipe.id}`);
    }
  };

  // Set up IPC listeners when component mounts
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      // Listen for processing updates
      const onProgress = (progress: number, status: string) => {
        handleProcessingUpdate(progress, status);
      };
      window.electronAPI.onProcessingProgress?.(onProgress);

      // Listen for processing completion
      const onComplete = (results: ProcessingResult[]) => {
        handleProcessingComplete(results);
      };
      window.electronAPI.onProcessingComplete?.(onComplete);

      // Listen for background process updates (e.g., status flip to completed)
      const onProcessUpdated = async (payload: { processId: string; updates: any }) => {
        try {
          if (!payload?.processId) return;
          // Fetch the latest process to ensure canonical data
          const res = await window.electronAPI.getProcess(payload.processId);
          if (res?.success && res.process) {
            const full = res.process as Recipe;
            try {
              const { updateRecipe, setGeneratingStatus } = useAppStore.getState();
              updateRecipe(full.id, full as any);
              // If status changed away from generating, clear flag
              if ((full as any).status && (full as any).status !== 'generating') {
                setGeneratingStatus(full.id, false);
              }
            } catch {
              // Ignore cleanup errors
            }
          }
        } catch {
          // Swallow background update errors silently
        }
      };
      window.electronAPI.onProcessUpdated?.(onProcessUpdated);

      // Cleanup to avoid duplicate listeners (dev StrictMode mounts twice)
      return () => {
        try {
          window.electronAPI.removeAllListeners?.('processing-progress');
          window.electronAPI.removeAllListeners?.('processing-complete');
          window.electronAPI.removeAllListeners?.('process-updated');
        } catch {
          // no-op
        }
      };
    }
  }, []);

  // Listen to hash changes for routing
  useEffect(() => {
    const onHashChange = () => {
      const h = parseHash();
      setRoute(h.route);
      setRouteQuery(h.query);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Enable file drag-and-drop across the app without navigating away
  useEffect(() => {
    const preventDefault = (e: DragEvent) => {
      e.preventDefault();
      // Improve UX: indicate copy action when dragging files
      try {
        if (e.type === 'dragover' && e.dataTransfer) {
          e.dataTransfer.dropEffect = 'copy';
        }
      } catch {
        // Ignore dataTransfer errors
      }
    };
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);
    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);

  // When navigating to create, default to upload step if nothing selected
  useEffect(() => {
    if (route === '/create' && !processingState.isProcessing && currentStep === 'gallery') {
      setCurrentStep('upload');
    }
  }, [route, processingState.isProcessing, currentStep]);

  // Restore recipe when landing directly on recipe details (e.g., after refresh)
  useEffect(() => {
    const restore = async () => {
      if (route === '/recipedetails') {
        const id = routeQuery?.id;
        if (id) {
          try {
            const res = await window.electronAPI.getProcess(id);
            if (res?.success && res.process) {
              setBaseImages([]);
              setTargetImages([]);
              setResults(Array.isArray(res.process.results) ? res.process.results : []);
              setCurrentProcessId(res.process.id);
              setCurrentStep('results');
            }
          } catch (e) {
            console.warn('Failed to restore recipe from hash:', e);
          }
        }
      }
    };
    restore();
  }, [route, routeQuery]);

  const navigate = (to: string) => {
    window.location.hash = to.startsWith('#') ? to : `#${to}`;
  };


  return (
    <AlertProvider>
      <div className={`container ${currentStep}`}>
        {/* Global drag strip at very top so window can always be moved (even over modals) */}
        <div className="global-drag-strip" />
        {/* Scroll fade-out effect overlay */}
        <div className="scroll-fade-overlay" />

        {route !== '/splash' && route !== '/setup' && <AppHeader onNavigate={navigate} />}

        <Router
          route={route}
          routeQuery={routeQuery}
          startupStatus={startupStatus}
          currentStep={currentStep}
          currentProcessId={currentProcessId}
          baseImages={baseImages}
          targetImages={targetImages}
          prompt={prompt}
          results={results}
          styleOptions={styleOptions}
          processingState={processingState}
          onOpenRecipe={handleOpenRecipe}
          onNewProcess={handleNewProcess}
          onImagesSelected={handleImagesSelected}
          onStartProcessing={handleStartProcessing}
          onPromptChange={setPrompt}
          onStyleOptionsChange={u => setStyleOptions(prev => ({ ...prev, ...u }))}
          onReset={handleReset}
          onRestart={() => {
            setCurrentStep('processing');
            handleStartProcessing();
          }}
          onNavigate={navigate}
        />
      </div>
    </AlertProvider>
  );
};

export default App;
