import AcUnitIcon from '@mui/icons-material/AcUnit';
import BlurOnIcon from '@mui/icons-material/BlurOn';
import BrushIcon from '@mui/icons-material/Brush';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import LightModeIcon from '@mui/icons-material/LightMode';
import MovieIcon from '@mui/icons-material/Movie';
import MovieFilterIcon from '@mui/icons-material/MovieFilter';
import NatureIcon from '@mui/icons-material/Nature';
import NightlightIcon from '@mui/icons-material/Nightlight';
import PaletteIcon from '@mui/icons-material/Palette';
import StarIcon from '@mui/icons-material/Star';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import WavesIcon from '@mui/icons-material/Waves';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import { Box, Button, Paper, TextField } from '@mui/material';
import React from 'react';

interface StyleDescriptionCardProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  selectedVibe?: string;
  onVibeChange?: (vibe: string) => void;
}

const StyleDescriptionCard: React.FC<StyleDescriptionCardProps> = ({ prompt, onPromptChange, selectedVibe, onVibeChange }) => {
  const vibeOptions = [
    { icon: <MovieIcon sx={{ fontSize: 16 }} />, label: 'Cinematic' },
    { icon: <PaletteIcon sx={{ fontSize: 16 }} />, label: 'Soft Pastel' },
    { icon: <WavesIcon sx={{ fontSize: 16 }} />, label: 'Moody Ocean' },
    { icon: <CameraAltIcon sx={{ fontSize: 16 }} />, label: 'Vintage' },
    { icon: <WhatshotIcon sx={{ fontSize: 16 }} />, label: 'High Contrast' },
    { icon: <BlurOnIcon sx={{ fontSize: 16 }} />, label: 'Desaturated' },
    { icon: <WbSunnyIcon sx={{ fontSize: 16 }} />, label: 'Warm Sunset' },
    { icon: <NightlightIcon sx={{ fontSize: 16 }} />, label: 'Cool Blue Hour' },
    { icon: <MovieFilterIcon sx={{ fontSize: 16 }} />, label: 'Matte Film' },
    { icon: <BrushIcon sx={{ fontSize: 16 }} />, label: 'Punchy Pop' },
    { icon: <StarIcon sx={{ fontSize: 16 }} />, label: 'Soft Glow' },
    { icon: <NatureIcon sx={{ fontSize: 16 }} />, label: 'Earthy Tones' },
    { icon: <BubbleChartIcon sx={{ fontSize: 16 }} />, label: 'Pastel Dream' },
    { icon: <LightModeIcon sx={{ fontSize: 16 }} />, label: 'Golden Hour' },
    { icon: <AcUnitIcon sx={{ fontSize: 16 }} />, label: 'Teal & Orange' },
  ];

  return (
    <Paper className="card slide-in" sx={{ p: 2.5, animationDelay: '0.05s' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <TipsAndUpdatesIcon sx={{ color: 'primary.main', fontSize: 20 }} />
        <Box sx={{ flex: 1 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2c3338', margin: 0 }}>Style Description</h3>
          <p style={{ fontSize: 12, color: '#5f6b74', margin: 0 }}>Describe your desired look</p>
        </Box>
      </Box>

      <TextField
        id="prompt-input"
        value={prompt}
        onChange={e => onPromptChange(e.target.value)}
        placeholder="e.g., Warm golden hour tones, soft contrast, teal shadows, gentle film grain"
        fullWidth
        multiline
        minRows={2}
        size="small"
      />

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
        {vibeOptions.map(option => {
          const selected = (selectedVibe || '') === option.label;
          return (
            <Button
              key={option.label}
              size="small"
              variant={selected ? 'contained' : 'outlined'}
              onClick={() => onVibeChange?.(option.label)}
              startIcon={option.icon}
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                borderRadius: 2,
                fontSize: 12,
                py: 0.5,
                px: 1.5,
              }}
            >
              {option.label}
            </Button>
          );
        })}
      </Box>
    </Paper>
  );
};

export default StyleDescriptionCard;
