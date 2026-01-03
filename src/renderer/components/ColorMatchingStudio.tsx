import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BrushIcon from '@mui/icons-material/Brush';
import { Box, FormControlLabel, Paper, Switch } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { StyleOptions } from '../../shared/types';
import { useAppStore } from '../store/appStore';
import ArtisticStylesCard from './ArtisticStylesCard';
import ConfirmDialog from './ConfirmDialog';
import FilmStylesCard from './FilmStylesCard';
import FineTuneControls from './FineTuneControls';
import ImagePicker from './ImagePicker';
import ModificationTogglesCard from './ModificationTogglesCard';
import ProcessButton from './ProcessButton';
import StyleCategoriesCard from './StyleCategoriesCard';
import StyleDescriptionCard from './StyleDescriptionCard';

interface ColorMatchingStudioProps {
  onImagesSelected: (baseImages: string[]) => void;
  onStartProcessing: () => void;
  baseImages: string[];
  prompt: string;
  onPromptChange: (value: string) => void;
  styleOptions?: StyleOptions;
  onStyleOptionsChange?: (update: Partial<StyleOptions>) => void;
}

const ColorMatchingStudio: React.FC<ColorMatchingStudioProps> = ({
  onImagesSelected,
  onStartProcessing,
  baseImages,
  prompt,
  onPromptChange,
  styleOptions,
  onStyleOptionsChange,
}) => {
  const [basePreviews, setBasePreviews] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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
        onImagesSelected(next);
      }
    } catch (error) {
      console.error('Error selecting base image:', error);
    }
  };


  // Enable processing when not currently processing and at least one option is active
  const { processingState } = useAppStore();

  // Check if at least one option is active
  const hasActiveOptions = Boolean(
    baseImages.length > 0 || // Has reference images
    (prompt && prompt.trim().length > 0) || // Has prompt text
    (styleOptions?.styleCategories && styleOptions.styleCategories.length > 0) || // Has style categories selected
    styleOptions?.artistStyle || // Has artist style selected
    styleOptions?.filmStyle || // Has film style selected
    styleOptions?.contrast !== undefined || // Has contrast adjustment
    styleOptions?.vibrance !== undefined || // Has vibrance adjustment
    styleOptions?.saturationBias !== undefined || // Has saturation bias adjustment
    // New soft parameters
    styleOptions?.moodiness !== undefined || // Has moodiness adjustment
    styleOptions?.warmth !== undefined || // Has warmth adjustment
    styleOptions?.coolness !== undefined || // Has coolness adjustment
    styleOptions?.drama !== undefined || // Has drama adjustment
    styleOptions?.softness !== undefined || // Has softness adjustment
    styleOptions?.intensity !== undefined || // Has intensity adjustment
    styleOptions?.vintage !== undefined || // Has vintage adjustment
    styleOptions?.cinematic !== undefined || // Has cinematic adjustment
    styleOptions?.faded !== undefined // Has faded adjustment
  );

  const canProcess: boolean = Boolean(!processingState.isProcessing && hasActiveOptions);

  const handleStyleCategoriesChange = (categories: string[]) => {
    onStyleOptionsChange?.({ styleCategories: categories });
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
    setDeleteIndex(index);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    const next = baseImages.filter((_, i) => i !== deleteIndex);
    onImagesSelected(next);
    setDeleteDialogOpen(false);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
  };


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
          {/* Left Column - Reference Image */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%', overflow: 'hidden' }}>
            <ImagePicker
              kind="reference"
              images={baseImages}
              previews={basePreviews}
              onSelectFiles={handleBaseImageSelect}
              onRemoveImage={handleRemoveBase}
              onDropFiles={paths => {
                if (!paths || paths.length === 0) return;
                const next = Array.from(new Set([...(baseImages || []), ...paths])).slice(0, 3);
                onImagesSelected(next);
              }}
              maxFiles={3}
            />
            
            <ModificationTogglesCard
              styleOptions={styleOptions}
              onStyleOptionsChange={onStyleOptionsChange}
            />
          </Box>

          {/* Right Column - All Options */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: 'fit-content', position: 'sticky', top: 0 }}>


            <StyleDescriptionCard
              prompt={prompt}
              onPromptChange={onPromptChange}
            />

            <StyleCategoriesCard
              selectedStyleCategories={styleOptions?.styleCategories}
              onStyleCategoriesChange={handleStyleCategoriesChange}
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

            {/* Include Masks Toggle */}
            <Paper className="card slide-in" sx={{ p: 2.5, animationDelay: '0.2s' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <BrushIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                <Box sx={{ flex: 1 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2c3338', margin: 0 }}>
                    Local Adjustments
                  </h3>
                  <p style={{ fontSize: 12, color: '#5f6b74', margin: 0 }}>
                    Include masks for targeted editing
                  </p>
                </Box>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={styleOptions?.includeMasks === true}
                    onChange={(e) =>
                      onStyleOptionsChange?.({ includeMasks: e.target.checked })
                    }
                    color="primary"
                  />
                }
                label={
                  <span style={{ fontSize: 13, color: '#374151' }}>
                    {styleOptions?.includeMasks === true ? 'Include Masks' : 'Masks Disabled'}
                  </span>
                }
                sx={{ mt: 1 }}
              />
            </Paper>

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
        content="Are you sure you want to remove this recipe reference image?"
        confirmButtonText="Remove"
        confirmColor="error"
      />
    </Box>
  );
};

export default ColorMatchingStudio;
