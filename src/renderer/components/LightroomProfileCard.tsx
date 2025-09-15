import { Paper, Typography, FormControl, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import React from 'react';
import { LightroomProfile, getLightroomProfileDisplayName } from '../../shared/types';

interface LightroomProfileCardProps {
  selected?: LightroomProfile;
  onSelect: (profile: LightroomProfile) => void;
}

const LightroomProfileCard: React.FC<LightroomProfileCardProps> = ({
  selected = LightroomProfile.ADOBE_COLOR,
  onSelect,
}) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value as LightroomProfile;
    onSelect(value);
  };

  const getProfileDescription = (profile: LightroomProfile) => {
    switch (profile) {
      case LightroomProfile.ADOBE_COLOR:
        return 'Enhanced color rendition with improved contrast and vibrance';
      case LightroomProfile.ADOBE_MONOCHROME:
        return 'Black and white with optimized tonal range and contrast';
      case LightroomProfile.FLAT:
        return 'Minimal processing for maximum editing flexibility';
      default:
        return '';
    }
  };


  return (
    <Paper className="card slide-in" elevation={0} sx={{ p: 2.5 }}>
      <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1.5 }}>
        Lightroom Base Profile
      </Typography>

      <FormControl fullWidth size="small">
        <Select
          value={selected}
          onChange={handleChange}
          sx={{
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(0, 0, 0, 0.23)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(0, 0, 0, 0.23)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
            }
          }}
        >
          <MenuItem value={LightroomProfile.ADOBE_COLOR}>
            {getLightroomProfileDisplayName(LightroomProfile.ADOBE_COLOR)}
          </MenuItem>
          <MenuItem value={LightroomProfile.ADOBE_MONOCHROME}>
            {getLightroomProfileDisplayName(LightroomProfile.ADOBE_MONOCHROME)}
          </MenuItem>
          <MenuItem value={LightroomProfile.FLAT}>
            {getLightroomProfileDisplayName(LightroomProfile.FLAT)}
          </MenuItem>
        </Select>
      </FormControl>

      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          mt: 1,
          display: 'block',
          fontSize: '0.75rem',
          lineHeight: 1.4
        }}
      >
        {getProfileDescription(selected)}
      </Typography>
    </Paper>
  );
};

export default LightroomProfileCard;