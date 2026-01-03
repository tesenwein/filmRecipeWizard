import ColorLensIcon from '@mui/icons-material/ColorLens';
import { Box, FormControl, MenuItem, Paper, Select, Typography } from '@mui/material';
import React from 'react';
import { StyleOptions } from '../../shared/types';

interface ColorProfileSelectorProps {
  styleOptions?: StyleOptions;
  onStyleOptionsChange?: (update: Partial<StyleOptions>) => void;
}

type ColorProfile = 'color' | 'black_and_white' | 'flat';

const profileOptions: { value: ColorProfile; label: string; description: string; adobeProfile: string }[] = [
  { value: 'color', label: 'Color', description: 'Full color reproduction', adobeProfile: 'Adobe Color' },
  { value: 'black_and_white', label: 'Black & White', description: 'Monochrome conversion', adobeProfile: 'Adobe Monochrome' },
  { value: 'flat', label: 'Flat Colors', description: 'Neutral, flat color profile', adobeProfile: 'Adobe Color' },
];

const ColorProfileSelector: React.FC<ColorProfileSelectorProps> = ({
  styleOptions,
  onStyleOptionsChange,
}) => {
  // Default to 'color' if not set
  const currentProfile: ColorProfile = (styleOptions?.colorProfile as ColorProfile) || 'color';
  const selectedOption = profileOptions.find(opt => opt.value === currentProfile) || profileOptions[0];

  const handleChange = (value: ColorProfile) => {
    onStyleOptionsChange?.({ colorProfile: value });
  };

  return (
    <Paper className="card slide-in" sx={{ p: 2.5, animationDelay: '0.1s' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <ColorLensIcon sx={{ color: 'primary.main', fontSize: 20 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700, color: '#2c3338', margin: 0 }}>
            Color Profile
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 12, color: '#5f6b74', margin: 0 }}>
            Select the base color profile for the recipe
          </Typography>
        </Box>
      </Box>

      <FormControl fullWidth size="small">
        <Select
          value={currentProfile}
          onChange={(e) => handleChange(e.target.value as ColorProfile)}
          displayEmpty
          renderValue={(selected) => {
            if (!selected) {
              return <Typography sx={{ fontSize: 14, color: '#6b7280' }}>Select profile...</Typography>;
            }
            const option = profileOptions.find(opt => opt.value === selected);
            return option ? option.label : selected;
          }}
          sx={{
            borderRadius: 2,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(0, 0, 0, 0.12)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
            },
          }}
        >
          {profileOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Box>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#2c3338' }}>
                  {option.label}
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#6b7280' }}>
                  {option.description}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ mt: 1.5, p: 1.5, backgroundColor: 'rgba(63, 81, 181, 0.04)', borderRadius: 1.5 }}>
        <Typography sx={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>
          Using: <span style={{ color: '#374151', fontWeight: 600 }}>{selectedOption.adobeProfile}</span>
        </Typography>
      </Box>
    </Paper>
  );
};

export default ColorProfileSelector;

