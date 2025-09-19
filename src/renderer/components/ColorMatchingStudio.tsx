import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Box, Paper } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { StyleOptions } from '../../shared/types';
import { useAppStore } from '../store/appStore';
import AIFunctionsSelector from './AIFunctionsSelector';
import ArtisticStylesCard from './ArtisticStylesCard';
import ConfirmDialog from './ConfirmDialog';
import FilmStylesCard from './FilmStylesCard';
import FineTuneControls from './FineTuneControls';
import ImagePicker from './ImagePicker';
import ProcessButton from './ProcessButton';
import StyleDescriptionCard from './StyleDescriptionCard';

interface ColorMatchingStudioProps {
  onImagesSelected: (baseImages: string[], targetImages: string[]) => void;
  onStartProcessing: () => void;
  baseImages: string[];
  targetImages: string[];
  prompt: string;
  onPromptChange: (value: string) => void;
  styleOptions?: StyleOptions;
  onStyleOptionsChange?: (update: Partial<StyleOptions>) => void;
}

const ColorMatchingStudio: React.FC<ColorMatchingStudioProps> = ({
  onImagesSelected,
  onStartProcessing,
  baseImages,
  targetImages,
  prompt,
  onPromptChange,
  styleOptions,
  onStyleOptionsChange,
}) => {
  const [targetPreviews, setTargetPreviews] = useState<string[]>([]);
  const [basePreviews, setBasePreviews] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'base' | 'target'>('base');
  const [deleteIndex, setDeleteIndex] = useState<number>(0);

  const isSafeForImg = (p?: string | null) => {
    if (!p) return false;
    const ext = p.split('.').pop()?.toLowerCase();
    return !!ext && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
  };

  const handleBaseImageSelect = async () => {
    try {
      const result = await window.electronAPI.selectFiles({
        title: 'Select Recipe Image (Style Reference)',
        filters: [
          {
            name: 'Images',
            extensions: ['jpg', 'jpeg', 'png', 'webp'],
          },
        ],
        properties: ['openFile', 'multiSelections'],
      });

      if (result && result.length > 0) {
        // Add to existing images if any, otherwise replace
        const next =
          baseImages.length > 0
            ? Array.from(new Set([...baseImages, ...result])).slice(0, 3)
            : result.slice(0, 3);
        onImagesSelected(next, targetImages);
      }
    } catch (error) {
      console.error('Error selecting base image:', error);
    }
  };

  const handleTargetImagesSelect = async () => {
    try {
      const result = await window.electronAPI.selectFiles({
        title: 'Select Target Image to Process',
        filters: [
          {
            name: 'Images',
            extensions: ['jpg', 'jpeg', 'png', 'webp'],
          },
        ],
        properties: ['openFile', 'multiSelections'],
      });

      if (result && result.length > 0) {
        // Add to existing images if any, otherwise replace
        const next =
          targetImages.length > 0
            ? Array.from(new Set([...targetImages, ...result])).slice(0, 3)
            : result.slice(0, 3);
        onImagesSelected(baseImages, next);
      }
    } catch (error) {
      console.error('Error selecting target images:', error);
    }
  };

  // Enable processing when not currently processing and at least one option is active
  const { processingState } = useAppStore();

  // Check if at least one option is active
  const hasActiveOptions = Boolean(
    baseImages.length > 0 || // Has reference images
    (prompt && prompt.trim().length > 0) || // Has prompt text
    styleOptions?.vibe || // Has vibe selected
    styleOptions?.artistStyle || // Has artist style selected
    styleOptions?.filmStyle || // Has film style selected
    styleOptions?.filmGrain || // Has film grain enabled
    styleOptions?.warmth !== undefined || // Has warmth adjustment
    styleOptions?.tint !== undefined || // Has tint adjustment
    styleOptions?.contrast !== undefined || // Has contrast adjustment
    styleOptions?.vibrance !== undefined || // Has vibrance adjustment
    styleOptions?.saturationBias !== undefined || // Has saturation bias adjustment
    styleOptions?.moodiness !== undefined // Has moodiness adjustment
  );

  const canProcess: boolean = Boolean(!processingState.isProcessing && hasActiveOptions);

  const handleVibeChange = (vibe: string) => {
    onStyleOptionsChange?.({ vibe });
  };

  // Convert base images for display if unsupported
  useEffect(() => {
    const run = async () => {
      if (!Array.isArray(baseImages) || baseImages.length === 0) {
        setBasePreviews([]);
        return;
      }
      try {
        const previews = await Promise.all(
          baseImages.slice(0, 3).map(async p => {
            if (isSafeForImg(p)) return p;
            try {
              const res = await window.electronAPI.generatePreview({ path: p });
              return res?.success ? res.previewPath : p;
            } catch {
              return p;
            }
          })
        );
        setBasePreviews(previews);
      } catch {
        setBasePreviews(baseImages.slice(0, 3));
      }
    };
    run();
  }, [baseImages]);

  // Remove handlers
  const handleRemoveBase = (index: number) => {
    setDeleteType('base');
    setDeleteIndex(index);
    setDeleteDialogOpen(true);
  };
  const handleRemoveTarget = (index: number) => {
    setDeleteType('target');
    setDeleteIndex(index);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteType === 'base') {
      const next = baseImages.filter((_, i) => i !== deleteIndex);
      onImagesSelected(next, targetImages);
    } else {
      const next = targetImages.filter((_, i) => i !== deleteIndex);
      onImagesSelected(baseImages, next);
    }
    setDeleteDialogOpen(false);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
  };

  // Generate previews for target images
  useEffect(() => {
    const generateTargetPreviews = async () => {
      if (targetImages.length === 0) {
        setTargetPreviews([]);
        return;
      }

      try {
        const previews = await Promise.all(
          targetImages.map(async imagePath => {
            try {
              const result = await window.electronAPI.generatePreview({ path: imagePath });
              return result.success ? result.previewPath : imagePath;
            } catch (error) {
              console.error('Error generating preview for target image:', error);
              return imagePath;
            }
          })
        );
        setTargetPreviews(previews);
      } catch (error) {
        console.error('Error generating target previews:', error);
        setTargetPreviews(targetImages); // Fallback to original paths
      }
    };

    generateTargetPreviews();
  }, [targetImages]);

  // Load current global settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await window.electronAPI.getSettings();
        if (res?.success && res.settings) {
          // Settings loaded
        }
      } catch {
        // Ignore errors when loading settings
      }
    };
    loadSettings();
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', position: 'relative', width: '100%', overflow: 'hidden' }}>
      {/* Main Content Area */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          p: 1,
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Paper
          className="card slide-in"
          elevation={0}
          sx={{ borderRadius: 2, p: 2.5, textAlign: 'center' }}
        >
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}
          >
            <AutoAwesomeIcon sx={{ fontSize: 28, color: 'primary.main' }} />
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#2c3338', margin: 0 }}>
              AI Color Matching Studio
            </h2>
          </Box>
          <p style={{ fontSize: 13, color: '#5f6b74', margin: 0 }}>
            Create Lightroom profiles and LUTs from your reference images
          </p>
        </Paper>

        {/* Main Content Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.5fr 0.8fr' },
            gap: 2.5,
            minHeight: 500,
            width: '100%',
            overflow: 'hidden',
          }}
        >
          {/* Left Column - Target Image and Reference Image */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%', overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', width: '100%', overflow: 'hidden' }}>
              <ImagePicker
                kind="target"
                images={targetImages}
                previews={targetPreviews}
                onSelectFiles={handleTargetImagesSelect}
                onRemoveImage={handleRemoveTarget}
                onDropFiles={paths => {
                  if (!paths || paths.length === 0) return;
                  const next = Array.from(new Set([...(targetImages || []), ...paths])).slice(0, 3);
                  onImagesSelected(baseImages, next);
                }}
                maxFiles={3}
              />
            </Box>

            <ImagePicker
              kind="reference"
              images={baseImages}
              previews={basePreviews}
              onSelectFiles={handleBaseImageSelect}
              onRemoveImage={handleRemoveBase}
              onDropFiles={paths => {
                if (!paths || paths.length === 0) return;
                const next = Array.from(new Set([...(baseImages || []), ...paths])).slice(0, 3);
                onImagesSelected(next, targetImages);
              }}
              maxFiles={3}
            />
          </Box>

          {/* Right Column - All Options */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: 'fit-content', position: 'sticky', top: 0 }}>

            <AIFunctionsSelector
              styleOptions={styleOptions}
              onStyleOptionsChange={onStyleOptionsChange}
            />

            <StyleDescriptionCard
              prompt={prompt}
              onPromptChange={onPromptChange}
              selectedVibe={styleOptions?.vibe}
              onVibeChange={handleVibeChange}
            />

            <ArtisticStylesCard
              selected={styleOptions?.artistStyle?.key}
              onSelect={s => onStyleOptionsChange?.({ artistStyle: s })}
            />

            <FilmStylesCard
              selected={styleOptions?.filmStyle?.key}
              onSelect={s => onStyleOptionsChange?.({ filmStyle: s })}
            />

            <FineTuneControls
              styleOptions={styleOptions}
              onStyleOptionsChange={onStyleOptionsChange}
            />

            {/* Process Button */}
            <Box sx={{ mt: 2 }}>
              <ProcessButton
                canProcess={canProcess}
                onStartProcessing={onStartProcessing}
                hasActiveOptions={hasActiveOptions}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Remove Image"
        content={`Are you sure you want to remove this ${deleteType === 'base' ? 'recipe reference' : 'target'
          } image?`}
        confirmButtonText="Remove"
        confirmColor="error"
      />
    </Box>
  );
};

export default ColorMatchingStudio;
