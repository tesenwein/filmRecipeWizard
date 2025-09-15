import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Box, Paper, Typography, FormControlLabel, Switch, Stack } from '@mui/material';
import React, { useEffect, useState } from 'react';
import TargetImageDisplay from './TargetImageDisplay';
import StyleDescriptionCard from './StyleDescriptionCard';
import RecipeImageCard from './RecipeImageCard';
import FineTuneControls from './FineTuneControls';
import ArtisticStylesCard from './ArtisticStylesCard';
import FilmStylesCard from './FilmStylesCard';
import LightroomProfileCard from './LightroomProfileCard';
import ProcessButton from './ProcessButton';
import { useAppStore } from '../store/appStore';
import { StyleOptions } from '../../shared/types';


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
  const [preserveSkinTones, setPreserveSkinTones] = useState<boolean>(false);

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
            extensions: ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'dng', 'cr2', 'nef', 'arw'],
          },
        ],
        properties: ['openFile', 'multiSelections'],
      });

      if (result && result.length > 0) {
        onImagesSelected(result.slice(0, 3), targetImages);
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
            extensions: ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'dng', 'cr2', 'nef', 'arw'],
          },
        ],
        properties: ['openFile', 'multiSelections'],
      });

      if (result && result.length > 0) {
        onImagesSelected(baseImages, result.slice(0, 3));
      }
    } catch (error) {
      console.error('Error selecting target images:', error);
    }
  };

  // Enable processing only when targets present and not currently processing
  const { processingState } = useAppStore();
  const canProcess: boolean = Boolean(targetImages.length > 0 && !processingState.isProcessing);

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
    const next = baseImages.filter((_, i) => i !== index);
    onImagesSelected(next, targetImages);
  };
  const handleRemoveTarget = (index: number) => {
    const next = targetImages.filter((_, i) => i !== index);
    onImagesSelected(baseImages, next);
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

  // Load current global setting for Preserve Skin Tones
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await window.electronAPI.getSettings();
        if (res?.success && res.settings) {
          // preserveSkinTones is a per-generation option, not a persistent setting
          setPreserveSkinTones(false);
        }
      } catch {
        // Ignore errors when loading settings
      }
    };
    loadSettings();
  }, []);

  const handleTogglePreserveSkin = async (checked: boolean) => {
    setPreserveSkinTones(checked);
    onStyleOptionsChange?.({ preserveSkinTones: checked });
    // preserveSkinTones is a per-generation option, not a persistent setting
  };


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, p: 1 }}>
      {/* Header */}
      <Paper className="card slide-in" elevation={0} sx={{ borderRadius: 2, p: 2.5, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
          <AutoAwesomeIcon sx={{ fontSize: 28, color: 'primary.main' }} />
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#2c3338', margin: 0 }}>
            AI Color Matching Studio
          </h2>
        </Box>
        <p style={{ fontSize: 13, color: '#5f6b74', margin: 0 }}>
          Transform your photos with intelligent color grading
        </p>
      </Paper>

      {/* Main Content Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 0.8fr' }, gap: 2.5, minHeight: 500 }}>
        {/* Left Column - Large Target Image */}
        <TargetImageDisplay
          targetImages={targetImages}
          targetPreviews={targetPreviews}
          onSelectImages={handleTargetImagesSelect}
          onRemoveImage={handleRemoveTarget}
        />

        {/* Right Column - All Options */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Quick Options */}
          <Paper className="card slide-in" elevation={0} sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
              Options
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={!!styleOptions?.filmGrain}
                    onChange={(_, c) => onStyleOptionsChange?.({ filmGrain: c })}
                  />
                }
                label="Film Grain"
              />
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={preserveSkinTones}
                    onChange={(_, c) => handleTogglePreserveSkin(c)}
                  />
                }
                label="Preserve Skin Tones"
              />
            </Stack>
          </Paper>

          <StyleDescriptionCard
            prompt={prompt}
            onPromptChange={onPromptChange}
            selectedVibe={styleOptions?.vibe}
            onVibeChange={handleVibeChange}
          />

          <LightroomProfileCard
            selected={styleOptions?.lightroomProfile}
            onSelect={(profile) => onStyleOptionsChange?.({ lightroomProfile: profile })}
          />

          <ArtisticStylesCard
            selected={styleOptions?.artistStyle?.key}
            onSelect={(s) => onStyleOptionsChange?.({ artistStyle: s })}
          />

          <FilmStylesCard
            selected={styleOptions?.filmStyle?.key}
            onSelect={(s) => onStyleOptionsChange?.({ filmStyle: s })}
          />

          <RecipeImageCard
            baseImages={baseImages}
            basePreviews={basePreviews}
            onSelectImages={handleBaseImageSelect}
            onRemoveImage={handleRemoveBase}
          />

          <FineTuneControls
            styleOptions={styleOptions}
            onStyleOptionsChange={onStyleOptionsChange}
          />
        </Box>
      </Box>

      {/* Process Button */}
      <ProcessButton canProcess={canProcess} onStartProcessing={onStartProcessing} />
    </Box>
  );
};

export default ColorMatchingStudio;
