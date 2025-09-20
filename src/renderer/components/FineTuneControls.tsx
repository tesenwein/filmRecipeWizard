import BoltIcon from '@mui/icons-material/Bolt';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PaletteIcon from '@mui/icons-material/Palette';
import TuneIcon from '@mui/icons-material/Tune';
import { Accordion, AccordionDetails, AccordionSummary, Box, Paper, Slider } from '@mui/material';
import React from 'react';
import { StyleOptions } from '../../shared/types';

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
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5, py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <TuneIcon sx={{ color: 'primary.main', fontSize: 20 }} />
            <Box sx={{ flex: 1 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2c3338', margin: 0 }}>
                Fine Tune
              </h3>
              <p style={{ fontSize: 12, color: '#5f6b74', margin: 0 }}>Adjust color parameters</p>
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2.5 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            {/* Essential Controls */}
            {styleOptions?.aiFunctions?.temperatureTint && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Temperature (K)</span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{styleOptions?.temperatureK ?? 6500} K</span>
                </Box>
                <Slider
                  size="small"
                  value={styleOptions?.temperatureK ?? 6500}
                  onChange={(_, v) => onStyleOptionsChange?.({ temperatureK: v as number })}
                  min={2000}
                  max={50000}
                  step={100}
                  valueLabelDisplay="auto"
                  valueLabelFormat={v => `${v} K`}
                  color="primary"
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, px: 0.5 }}>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>2000K</span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>6500K</span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>50000K</span>
                </Box>
              </Box>
            )}

            {/* Kelvin temperature appears only once above when Temperature/Tint is enabled */}

            <Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 0.5,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <BoltIcon sx={{ fontSize: 16 }} />
                  Contrast
                </span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>
                  {styleOptions?.contrast ?? 50}
                </span>
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
            {styleOptions?.aiFunctions?.temperatureTint && (
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 0.5,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <PaletteIcon sx={{ fontSize: 16 }} />
                    Tint
                  </span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    {(styleOptions?.tint ?? 0) + 50}
                  </span>
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
            )}

            <Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 0.5,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>🌈 Vibrance</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>
                  {styleOptions?.vibrance ?? 50}
                </span>
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
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 0.5,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  🎭 Saturation
                </span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>
                  {styleOptions?.saturationBias ?? 50}
                </span>
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

          </Box>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default FineTuneControls;
