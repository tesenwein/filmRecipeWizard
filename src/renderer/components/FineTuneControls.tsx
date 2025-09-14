import TuneIcon from '@mui/icons-material/Tune';
import { Button, FormControlLabel, Slider, Switch, Box, Paper } from '@mui/material';
import React, { useState } from 'react';

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
}

interface FineTuneControlsProps {
  styleOptions?: StyleOptions;
  onStyleOptionsChange?: (update: Partial<StyleOptions>) => void;
}

const FineTuneControls: React.FC<FineTuneControlsProps> = ({
  styleOptions,
  onStyleOptionsChange,
}) => {
  const [expandedSettings, setExpandedSettings] = useState(false);

  return (
    <Paper className="card slide-in" sx={{ p: 2.5, animationDelay: '0.15s' }}>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 2,
        cursor: 'pointer'
      }}
      onClick={() => setExpandedSettings(!expandedSettings)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TuneIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          <Box>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2c3338', margin: 0 }}>
              Fine Tune
            </h3>
            <p style={{ fontSize: 12, color: '#5f6b74', margin: 0 }}>
              Adjust color parameters
            </p>
          </Box>
        </Box>
        <Button size="small" variant="text" color="primary">
          {expandedSettings ? 'Less' : 'More'}
        </Button>
      </Box>

      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: expandedSettings ? 1.5 : 1.25,
        maxHeight: expandedSettings ? 350 : 100,
        overflow: 'hidden',
        transition: 'max-height 0.3s ease'
      }}>
        {/* Essential Controls */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>🌡️ Warmth</span>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{styleOptions?.warmth ?? 50}</span>
          </Box>
          <Slider
            size="small"
            value={styleOptions?.warmth ?? 50}
            onChange={(_, v) => onStyleOptionsChange?.({ warmth: v as number })}
            min={0}
            max={100}
            color="primary"
          />
        </Box>

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>⚡ Contrast</span>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{styleOptions?.contrast ?? 50}</span>
          </Box>
          <Slider
            size="small"
            value={styleOptions?.contrast ?? 50}
            onChange={(_, v) => onStyleOptionsChange?.({ contrast: v as number })}
            min={0}
            max={100}
            color="primary"
          />
        </Box>

        {/* Expanded Controls */}
        {expandedSettings && (
          <>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>🎨 Tint</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{(styleOptions?.tint ?? 0) + 50}</span>
              </Box>
              <Slider
                size="small"
                value={(styleOptions?.tint ?? 0) + 50}
                onChange={(_, v) => onStyleOptionsChange?.({ tint: (v as number) - 50 })}
                min={0}
                max={100}
                color="primary"
              />
            </Box>

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>🌈 Vibrance</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{styleOptions?.vibrance ?? 50}</span>
              </Box>
              <Slider
                size="small"
                value={styleOptions?.vibrance ?? 50}
                onChange={(_, v) => onStyleOptionsChange?.({ vibrance: v as number })}
                min={0}
                max={100}
                color="primary"
              />
            </Box>

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>🌙 Moodiness</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{styleOptions?.moodiness ?? 50}</span>
              </Box>
              <Slider
                size="small"
                value={styleOptions?.moodiness ?? 50}
                onChange={(_, v) => onStyleOptionsChange?.({ moodiness: v as number })}
                min={0}
                max={100}
                color="primary"
              />
            </Box>

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>🎭 Saturation</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{styleOptions?.saturationBias ?? 50}</span>
              </Box>
              <Slider
                size="small"
                value={styleOptions?.saturationBias ?? 50}
                onChange={(_, v) => onStyleOptionsChange?.({ saturationBias: v as number })}
                min={0}
                max={100}
                color="primary"
              />
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={!!styleOptions?.filmGrain}
                  onChange={(_, c) => onStyleOptionsChange?.({ filmGrain: c })}
                  size="small"
                />
              }
              label="🎞️ Film Grain"
              sx={{ mt: 0.5 }}
            />
          </>
        )}
      </Box>
    </Paper>
  );
};

export default FineTuneControls;
