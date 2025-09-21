import AcUnitIcon from '@mui/icons-material/AcUnit';
import BlurOnIcon from '@mui/icons-material/BlurOn';
import BrushIcon from '@mui/icons-material/Brush';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import LandscapeIcon from '@mui/icons-material/Landscape';
import LightModeIcon from '@mui/icons-material/LightMode';
import MovieIcon from '@mui/icons-material/Movie';
import MovieFilterIcon from '@mui/icons-material/MovieFilter';
import NatureIcon from '@mui/icons-material/Nature';
import NightlightIcon from '@mui/icons-material/Nightlight';
import PaletteIcon from '@mui/icons-material/Palette';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';
import StreetviewIcon from '@mui/icons-material/Streetview';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import WavesIcon from '@mui/icons-material/Waves';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import { Box, Chip, Paper, TextField } from '@mui/material';
import React from 'react';

interface StyleDescriptionCardProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  selectedStyleCategories?: string[];
  onStyleCategoriesChange?: (categories: string[]) => void;
}

const StyleDescriptionCard: React.FC<StyleDescriptionCardProps> = ({ 
  prompt, 
  onPromptChange, 
  selectedStyleCategories = [],
  onStyleCategoriesChange
}) => {
  // Unified style categories (merged from legacy vibe options and new categories)
  const styleCategories = [
    // Photography Types
    { icon: <PersonIcon sx={{ fontSize: 16 }} />, label: 'Portrait', category: 'photography' },
    { icon: <LandscapeIcon sx={{ fontSize: 16 }} />, label: 'Landscape', category: 'photography' },
    { icon: <StreetviewIcon sx={{ fontSize: 16 }} />, label: 'Street', category: 'photography' },
    { icon: <CameraAltIcon sx={{ fontSize: 16 }} />, label: 'Documentary', category: 'photography' },
    
    // Visual Styles
    { icon: <MovieIcon sx={{ fontSize: 16 }} />, label: 'Cinematic', category: 'style' },
    { icon: <PaletteIcon sx={{ fontSize: 16 }} />, label: 'Soft Pastel', category: 'style' },
    { icon: <WhatshotIcon sx={{ fontSize: 16 }} />, label: 'High Contrast', category: 'style' },
    { icon: <BlurOnIcon sx={{ fontSize: 16 }} />, label: 'Desaturated', category: 'style' },
    { icon: <BrushIcon sx={{ fontSize: 16 }} />, label: 'Punchy Pop', category: 'style' },
    { icon: <StarIcon sx={{ fontSize: 16 }} />, label: 'Soft Glow', category: 'style' },
    
    // Color Palettes
    { icon: <WbSunnyIcon sx={{ fontSize: 16 }} />, label: 'Warm Sunset', category: 'color' },
    { icon: <NightlightIcon sx={{ fontSize: 16 }} />, label: 'Cool Blue Hour', category: 'color' },
    { icon: <LightModeIcon sx={{ fontSize: 16 }} />, label: 'Golden Hour', category: 'color' },
    { icon: <AcUnitIcon sx={{ fontSize: 16 }} />, label: 'Teal & Orange', category: 'color' },
    { icon: <NatureIcon sx={{ fontSize: 16 }} />, label: 'Earthy Tones', category: 'color' },
    { icon: <BubbleChartIcon sx={{ fontSize: 16 }} />, label: 'Pastel Dream', category: 'color' },
    
    // Film & Vintage
    { icon: <MovieFilterIcon sx={{ fontSize: 16 }} />, label: 'Matte Film', category: 'film' },
    { icon: <WavesIcon sx={{ fontSize: 16 }} />, label: 'Moody Ocean', category: 'film' },
    { icon: <CameraAltIcon sx={{ fontSize: 16 }} />, label: 'Vintage', category: 'film' },
  ];

  const handleCategoryToggle = (categoryLabel: string) => {
    if (!onStyleCategoriesChange) return;
    
    const isSelected = selectedStyleCategories.includes(categoryLabel);
    if (isSelected) {
      // Remove category
      onStyleCategoriesChange(selectedStyleCategories.filter(cat => cat !== categoryLabel));
    } else {
      // Add category
      onStyleCategoriesChange([...selectedStyleCategories, categoryLabel]);
    }
  };

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

      {/* Unified style categories (multi-select) */}
      {onStyleCategoriesChange && (
        <Box sx={{ mt: 1.5 }}>
          <Box sx={{ fontSize: 12, fontWeight: 600, color: '#374151', mb: 1 }}>
            Style Categories
          </Box>
          
          {/* Photography Types */}
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ fontSize: 11, fontWeight: 500, color: '#6b7280', mb: 0.5 }}>
              Photography Types
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {styleCategories.filter(cat => cat.category === 'photography').map(option => {
                const selected = selectedStyleCategories.includes(option.label);
                return (
                  <Chip
                    key={option.label}
                    label={option.label}
                    icon={option.icon}
                    onClick={() => handleCategoryToggle(option.label)}
                    color={selected ? 'primary' : 'default'}
                    variant={selected ? 'filled' : 'outlined'}
                    size="small"
                    sx={{
                      cursor: 'pointer',
                      '& .MuiChip-icon': {
                        fontSize: 16,
                      },
                    }}
                  />
                );
              })}
            </Box>
          </Box>

          {/* Visual Styles */}
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ fontSize: 11, fontWeight: 500, color: '#6b7280', mb: 0.5 }}>
              Visual Styles
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {styleCategories.filter(cat => cat.category === 'style').map(option => {
                const selected = selectedStyleCategories.includes(option.label);
                return (
                  <Chip
                    key={option.label}
                    label={option.label}
                    icon={option.icon}
                    onClick={() => handleCategoryToggle(option.label)}
                    color={selected ? 'primary' : 'default'}
                    variant={selected ? 'filled' : 'outlined'}
                    size="small"
                    sx={{
                      cursor: 'pointer',
                      '& .MuiChip-icon': {
                        fontSize: 16,
                      },
                    }}
                  />
                );
              })}
            </Box>
          </Box>

          {/* Color Palettes */}
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ fontSize: 11, fontWeight: 500, color: '#6b7280', mb: 0.5 }}>
              Color Palettes
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {styleCategories.filter(cat => cat.category === 'color').map(option => {
                const selected = selectedStyleCategories.includes(option.label);
                return (
                  <Chip
                    key={option.label}
                    label={option.label}
                    icon={option.icon}
                    onClick={() => handleCategoryToggle(option.label)}
                    color={selected ? 'primary' : 'default'}
                    variant={selected ? 'filled' : 'outlined'}
                    size="small"
                    sx={{
                      cursor: 'pointer',
                      '& .MuiChip-icon': {
                        fontSize: 16,
                      },
                    }}
                  />
                );
              })}
            </Box>
          </Box>

          {/* Film & Vintage */}
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ fontSize: 11, fontWeight: 500, color: '#6b7280', mb: 0.5 }}>
              Film & Vintage
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {styleCategories.filter(cat => cat.category === 'film').map(option => {
                const selected = selectedStyleCategories.includes(option.label);
                return (
                  <Chip
                    key={option.label}
                    label={option.label}
                    icon={option.icon}
                    onClick={() => handleCategoryToggle(option.label)}
                    color={selected ? 'primary' : 'default'}
                    variant={selected ? 'filled' : 'outlined'}
                    size="small"
                    sx={{
                      cursor: 'pointer',
                      '& .MuiChip-icon': {
                        fontSize: 16,
                      },
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default StyleDescriptionCard;
