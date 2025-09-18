import React from 'react';
import { Typography, Box, Paper } from '@mui/material';
import {
  Recipe,
  ProcessingResult,
  StyleOptions,
} from '../../shared/types';
import ColorMatchingStudio from './ColorMatchingStudio';
import RecipeGallery from './RecipeGallery';
import ProcessingView from './ProcessingView';
import ResultsView from './ResultsView';
import Settings from './Settings';
import SetupWizard from './SetupWizard';
import SplashScreen from './SplashScreen';

interface RouterProps {
  route: string;
  routeQuery: Record<string, string>;
  startupStatus: { status: string; progress: number };
  currentStep: 'gallery' | 'upload' | 'processing' | 'results';
  currentProcessId: string | null;
  baseImages: string[];
  targetImages: string[];
  prompt: string;
  results: ProcessingResult[];
  styleOptions: StyleOptions;
  processingState: { isProcessing: boolean; progress: number; status: string };
  onOpenRecipe: (recipe: Recipe) => Promise<void>;
  onNewProcess: () => void;
  onImagesSelected: (bases: string[], targets: string[]) => void;
  onStartProcessing: () => Promise<void>;
  onPromptChange: (prompt: string) => void;
  onStyleOptionsChange: (options: Partial<StyleOptions>) => void;
  onReset: () => void;
  onRestart: () => void;
  onNavigate: (path: string) => void;
}

const Router: React.FC<RouterProps> = ({
  route,
  routeQuery: _routeQuery,
  startupStatus,
  currentStep,
  currentProcessId,
  baseImages,
  targetImages,
  prompt,
  results,
  styleOptions,
  processingState,
  onOpenRecipe,
  onNewProcess,
  onImagesSelected,
  onStartProcessing,
  onPromptChange,
  onStyleOptionsChange,
  onReset,
  onRestart,
  onNavigate,
}) => {
  if (route === '/splash') {
    return <SplashScreen status={startupStatus.status} progress={startupStatus.progress} />;
  }

  if (route === '/gallery') {
    return (
      <div className="fade-in">
        <RecipeGallery
          onOpenRecipe={onOpenRecipe}
          onNewProcess={() => {
            onNewProcess();
            onNavigate('/create');
          }}
        />
      </div>
    );
  }

  if (route === '/create') {
    return (
      <div>
        {currentStep === 'upload' && (
          <div className="fade-in">
            <ColorMatchingStudio
              onImagesSelected={onImagesSelected}
              onStartProcessing={onStartProcessing}
              baseImages={baseImages}
              targetImages={targetImages}
              prompt={prompt}
              onPromptChange={onPromptChange}
              styleOptions={styleOptions}
              onStyleOptionsChange={onStyleOptionsChange}
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
                onReset();
                onNavigate('/gallery');
              }}
              onRestart={() => {
                onRestart();
              }}
            />
          </div>
        )}
      </div>
    );
  }

  if (route === '/recipedetails') {
    return (
      <div className="fade-in">
        {currentProcessId ? (
          <ResultsView
            results={results}
            baseImage={baseImages[0] || null}
            targetImages={targetImages}
            prompt={prompt}
            processId={currentProcessId || undefined}
            onReset={() => {
              onReset();
              onNavigate('/gallery');
            }}
            onRestart={() => {
              onRestart();
            }}
          />
        ) : (
          <Paper className="card" sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              No project selected
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Choose one from Home → Your Projects.
            </Typography>
          </Paper>
        )}
      </div>
    );
  }

  if (route === '/settings') {
    return (
      <div className="fade-in">
        <Paper className="card" sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Settings</Typography>
          <Settings />
        </Paper>
      </div>
    );
  }

  if (route === '/setup') {
    return (
      <div className="fade-in">
        <SetupWizard
          onComplete={() => {
            onNavigate('/create');
          }}
        />
      </div>
    );
  }

  return null;
};

export default Router;
