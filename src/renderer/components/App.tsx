import React, { useState } from 'react';
import ImageUploader from './ImageUploader';
import ProcessingView from './ProcessingView';
import ResultsView from './ResultsView';
import HistoryView from './HistoryView';
import { ProcessHistory, ProcessingResult, ProcessingState } from '../../shared/types';

const App: React.FC = () => {
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
        results: [],
        status: 'in_progress' as const
      };
      
      const result = await window.electronAPI.saveProcess(processData);
      if (result.success) {
        setCurrentProcessId(result.process.id);
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
    window.electronAPI.processImages({
      baseImagePath: baseImage!,
      targetImagePaths: targetImages,
      hint: '', // Could be added as user input later
      options: {}
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
    const results: ProcessingResult[] = processingResults.map((result, index) => ({
      inputPath: targetImages[index],
      outputPath: result.outputPath,
      success: result.success,
      error: result.error,
      metadata: result.metadata
    }));
    
    setResults(results);
    setProcessingState(prev => ({
      ...prev,
      isProcessing: false,
      progress: 100,
      status: 'Processing complete!'
    }));

    // Update process in storage
    if (currentProcessId) {
      try {
        const status = results.some(r => r.success) ? 'completed' as const : 'failed' as const;
        await window.electronAPI.updateProcess(currentProcessId, {
          results,
          status
        });
      } catch (error) {
        console.error('Failed to update process:', error);
      }
    }

    setCurrentStep('results');
  };

  const handleReset = () => {
    setBaseImage(null);
    setTargetImages([]);
    setResults([]);
    setCurrentProcessId(null);
    setCurrentStep('upload');
    setProcessingState({
      isProcessing: false,
      progress: 0,
      status: ''
    });
  };

  const handleNewProcess = () => {
    handleReset();
  };

  const handleSelectProcess = (process: ProcessHistory) => {
    setBaseImage(process.baseImage);
    setTargetImages(process.targetImages);
    setResults(process.results || []);
    setCurrentProcessId(process.id);
    setCurrentStep('results');
  };

  const handleOpenProject = (process: ProcessHistory) => {
    setProcessingState({ isProcessing: false, progress: 0, status: '' });
    setBaseImage(process.baseImage);
    setTargetImages(process.targetImages);
    setResults(process.results || []);
    setCurrentProcessId(process.id);
    
    // If project has results, go to results view, otherwise go to upload view
    if (process.results && process.results.length > 0) {
      setCurrentStep('results');
    } else {
      setCurrentStep('upload');
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

  return (
    <div className={`container ${currentStep}`}>
      <header style={{ textAlign: 'center', marginBottom: '40px', position: 'relative' }}>
        {currentStep !== 'history' && (
          <button
            className="button-secondary"
            onClick={() => setCurrentStep('history')}
            style={{
              position: 'absolute',
              left: '0',
              top: '0',
              padding: '12px 20px',
              fontSize: '14px',
              minHeight: 'auto'
            }}
          >
            ← Back to History
          </button>
        )}
        
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: '700', 
          color: '#333333',
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Image Match
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: '#666666',
          fontWeight: '400'
        }}>
          AI-powered color grading and style matching for your photos
        </p>
      </header>

      {currentStep === 'history' && (
        <div className="fade-in">
          <HistoryView
            onOpenProject={handleOpenProject}
            onNewProcess={handleNewProcess}
          />
        </div>
      )}

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
            onReset={handleReset}
          />
        </div>
      )}
    </div>
  );
};

export default App;
