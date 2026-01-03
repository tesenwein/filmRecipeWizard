import { Box, FormControlLabel, Paper, Switch, Typography } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import React from 'react';
import { StyleOptions } from '../../shared/types';

interface ModificationTogglesCardProps {
  styleOptions?: StyleOptions;
  onStyleOptionsChange?: (update: Partial<StyleOptions>) => void;
}

const ModificationTogglesCard: React.FC<ModificationTogglesCardProps> = ({
  styleOptions,
  onStyleOptionsChange,
}) => {
  // Default all toggles to true if not set
  const getToggleValue = (key: keyof StyleOptions): boolean => {
    const value = styleOptions?.[key];
    return value === undefined ? true : value === true;
  };

  const handleToggle = (key: keyof StyleOptions, value: boolean) => {
    onStyleOptionsChange?.({ [key]: value });
  };

  return (
    <Paper className="card slide-in" sx={{ p: 2.5, animationDelay: '0.15s' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <SettingsIcon sx={{ color: 'primary.main', fontSize: 20 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700, color: '#2c3338', margin: 0 }}>
            Modifications
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 12, color: '#5f6b74', margin: 0 }}>
            Enable specific adjustment types in AI generation
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <FormControlLabel
          control={
            <Switch
              checked={getToggleValue('enableCurves')}
              onChange={(e) => handleToggle('enableCurves', e.target.checked)}
              color="primary"
            />
          }
          label={
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                Tone Curves
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#6b7280' }}>
                RGB and channel-specific tone curves
              </Typography>
            </Box>
          }
        />

        <FormControlLabel
          control={
            <Switch
              checked={getToggleValue('enableColorGrading')}
              onChange={(e) => handleToggle('enableColorGrading', e.target.checked)}
              color="primary"
            />
          }
          label={
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                Color Grading
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#6b7280' }}>
                Shadow, midtone, and highlight color grading
              </Typography>
            </Box>
          }
        />

        <FormControlLabel
          control={
            <Switch
              checked={getToggleValue('enableHSL')}
              onChange={(e) => handleToggle('enableHSL', e.target.checked)}
              color="primary"
            />
          }
          label={
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                HSL Adjustments
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#6b7280' }}>
                Hue, saturation, and luminance per color
              </Typography>
            </Box>
          }
        />

        <FormControlLabel
          control={
            <Switch
              checked={getToggleValue('enableGrain')}
              onChange={(e) => handleToggle('enableGrain', e.target.checked)}
              color="primary"
            />
          }
          label={
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                Film Grain
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#6b7280' }}>
                Grain amount, size, and frequency
              </Typography>
            </Box>
          }
        />

        <FormControlLabel
          control={
            <Switch
              checked={getToggleValue('enableVignette')}
              onChange={(e) => handleToggle('enableVignette', e.target.checked)}
              color="primary"
            />
          }
          label={
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                Vignette
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#6b7280' }}>
                Post-crop vignette effects
              </Typography>
            </Box>
          }
        />

        <FormControlLabel
          control={
            <Switch
              checked={getToggleValue('enablePointColor')}
              onChange={(e) => handleToggle('enablePointColor', e.target.checked)}
              color="primary"
            />
          }
          label={
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                Point Color
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#6b7280' }}>
                Targeted color corrections
              </Typography>
            </Box>
          }
        />
      </Box>
    </Paper>
  );
};

export default ModificationTogglesCard;

