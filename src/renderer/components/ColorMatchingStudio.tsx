import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Box, Paper, Typography, FormControlLabel, Switch, Stack } from '@mui/material';
import React, { useEffect, useState } from 'react';
import TargetImageDisplay from './TargetImageDisplay';
import StyleDescriptionCard from './StyleDescriptionCard';
import RecipeImageCard from './RecipeImageCard';
import FineTuneControls from './FineTuneControls';
import ArtisticStylesCard from './ArtisticStylesCard';
import FilmStylesCard from './FilmStylesCard';
import ProcessButton from './ProcessButton';

interface StyleOptions {
  warmth?: number;
  tint?: number;
  contrast?: number;
  vibrance?: number;
  moodiness?: number;
  saturationBias?: number;
  filmGrain?: boolean;
  vibe?: string;
  artistStyle?: {
    key: string;
    name: string;
    category: string;
    blurb: string;
  };
  filmStyle?: {
    key: string;
    name: string;
    category: string;
    blurb: string;
  };
}

interface ColorMatchingStudioProps {
  onImagesSelected: (baseImage: string, targetImages: string[]) => void;
  onStartProcessing: () => void;
  baseImage: string | null;
  targetImages: string[];
  prompt: string;
  onPromptChange: (value: string) => void;
  styleOptions?: StyleOptions;
  onStyleOptionsChange?: (update: Partial<StyleOptions>) => void;
}

const ColorMatchingStudio: React.FC<ColorMatchingStudioProps> = ({
  onImagesSelected,
  onStartProcessing,
  baseImage,
  targetImages,
  prompt,
  onPromptChange,
  styleOptions,
  onStyleOptionsChange,
}) => {
  const [targetPreviews, setTargetPreviews] = useState<string[]>([]);
  const [baseDisplay, setBaseDisplay] = useState<string | null>(null);
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
        properties: ['openFile'],
      });

      if (result && result.length > 0) {
        onImagesSelected(result[0], targetImages);
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
        onImagesSelected(baseImage || '', result);
      }
    } catch (error) {
      console.error('Error selecting target images:', error);
    }
  };

  // Enable processing as soon as user has target images (prompt/base optional)
  const canProcess: boolean = Boolean(targetImages.length > 0);

  const handleVibeChange = (vibe: string) => {
    onStyleOptionsChange?.({ vibe });
  };

  // Convert base image for display if unsupported
  useEffect(() => {
    const run = async () => {
      if (baseImage && !isSafeForImg(baseImage)) {
        try {
          const res = await window.electronAPI.generatePreview({ path: baseImage });
          setBaseDisplay(res?.success ? res.previewPath : baseImage);
        } catch {
          setBaseDisplay(baseImage);
        }
      } else {
        setBaseDisplay(baseImage);
      }
    };
    run();
  }, [baseImage]);

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
          setPreserveSkinTones(!!res.settings.preserveSkinTones);
        }
      } catch {
        // Ignore errors when loading settings
      }
    };
    loadSettings();
  }, []);

  const handleTogglePreserveSkin = async (checked: boolean) => {
    setPreserveSkinTones(checked);
    try {
      await window.electronAPI.saveSettings({ preserveSkinTones: checked });
    } catch {
      // silently ignore errors in UI; setting persists via Settings page too
    }
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

          <ArtisticStylesCard
            selected={styleOptions?.artistStyle?.key}
            onSelect={(s) => onStyleOptionsChange?.({ artistStyle: s })}
          />

          <FilmStylesCard
            selected={styleOptions?.filmStyle?.key}
            onSelect={(s) => onStyleOptionsChange?.({ filmStyle: s })}
          />

          <RecipeImageCard
            baseImage={baseImage}
            baseDisplay={baseDisplay}
            onSelectImage={handleBaseImageSelect}
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
