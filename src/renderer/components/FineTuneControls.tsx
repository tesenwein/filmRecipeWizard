import TuneIcon from '@mui/icons-material/Tune';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, FormControlLabel, Slider, Switch, Box, Paper, Chip } from '@mui/material';
import React from 'react';

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
  return (
    <Paper className="card slide-in" sx={{ p: 0, animationDelay: '0.15s' }}>
      <Accordion disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5, py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <TuneIcon sx={{ color: 'primary.main', fontSize: 20 }} />
            <Box sx={{ flex: 1 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2c3338', margin: 0 }}>
                Fine Tune
              </h3>
              <p style={{ fontSize: 12, color: '#5f6b74', margin: 0 }}>
                Adjust color parameters
              </p>
            </Box>
            <Chip label="Optional" size="small" variant="outlined" />
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2.5 }}>
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5
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

        {/* Additional Controls */}
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
      </Box>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default FineTuneControls;
