import BugReportIcon from '@mui/icons-material/BugReport';
import GitHubIcon from '@mui/icons-material/Code';
import HomeIcon from '@mui/icons-material/Home';
import SettingsIcon from '@mui/icons-material/Settings';
import { Dialog, DialogContent, DialogTitle, IconButton, Tooltip } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import IconSvg from '../../../assets/icons/icon.svg';
import {
  ProcessHistory,
  ProcessingResult,
  StyleOptions,
} from '../../shared/types';
import { AlertProvider } from '../context/AlertContext';
import { useAppStore } from '../store/appStore';
import ColorMatchingStudio from './ColorMatchingStudio';
import HistoryView from './HistoryView';
import ProcessingView from './ProcessingView';
import ResultsView from './ResultsView';
import Settings from './Settings';
import SetupWizard from './SetupWizard';

const App: React.FC = () => {
  // Zustand store
  const {
    setupWizardOpen,
    setSetupWizardOpen,
    setSetupCompleted,
    loadSettings,
    currentProcessId,
    setCurrentProcessId,
    processingState,
    setProcessingState,
    saveRecipe,
    updateRecipeInStorage
  } = useAppStore();

  // Simple hash-based router with query support
  const parseHash = () => {
    const raw = (typeof window !== 'undefined' ? window.location.hash : '') || '#/home';
    const path = raw.replace(/^#/, '');
    const [route, queryStr = ''] = path.split('?');
    const query = Object.fromEntries(new URLSearchParams(queryStr));
    return { route: route || '/home', query } as { route: string; query: Record<string, string> };
  };
  const initialHash = parseHash();
  const [route, setRoute] = useState<string>(initialHash.route);
  const [routeQuery, setRouteQuery] = useState<Record<string, string>>(initialHash.query);

  const [baseImages, setBaseImages] = useState<string[]>([]);
  const [targetImages, setTargetImages] = useState<string[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [currentStep, setCurrentStep] = useState<'history' | 'upload' | 'processing' | 'results'>(
    'history'
  );
  const currentProcessIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentProcessIdRef.current = currentProcessId;
  }, [currentProcessId]);
  const targetImagesRef = useRef<string[]>([]);
  useEffect(() => {
    targetImagesRef.current = targetImages;
  }, [targetImages]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [styleOptions, setStyleOptions] = useState<StyleOptions>({});

  // Load settings on startup
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Listen for close settings event
  useEffect(() => {
    const handleCloseSettings = () => {
      setSettingsOpen(false);
    };
    window.addEventListener('close-settings', handleCloseSettings);
    return () => window.removeEventListener('close-settings', handleCloseSettings);
  }, []);

  const handleImagesSelected = (bases: string[], targets: string[]) => {
    setBaseImages(bases.slice(0, 3));
    setTargetImages(targets.slice(0, 3));
    setResults([]);
  };

  const handleStartProcessing = async () => {
    // Allow processing as long as there are target images; base/prompt optional
    if (targetImages.length === 0) return;

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
        // Update the store separately
        await saveRecipe(processData);
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
      }
    } catch (error) {
      console.error('Failed to save process:', error);
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
        await updateRecipeInStorage(pid, {
          results,
        });
      } catch (error) {
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
  };

  const handleNewProcess = () => {
    handleReset();
  };

  const handleOpenRecipe = async (process: ProcessHistory) => {
    setProcessingState({ isProcessing: false, progress: 0, status: '' });
    // Do not rely on legacy file paths in stored recipe
    setBaseImages([]);
    setTargetImages([]);
    setCurrentProcessId(process.id);
    try {
      if (process.id) {
        const res = await window.electronAPI.getProcess(process.id);
        if (
          res?.success &&
          res.process &&
          Array.isArray(res.process.results) &&
          res.process.results.length > 0
        ) {
          setResults(res.process.results);
        } else {
          setResults(process.results || []);
        }
      } else {
        setResults(process.results || []);
      }
    } finally {
      setCurrentStep('results');
      navigate(`/recipedetails?id=${process.id}`);
    }
  };

  // Set up IPC listeners when component mounts
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      // Listen for processing updates
      window.electronAPI.onProcessingProgress?.((progress: number, status: string) => {
        handleProcessingUpdate(progress, status);
      });

      // Listen for processing completion
      window.electronAPI.onProcessingComplete?.((results: ProcessingResult[]) => {
        handleProcessingComplete(results);
      });
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

  // When navigating to create, default to upload step if nothing selected
  useEffect(() => {
    if (route === '/create' && !processingState.isProcessing && currentStep === 'history') {
      setCurrentStep('upload');
    }
  }, [route]);

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

  const handleSetupComplete = () => {
    // Close the wizard via store
    setSetupWizardOpen(false);
    // Mark setup as completed in store to avoid any re-open race conditions
    setSetupCompleted(true);

    // Navigate to create page
    setTimeout(() => {
      window.location.hash = '#/create';
    }, 100);
  };

  const Header = (
    <header style={{ position: 'sticky', top: 8, zIndex: 50, marginBottom: '16px' }}>
      <div className="drag-region" />
      <div
        style={{
          WebkitAppRegion: 'drag',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.3)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: 12,
          padding: '12px 16px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src={IconSvg} alt="Foto Recipe Wizard" style={{ width: 28, height: 28 }} />
          <span style={{ fontSize: 20, fontWeight: 800, color: '#1F2937' }}>
            Foto Recipe Wizard
          </span>
        </div>
        <div className="no-drag">
          <Tooltip title="Home">
            <IconButton
              color="inherit"
              size="small"
              onClick={() => navigate('/home')}
              sx={{
                mr: 1,
                color: 'action.active',
                '&:hover': { backgroundColor: 'rgba(17,24,39,0.1)' },
              }}
            >
              <HomeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="GitHub Repository">
            <IconButton
              color="inherit"
              size="small"
              onClick={() =>
                window.electronAPI.openExternal('https://github.com/tesenwein/fotoRecipeWizard')
              }
              sx={{
                mr: 1,
                color: 'action.active',
                '&:hover': { backgroundColor: 'rgba(17,24,39,0.1)' },
              }}
            >
              <GitHubIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Report Issues">
            <IconButton
              color="inherit"
              size="small"
              onClick={() =>
                window.electronAPI.openExternal(
                  'https://github.com/tesenwein/fotoRecipeWizard/issues'
                )
              }
              sx={{
                mr: 1,
                color: 'action.active',
                '&:hover': { backgroundColor: 'rgba(17,24,39,0.1)' },
              }}
            >
              <BugReportIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton
              color="inherit"
              size="small"
              onClick={() => setSettingsOpen(true)}
              sx={{ color: 'action.active', '&:hover': { backgroundColor: 'rgba(17,24,39,0.1)' } }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
      </div>
    </header>
  );

  return (
    <AlertProvider>
      <div className={`container ${currentStep}`}>
      {/* Global drag strip at very top so window can always be moved (even over modals) */}
      <div className="global-drag-strip" />
      {/* Scroll fade-out effect overlay */}
      <div className="scroll-fade-overlay" />
      {Header}
      {route === '/home' && (
        <div className="fade-in">
          <HistoryView
            onOpenRecipe={process => {
              handleOpenRecipe(process);
            }}
            onNewProcess={() => {
              handleNewProcess();
              navigate('/create');
            }}
          />
        </div>
      )}

      {route === '/create' && (
        <div>
          {currentStep === 'upload' && (
            <div className="fade-in">
              <ColorMatchingStudio
                onImagesSelected={handleImagesSelected}
                onStartProcessing={handleStartProcessing}
                baseImages={baseImages}
                targetImages={targetImages}
                prompt={prompt}
                onPromptChange={setPrompt}
                styleOptions={styleOptions}
                onStyleOptionsChange={u => setStyleOptions(prev => ({ ...prev, ...u }))}
              />
            </div>
          )}
          {currentStep === 'processing' && (
            <div className="fade-in">
              <ProcessingView
                processingState={processingState}
                baseImage={baseImages[0] || null}
                targetImages={targetImages}
                prompt={prompt}
              />
            </div>
          )}
          {currentStep === 'results' && (
            <div className="fade-in">
              <ResultsView
                results={results}
                baseImage={baseImages[0] || null}
                targetImages={targetImages}
                prompt={prompt}
                processId={currentProcessId || undefined}
                onReset={() => {
                  handleReset();
                  navigate('/home');
                }}
                onRestart={() => {
                  setCurrentStep('processing');
                  handleStartProcessing();
                }}
              />
            </div>
          )}
        </div>
      )}

      {route === '/recipedetails' && (
        <div className="fade-in">
          {currentProcessId && (
            <ResultsView
              results={results}
              baseImage={baseImages[0] || null}
              targetImages={targetImages}
              prompt={prompt}
              processId={currentProcessId || undefined}
              onReset={() => {
                handleReset();
                navigate('/home');
              }}
              onRestart={() => {
                setCurrentStep('processing');
                handleStartProcessing();
              }}
            />
          )}
          {!currentProcessId && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>No project selected</div>
              <div style={{ color: '#6b7280' }}>Choose one from Home → Your Projects.</div>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        fullWidth
        maxWidth="sm"
        disablePortal
        disableScrollLock
        slotProps={{
          paper: { className: 'no-drag', sx: { WebkitAppRegion: 'no-drag' } },
          backdrop: { className: 'no-drag', sx: { WebkitAppRegion: 'no-drag' } },
        }}
      >
        <DialogTitle>Settings</DialogTitle>
        <DialogContent className="no-drag" sx={{ WebkitAppRegion: 'no-drag' }}>
          <div style={{ paddingTop: 8, paddingBottom: 8 }}>
            <Settings />
          </div>
        </DialogContent>
      </Dialog>

      {setupWizardOpen && (
        <SetupWizard open={true} onComplete={handleSetupComplete} />
      )}
      </div>
    </AlertProvider>
  );
};

export default App;
