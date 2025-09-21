import AcUnitIcon from '@mui/icons-material/AcUnit';
import BlurOnIcon from '@mui/icons-material/BlurOn';
import BoltIcon from '@mui/icons-material/Bolt';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import HistoryIcon from '@mui/icons-material/History';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import MoodIcon from '@mui/icons-material/Mood';
import MovieIcon from '@mui/icons-material/Movie';
import OpacityIcon from '@mui/icons-material/Opacity';
import TheaterComedyIcon from '@mui/icons-material/TheaterComedy';
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

            {/* Soft Parameters Section */}
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e5e7eb' }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 12px 0' }}>
                Mood & Style
              </h4>
              
              {/* Moodiness */}
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
                    <MoodIcon sx={{ fontSize: 16 }} />
                    Moodiness
                  </span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    {styleOptions?.moodiness ?? 50}
                  </span>
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

              {/* Warmth */}
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
                    <LocalFireDepartmentIcon sx={{ fontSize: 16 }} />
                    Warmth
                  </span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    {styleOptions?.warmth ?? 50}
                  </span>
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

              {/* Coolness */}
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
                    <AcUnitIcon sx={{ fontSize: 16 }} />
                    Coolness
                  </span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    {styleOptions?.coolness ?? 50}
                  </span>
                </Box>
                <Slider
                  size="small"
                  value={styleOptions?.coolness ?? 50}
                  onChange={(_, v) => onStyleOptionsChange?.({ coolness: v as number })}
                  min={0}
                  max={100}
                  color="primary"
                />
              </Box>

              {/* Drama */}
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
                    <TheaterComedyIcon sx={{ fontSize: 16 }} />
                    Drama
                  </span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    {styleOptions?.drama ?? 50}
                  </span>
                </Box>
                <Slider
                  size="small"
                  value={styleOptions?.drama ?? 50}
                  onChange={(_, v) => onStyleOptionsChange?.({ drama: v as number })}
                  min={0}
                  max={100}
                  color="primary"
                />
              </Box>

              {/* Softness */}
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
                    <BlurOnIcon sx={{ fontSize: 16 }} />
                    Softness
                  </span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    {styleOptions?.softness ?? 50}
                  </span>
                </Box>
                <Slider
                  size="small"
                  value={styleOptions?.softness ?? 50}
                  onChange={(_, v) => onStyleOptionsChange?.({ softness: v as number })}
                  min={0}
                  max={100}
                  color="primary"
                />
              </Box>

              {/* Intensity */}
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
                    <FlashOnIcon sx={{ fontSize: 16 }} />
                    Intensity
                  </span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    {styleOptions?.intensity ?? 50}
                  </span>
                </Box>
                <Slider
                  size="small"
                  value={styleOptions?.intensity ?? 50}
                  onChange={(_, v) => onStyleOptionsChange?.({ intensity: v as number })}
                  min={0}
                  max={100}
                  color="primary"
                />
              </Box>

              {/* Vintage */}
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
                    <HistoryIcon sx={{ fontSize: 16 }} />
                    Vintage
                  </span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    {styleOptions?.vintage ?? 50}
                  </span>
                </Box>
                <Slider
                  size="small"
                  value={styleOptions?.vintage ?? 50}
                  onChange={(_, v) => onStyleOptionsChange?.({ vintage: v as number })}
                  min={0}
                  max={100}
                  color="primary"
                />
              </Box>

              {/* Cinematic */}
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
                    <MovieIcon sx={{ fontSize: 16 }} />
                    Cinematic
                  </span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    {styleOptions?.cinematic ?? 50}
                  </span>
                </Box>
                <Slider
                  size="small"
                  value={styleOptions?.cinematic ?? 50}
                  onChange={(_, v) => onStyleOptionsChange?.({ cinematic: v as number })}
                  min={0}
                  max={100}
                  color="primary"
                />
              </Box>

              {/* Faded */}
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
                    <OpacityIcon sx={{ fontSize: 16 }} />
                    Faded
                  </span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    {styleOptions?.faded ?? 50}
                  </span>
                </Box>
                <Slider
                  size="small"
                  value={styleOptions?.faded ?? 50}
                  onChange={(_, v) => onStyleOptionsChange?.({ faded: v as number })}
                  min={0}
                  max={100}
                  color="primary"
                />
              </Box>
            </Box>

          </Box>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default FineTuneControls;
