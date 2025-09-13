import React, { useEffect, useRef, useState } from 'react';
import ImageUploader from './ImageUploader';
import ProcessingView from './ProcessingView';
import ResultsView from './ResultsView';
import HistoryView from './HistoryView';
import Settings from './Settings';
import { Dialog, DialogTitle, DialogContent, IconButton, Tooltip } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import HomeIcon from '@mui/icons-material/Home';
import { ProcessHistory, ProcessingResult, ProcessingState } from '../../shared/types';

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
    status: ''
  });
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [currentStep, setCurrentStep] = useState<'history' | 'upload' | 'processing' | 'results'>('history');
  const [currentProcessId, setCurrentProcessId] = useState<string | null>(null);
  const currentProcessIdRef = useRef<string | null>(null);
  useEffect(() => { currentProcessIdRef.current = currentProcessId; }, [currentProcessId]);
  const targetImagesRef = useRef<string[]>([]);
  useEffect(() => { targetImagesRef.current = targetImages; }, [targetImages]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [projectLoading, setProjectLoading] = useState(false);
  const [isNewProcessingSession, setIsNewProcessingSession] = useState(false);

  // Check if API key is configured on startup
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const response = await window.electronAPI.getSettings();
        if (response.success && (!response.settings?.openaiKey || response.settings?.openaiKey === '')) {
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
    if (!baseImage || targetImages.length === 0) return;

    // Save process to storage
    try {
      const processData = {
        baseImage,
        targetImages,
        results: []
      };
      
      const result = await window.electronAPI.saveProcess(processData);
      if (result.success) {
        console.log('[APP] Saved new process', { id: result.process.id, baseImage, targetCount: targetImages.length });
        setCurrentProcessId(result.process.id);
        currentProcessIdRef.current = result.process.id;
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
      status: 'Starting AI analysis...'
    });

    // Start processing through IPC
    console.log('[APP] Starting processImages', { baseImage, targetCount: targetImages.length });
    window.electronAPI.processImages({
      baseImagePath: baseImage!,
      targetImagePaths: targetImages,
      hint: '', // Could be added as user input later
      options: {},
      processId: currentProcessIdRef.current || undefined,
    });
  };

  const handleProcessingUpdate = (progress: number, status: string) => {
    setProcessingState(prev => ({
      ...prev,
      progress,
      status
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
      metadata: result.metadata
    }));
    
    setResults(results);
    console.log('[APP] Processing complete', { count: results.length, success: results.filter(r => r.success).length });
    setProcessingState(prev => ({
      ...prev,
      isProcessing: false,
      progress: 100,
      status: 'Processing complete!'
    }));

    // Update process in storage
    const pid = currentProcessIdRef.current;
    if (pid) {
      try {
        console.log('[APP] Persisting results', { id: pid, count: results.length });
        await window.electronAPI.updateProcess(pid, {
          results
        });
        console.log('[APP] Results persisted', { id: pid });
      } catch (error) {
        console.error('Failed to update process:', error);
      }
    }

    setCurrentStep('results');
    
    // Navigate back to project details if this was a new processing session
    if (isNewProcessingSession && currentProcessIdRef.current) {
      setIsNewProcessingSession(false);
      navigate(`/projectdetails?id=${currentProcessIdRef.current}`);
    }
  };

  const handleReset = () => {
    setBaseImage(null);
    setTargetImages([]);
    setResults([]);
    setCurrentProcessId(null);
    setCurrentStep('upload');
    setIsNewProcessingSession(false);
    setProcessingState({
      isProcessing: false,
      progress: 0,
      status: ''
    });
  };

  const handleNewProcess = () => {
    handleReset();
  };

  const handleNewProcessingSession = async () => {
    // Keep the same images but create a new processing session
    if (!baseImage || targetImages.length === 0) return;
    
    setResults([]);
    setCurrentProcessId(null);
    setCurrentStep('processing');
    setIsNewProcessingSession(true);
    setProcessingState({
      isProcessing: true,
      progress: 0,
      status: 'Starting new AI analysis...'
    });

    // Save new process to storage
    try {
      const processData = {
        baseImage,
        targetImages,
        results: []
      };
      
      const result = await window.electronAPI.saveProcess(processData);
      if (result.success) {
        console.log('[APP] Saved new processing session', { id: result.process.id, baseImage, targetCount: targetImages.length });
        setCurrentProcessId(result.process.id);
        currentProcessIdRef.current = result.process.id;
      } else {
        console.warn('[APP] Failed to save new processing session', result.error);
      }
    } catch (error) {
      console.error('Failed to save new processing session:', error);
    }

    // Navigate to create route to show processing view
    navigate('/create');

    // Start processing through IPC
    console.log('[APP] Starting new processing session', { baseImage, targetCount: targetImages.length });
    window.electronAPI.processImages({
      baseImagePath: baseImage,
      targetImagePaths: targetImages,
      hint: '',
      options: {},
      processId: currentProcessIdRef.current || undefined,
    });
  };


  const handleOpenProject = async (process: ProcessHistory) => {
    setProjectLoading(true);
    setProcessingState({ isProcessing: false, progress: 0, status: '' });
    setBaseImage(process.baseImage);
    setTargetImages(process.targetImages);
    setCurrentProcessId(process.id);
    try {
      if (process.id) {
        console.log('[APP] Open project request', {
          id: process.id,
          baseImage: process.baseImage,
          targetCount: process.targetImages?.length,
          incomingResults: Array.isArray((process as any).results) ? (process as any).results.length : 0,
        });
        const res = await window.electronAPI.getProcess(process.id);
        console.log('[APP] getProcess response', {
          id: process.id,
          success: res?.success,
          resultsCount: Array.isArray(res?.process?.results) ? res?.process?.results.length : 0,
        });
        if (res?.success && res.process && Array.isArray(res.process.results) && res.process.results.length > 0) {
          setResults(res.process.results);
        } else {
          setResults(process.results || []);
        }
      } else {
        setResults(process.results || []);
      }
    } finally {
      setProjectLoading(false);
      setCurrentStep('results');
      navigate(`/projectdetails?id=${process.id}`);
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

  // Restore project when landing directly on project details (e.g., after refresh)
  useEffect(() => {
    const restore = async () => {
      if (route === '/projectdetails') {
        const id = routeQuery?.id;
        if (id) {
          try {
            setProjectLoading(true);
            const res = await window.electronAPI.getProcess(id);
            if (res?.success && res.process) {
              setBaseImage(res.process.baseImage);
              setTargetImages(res.process.targetImages || []);
              setResults(Array.isArray(res.process.results) ? res.process.results : []);
              setCurrentProcessId(res.process.id);
              setCurrentStep('results');
            }
          } catch (e) {
            console.warn('Failed to restore project from hash:', e);
          } finally {
            setProjectLoading(false);
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
          border: '1px solid #EEF2FF',
          borderRadius: 12,
          padding: '8px 12px',
          boxShadow: '0 6px 14px rgba(17, 24, 39, 0.06)',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, color: '#1F2937' }}>Image Match</div>
        <div className="no-drag">
          <Tooltip title="Home">
            <IconButton
              color="inherit"
              size="small"
              onClick={() => navigate('/home')}
              sx={{ mr: 1, color: 'action.active', '&:hover': { backgroundColor: 'rgba(17,24,39,0.05)' } }}
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
      {Header}
      {route === '/home' && (
        <div className="fade-in">
          <HistoryView
            onOpenProject={(process) => {
              handleOpenProject(process);
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
              <ImageUploader
                onImagesSelected={handleImagesSelected}
                onStartProcessing={handleStartProcessing}
                baseImage={baseImage}
                targetImages={targetImages}
              />
            </div>
          )}
          {currentStep === 'processing' && (
            <div className="fade-in">
              <ProcessingView
                processingState={processingState}
                baseImage={baseImage}
                targetImages={targetImages}
              />
            </div>
          )}
          {currentStep === 'results' && (
            <div className="fade-in">
              <ResultsView
                results={results}
                baseImage={baseImage}
                targetImages={targetImages}
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

      {route === '/projectdetails' && (
        <div className="fade-in">
          {projectLoading && (
            <div className="card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
              <div>Loading project...</div>
            </div>
          )}
          {!projectLoading && currentProcessId && (
            <ResultsView
              results={results}
              baseImage={baseImage}
              targetImages={targetImages}
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
          {!projectLoading && !currentProcessId && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>No project selected</div>
              <div style={{ color: '#6b7280' }}>Choose one from Home → Your Projects.</div>
            </div>
          )}
        </div>
      )}

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Settings</DialogTitle>
        <DialogContent>
          <div style={{ paddingTop: 8, paddingBottom: 8 }}>
            <Settings />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default App;
