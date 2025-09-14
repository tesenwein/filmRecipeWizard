import HomeIcon from '@mui/icons-material/Home';
import SettingsIcon from '@mui/icons-material/Settings';
import { Dialog, DialogContent, DialogTitle, IconButton, Tooltip } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import IconSvg from '../../../assets/icons/icon.svg';
import { ProcessHistory, ProcessingResult, ProcessingState } from '../../shared/types';
import ColorMatchingStudio from './ColorMatchingStudio';
import HistoryView from './HistoryView';
import ProcessingView from './ProcessingView';
import ResultsView from './ResultsView';
import Settings from './Settings';

const App: React.FC = () => {
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

  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [targetImages, setTargetImages] = useState<string[]>([]);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    status: '',
  });
  const [prompt, setPrompt] = useState<string>('');
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [currentStep, setCurrentStep] = useState<'history' | 'upload' | 'processing' | 'results'>(
    'history'
  );
  const [currentProcessId, setCurrentProcessId] = useState<string | null>(null);
  const currentProcessIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentProcessIdRef.current = currentProcessId;
  }, [currentProcessId]);
  const targetImagesRef = useRef<string[]>([]);
  useEffect(() => {
    targetImagesRef.current = targetImages;
  }, [targetImages]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isNewProcessingSession, setIsNewProcessingSession] = useState(false);
  const [styleOptions, setStyleOptions] = useState<{
    warmth?: number;
    tint?: number;
    contrast?: number;
    vibrance?: number;
    moodiness?: number;
    saturationBias?: number;
    filmGrain?: boolean;
    vibe?: string;
    artistStyle?: { key: string; name: string; category: string; blurb: string };
  }>({});

  // Check if API key is configured on startup
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const response = await window.electronAPI.getSettings();
        if (
          response.success &&
          (!response.settings?.openaiKey || response.settings?.openaiKey === '')
        ) {
          console.log('[APP] No API key found, opening settings');
          setSettingsOpen(true);
        }
      } catch (error) {
        console.error('[APP] Error checking settings:', error);
        setSettingsOpen(true); // Open settings if there's an error
      }
    };
    checkApiKey();
  }, []);

  const handleImagesSelected = (base: string, targets: string[]) => {
    setBaseImage(base);
    setTargetImages(targets);
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
        baseImage: baseImage || undefined,
        targetImages,
        results: [],
        prompt: prompt && prompt.trim() ? prompt.trim() : undefined,
        userOptions: styleOptions,
      } as any;

      const result = await window.electronAPI.saveProcess(processData);
      if (result.success) {
        newProcessId = result.process.id;
        setCurrentProcessId(newProcessId);
        currentProcessIdRef.current = newProcessId;
        // Capture base64 returned from save-process to pass through to processing
        returnedBase64.base = result?.process?.baseImageData || null;
        returnedBase64.targets = Array.isArray(result?.process?.targetImageData)
          ? result.process.targetImageData
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
        baseImageData: returnedBase64.base || undefined,
        targetImageData: returnedBase64.targets || undefined,
        prompt: prompt && prompt.trim() ? prompt.trim() : undefined,
      });
    }
  };

  const handleProcessingUpdate = (progress: number, status: string) => {
    setProcessingState(prev => ({
      ...prev,
      progress,
      status,
    }));
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
    console.log('[APP] Processing complete', {
      count: results.length,
      success: results.filter(r => r.success).length,
    });
    setProcessingState(prev => ({
      ...prev,
      isProcessing: false,
      progress: 100,
      status: 'Processing complete!',
    }));

    // Update process in storage
    const pid = currentProcessIdRef.current;
    if (pid) {
      try {
        console.log('[APP] Persisting results', { id: pid, count: results.length });
        await window.electronAPI.updateProcess(pid, {
          results,
        });
        console.log('[APP] Results persisted', { id: pid });
      } catch (error) {
        console.error('Failed to update process:', error);
      }
    }

    setCurrentStep('results');

    // Navigate back to recipe details if this was a new processing session
    if (isNewProcessingSession && currentProcessIdRef.current) {
      setIsNewProcessingSession(false);
      navigate(`/recipedetails?id=${currentProcessIdRef.current}`);
    }
  };

  const handleReset = () => {
    setBaseImage(null);
    setTargetImages([]);
    setResults([]);
    setCurrentProcessId(null);
    setCurrentStep('upload');
    setIsNewProcessingSession(false);
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

  const handleNewProcessingSession = async () => {
    // Keep the same images but create a new processing session
    if (targetImages.length === 0) return;

    setResults([]);
    setCurrentProcessId(null);
    setCurrentStep('processing');
    setIsNewProcessingSession(true);
    setProcessingState({
      isProcessing: true,
      progress: 0,
      status: 'Starting new AI analysis...',
    });

    // Save new process to storage
    let newProcessId: string | null = null;
    try {
      const processData = {
        baseImage: baseImage || undefined,
        targetImages,
        results: [],
        prompt: prompt && prompt.trim() ? prompt.trim() : undefined,
        userOptions: styleOptions,
      } as any;

      const result = await window.electronAPI.saveProcess(processData);
      if (result.success) {
        newProcessId = result.process.id;
        setCurrentProcessId(newProcessId);
        currentProcessIdRef.current = newProcessId;
      } else {
        console.warn('[APP] Failed to save new processing session', result.error);
      }
    } catch (error) {
      console.error('Failed to save new processing session:', error);
    }

    // Navigate to create route to show processing view
    navigate('/create');

    // Start processing through IPC
    if (newProcessId) {
      window.electronAPI.processWithStoredImages({
        processId: newProcessId,
        targetIndex: 0,
        prompt: prompt && prompt.trim() ? prompt.trim() : undefined,
      });
    }
  };

  const handleOpenRecipe = async (process: ProcessHistory) => {
    setProcessingState({ isProcessing: false, progress: 0, status: '' });
    // Do not rely on legacy file paths in stored recipe
    setBaseImage(null);
    setTargetImages([]);
    setCurrentProcessId(process.id);
    try {
      if (process.id) {
        console.log('[APP] Open recipe request', {
          id: process.id,
          incomingResults: Array.isArray((process as any).results)
            ? (process as any).results.length
            : 0,
        });
        const res = await window.electronAPI.getProcess(process.id);
        console.log('[APP] getProcess response', {
          id: process.id,
          success: res?.success,
          resultsCount: Array.isArray(res?.process?.results) ? res?.process?.results.length : 0,
        });
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
              setBaseImage(null);
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

  const Header = (
    <header style={{ position: 'sticky', top: 8, zIndex: 10, marginBottom: '16px' }}>
      <div className="drag-region" />
      <div
        style={{
          WebkitAppRegion: 'drag',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
          border: 'none',
          borderRadius: 2,
          padding: '12px 16px',
          boxShadow: 'none',
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
                '&:hover': { backgroundColor: 'rgba(17,24,39,0.05)' },
              }}
            >
              <HomeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton
              color="inherit"
              size="small"
              onClick={() => setSettingsOpen(true)}
              sx={{ color: 'action.active', '&:hover': { backgroundColor: 'rgba(17,24,39,0.05)' } }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
      </div>
    </header>
  );

  return (
    <div className={`container ${currentStep}`}>
      {/* Global drag strip at very top so window can always be moved (even over modals) */}
      <div className="global-drag-strip" />
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
                baseImage={baseImage}
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
                baseImage={baseImage}
                targetImages={targetImages}
                prompt={prompt}
              />
            </div>
          )}
          {currentStep === 'results' && (
            <div className="fade-in">
              <ResultsView
                results={results}
                baseImage={baseImage}
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
          {false && (
            <div className="card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
              <div>Loading recipe...</div>
            </div>
          )}
          {currentProcessId && (
            <ResultsView
              results={results}
              baseImage={baseImage}
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
              onNewProcessingSession={handleNewProcessingSession}
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
        PaperProps={{ className: 'no-drag', sx: { WebkitAppRegion: 'no-drag' } }}
        BackdropProps={{ className: 'no-drag', sx: { WebkitAppRegion: 'no-drag' } }}
      >
        <DialogTitle>Settings</DialogTitle>
        <DialogContent className="no-drag" sx={{ WebkitAppRegion: 'no-drag' }}>
          <div style={{ paddingTop: 8, paddingBottom: 8 }}>
            <Settings />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default App;
