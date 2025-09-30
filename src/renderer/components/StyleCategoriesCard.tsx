import AcUnitIcon from '@mui/icons-material/AcUnit';
import BlurOnIcon from '@mui/icons-material/BlurOn';
import BrushIcon from '@mui/icons-material/Brush';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CategoryIcon from '@mui/icons-material/Category';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
import WavesIcon from '@mui/icons-material/Waves';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Paper } from '@mui/material';
import React from 'react';

interface StyleCategoriesCardProps {
  selectedStyleCategories?: string[];
  onStyleCategoriesChange?: (categories: string[]) => void;
}

const StyleCategoriesCard: React.FC<StyleCategoriesCardProps> = ({
  selectedStyleCategories = [],
  onStyleCategoriesChange
}) => {
  // Style categories for recipe customization
  const styleCategories = [
    // Photography Types
    { icon: <PersonIcon sx={{ fontSize: 16 }} />, label: 'Portrait', category: 'photography' },
    { icon: <LandscapeIcon sx={{ fontSize: 16 }} />, label: 'Landscape', category: 'photography' },
    { icon: <StreetviewIcon sx={{ fontSize: 16 }} />, label: 'Street', category: 'photography' },
    { icon: <CameraAltIcon sx={{ fontSize: 16 }} />, label: 'Documentary', category: 'photography' },
    { icon: <StarIcon sx={{ fontSize: 16 }} />, label: 'Fashion', category: 'photography' },
    { icon: <NatureIcon sx={{ fontSize: 16 }} />, label: 'Nature', category: 'photography' },
    { icon: <WavesIcon sx={{ fontSize: 16 }} />, label: 'Architecture', category: 'photography' },
    { icon: <BrushIcon sx={{ fontSize: 16 }} />, label: 'Fine Art', category: 'photography' },
    
    // Visual Styles
    { icon: <MovieIcon sx={{ fontSize: 16 }} />, label: 'Cinematic', category: 'style' },
    { icon: <PaletteIcon sx={{ fontSize: 16 }} />, label: 'Soft Pastel', category: 'style' },
    { icon: <WhatshotIcon sx={{ fontSize: 16 }} />, label: 'High Contrast', category: 'style' },
    { icon: <BlurOnIcon sx={{ fontSize: 16 }} />, label: 'Desaturated', category: 'style' },
    { icon: <BrushIcon sx={{ fontSize: 16 }} />, label: 'Punchy Pop', category: 'style' },
    { icon: <StarIcon sx={{ fontSize: 16 }} />, label: 'Soft Glow', category: 'style' },
    { icon: <AcUnitIcon sx={{ fontSize: 16 }} />, label: 'Moody', category: 'style' },
    { icon: <LightModeIcon sx={{ fontSize: 16 }} />, label: 'Bright & Airy', category: 'style' },
    { icon: <NightlightIcon sx={{ fontSize: 16 }} />, label: 'Dark & Dramatic', category: 'style' },
    { icon: <BubbleChartIcon sx={{ fontSize: 16 }} />, label: 'Minimalist', category: 'style' },
    { icon: <WavesIcon sx={{ fontSize: 16 }} />, label: 'Grunge', category: 'style' },
    
    // Color Palettes
    { icon: <WbSunnyIcon sx={{ fontSize: 16 }} />, label: 'Warm Sunset', category: 'color' },
    { icon: <NightlightIcon sx={{ fontSize: 16 }} />, label: 'Cool Blue Hour', category: 'color' },
    { icon: <LightModeIcon sx={{ fontSize: 16 }} />, label: 'Golden Hour', category: 'color' },
    { icon: <AcUnitIcon sx={{ fontSize: 16 }} />, label: 'Teal & Orange', category: 'color' },
    { icon: <NatureIcon sx={{ fontSize: 16 }} />, label: 'Earthy Tones', category: 'color' },
    { icon: <BubbleChartIcon sx={{ fontSize: 16 }} />, label: 'Pastel Dream', category: 'color' },
    { icon: <PaletteIcon sx={{ fontSize: 16 }} />, label: 'Monochrome', category: 'color' },
    { icon: <StarIcon sx={{ fontSize: 16 }} />, label: 'Sepia', category: 'color' },
    { icon: <WavesIcon sx={{ fontSize: 16 }} />, label: 'Cyanotype', category: 'color' },
    { icon: <WhatshotIcon sx={{ fontSize: 16 }} />, label: 'Split Tone', category: 'color' },
    { icon: <BrushIcon sx={{ fontSize: 16 }} />, label: 'Duotone', category: 'color' },
    { icon: <MovieIcon sx={{ fontSize: 16 }} />, label: 'Cross Process', category: 'color' },
    
    // Film & Vintage
    { icon: <MovieFilterIcon sx={{ fontSize: 16 }} />, label: 'Matte Film', category: 'film' },
    { icon: <WavesIcon sx={{ fontSize: 16 }} />, label: 'Moody Ocean', category: 'film' },
    { icon: <CameraAltIcon sx={{ fontSize: 16 }} />, label: 'Vintage', category: 'film' },
    { icon: <StarIcon sx={{ fontSize: 16 }} />, label: 'Lomography', category: 'film' },
    { icon: <NatureIcon sx={{ fontSize: 16 }} />, label: 'Polaroid', category: 'film' },
    { icon: <PaletteIcon sx={{ fontSize: 16 }} />, label: 'Kodachrome', category: 'film' },
    { icon: <LightModeIcon sx={{ fontSize: 16 }} />, label: 'Fuji Colors', category: 'film' },
    { icon: <AcUnitIcon sx={{ fontSize: 16 }} />, label: 'Cinema', category: 'film' },
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
    <Paper className="card slide-in" sx={{ p: 0, animationDelay: '0.06s' }}>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5, py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <CategoryIcon sx={{ color: 'primary.main', fontSize: 20 }} />
            <Box sx={{ flex: 1 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2c3338', margin: 0 }}>
                Style Categories
              </h3>
              <p style={{ fontSize: 12, color: '#5f6b74', margin: 0 }}>
                Photography Types • Visual Styles • Color Palettes • Film & Vintage
              </p>
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2.5 }}>
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
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default StyleCategoriesCard;
