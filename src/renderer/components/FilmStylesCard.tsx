import MovieFilterIcon from '@mui/icons-material/MovieFilter';
import LandscapeIcon from '@mui/icons-material/Landscape';
import PortraitIcon from '@mui/icons-material/Portrait';
import StreetviewIcon from '@mui/icons-material/Streetview';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Paper,
  Typography,
  Stack,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import React, { useState, useMemo } from 'react';

type FilmStyle = {
  key: string;
  name: string;
  category: string; // Color Negative, Slide, B&W, Cine
  blurb: string;
  tags?: string[]; // For filtering by use case
};

type UseCaseFilter = 'all' | 'landscape' | 'portrait' | 'street';

interface FilmStylesCardProps {
  selected?: string;
  onSelect?: (style?: FilmStyle) => void;
}

const CATALOG: Record<string, FilmStyle[]> = {
  'Color Negative': [
    { key: 'kodak_portra_400', name: 'Kodak Portra 400', category: 'Color Negative', blurb: 'Warm skin tones, soft contrast, fine grain, forgiving latitude.', tags: ['portrait', 'landscape'] },
    { key: 'kodak_portra_160', name: 'Kodak Portra 160', category: 'Color Negative', blurb: 'Neutral warmth, very fine grain, smooth tonal roll-off in daylight.', tags: ['portrait', 'landscape'] },
    { key: 'kodak_portra_800', name: 'Kodak Portra 800', category: 'Color Negative', blurb: 'Low-light capable, warm skintones, pleasing grain with gentle contrast.', tags: ['portrait', 'street'] },
    { key: 'kodak_gold_200', name: 'Kodak Gold 200', category: 'Color Negative', blurb: 'Golden warmth, nostalgic palette, pleasant contrast and grain.', tags: ['landscape', 'street'] },
    { key: 'kodak_ultramax_400', name: 'Kodak UltraMax 400', category: 'Color Negative', blurb: 'Punchy consumer film, saturated color, forgiving latitude, visible grain.', tags: ['street'] },
    { key: 'kodak_colorplus_200', name: 'Kodak ColorPlus 200', category: 'Color Negative', blurb: 'Retro warmth, softer contrast, classic everyday film aesthetics.', tags: ['street'] },
    { key: 'kodak_ektar_100', name: 'Kodak Ektar 100', category: 'Color Negative', blurb: 'Ultra-vivid color, crisp micro-contrast, fine grain for daylight.', tags: ['landscape'] },
    { key: 'fuji_superia_400', name: 'Fuji Superia 400', category: 'Color Negative', blurb: 'Cooler greens, balanced contrast, pleasant consumer film vibe.', tags: ['landscape', 'street'] },
    { key: 'fuji_pro_400h', name: 'Fuji Pro 400H', category: 'Color Negative', blurb: 'Soft pastel color, cool greens, gentle contrast, airy highlights.', tags: ['portrait', 'landscape'] },
    { key: 'fujicolor_c200', name: 'Fujicolor C200', category: 'Color Negative', blurb: 'Fresh greens, clean blues, moderate contrast, affordable classic.', tags: ['landscape'] },
    { key: 'fuji_pro_160ns', name: 'Fujifilm Pro 160NS', category: 'Color Negative', blurb: 'Smooth skin tones, low contrast, pastel palette for portraits.', tags: ['portrait'] },
    { key: 'agfa_vista_200', name: 'Agfa Vista 200', category: 'Color Negative', blurb: 'Warm-leaning color, light grain, budget-friendly vintage look.', tags: ['street'] },
    { key: 'lomo_color_400', name: 'Lomography Color 400', category: 'Color Negative', blurb: 'Playful color shifts, strong grain, flexible exposure for fun looks.', tags: ['street'] },
    { key: 'lomo_800', name: 'Lomography 800', category: 'Color Negative', blurb: 'Night-friendly color with punchy contrast and prominent grain.', tags: ['street'] },
  ],
  'Color Positive': [
    { key: 'kodachrome_64', name: 'Kodachrome 64', category: 'Color Positive', blurb: 'Rich reds, deep blacks, high micro-contrast, classic vintage slide.', tags: ['landscape'] },
    { key: 'velvia_50', name: 'Fujifilm Velvia 50', category: 'Color Positive', blurb: 'Super-saturated color, strong contrast, especially vivid greens and reds.', tags: ['landscape'] },
    { key: 'provia_100f', name: 'Fujifilm Provia 100F', category: 'Color Positive', blurb: 'Neutral color slide, moderate contrast, clean and crisp tones.', tags: ['landscape', 'portrait'] },
    { key: 'velvia_100', name: 'Fujifilm Velvia 100', category: 'Color Positive', blurb: 'Slightly faster Velvia with bold saturation and high contrast.', tags: ['landscape'] },
    { key: 'astia_100f', name: 'Fujifilm Astia 100F', category: 'Color Positive', blurb: 'Soft contrast, gentle color, flattering skin tones for fashion.', tags: ['portrait'] },
    { key: 'ektachrome_e100', name: 'Kodak Ektachrome E100', category: 'Color Positive', blurb: 'Cool-neutral balance, crisp detail, modern slide with clean saturation.', tags: ['landscape', 'portrait'] },
  ],
  'Black & White': [
    { key: 'ilford_hp5_400', name: 'Ilford HP5 Plus 400', category: 'B&W', blurb: 'Classic grain, flexible contrast, versatile for street and portrait.', tags: ['street', 'portrait'] },
    { key: 'kodak_trix_400', name: 'Kodak Tri-X 400', category: 'B&W', blurb: 'Punchy contrast, gritty grain, timeless documentary aesthetics.', tags: ['street'] },
    { key: 'ilford_delta_3200', name: 'Ilford Delta 3200', category: 'B&W', blurb: 'Very high speed look, chunky grain, low light mood and texture.', tags: ['street'] },
    { key: 'ilford_fp4_125', name: 'Ilford FP4 Plus 125', category: 'B&W', blurb: 'Fine grain, classic midtones, moderate contrast for daylight work.', tags: ['landscape', 'portrait'] },
    { key: 'ilford_pan_f_50', name: 'Ilford Pan F 50', category: 'B&W', blurb: 'Ultra-fine grain, high resolution, rich tonality at low ISO.', tags: ['landscape', 'portrait'] },
    { key: 'kodak_tmax_100', name: 'Kodak T-Max 100', category: 'B&W', blurb: 'Modern T‑grain, extremely fine grain, clean tonality and high detail.', tags: ['landscape', 'portrait'] },
    { key: 'kodak_tmax_400', name: 'Kodak T-Max 400', category: 'B&W', blurb: 'Balanced modern grain, crisp tonality, flexible across lighting.', tags: ['street', 'portrait'] },
    { key: 'fuji_acros_100_ii', name: 'Fujifilm ACROS 100 II', category: 'B&W', blurb: 'Deep blacks, smooth midtones, subtle grain with long tonal range.', tags: ['landscape', 'portrait'] },
  ],
  'Cine / Tungsten': [
    { key: 'cinestill_800t', name: 'CineStill 800T', category: 'Cine', blurb: 'Tungsten balance, cyan halation glow, cinematic night color.', tags: ['street'] },
    { key: 'cinestill_50d', name: 'CineStill 50D', category: 'Cine', blurb: 'Daylight balance from cinema stock, ultra-fine grain, clean color.', tags: ['landscape', 'portrait'] },
    { key: 'vision3_500t', name: 'Kodak Vision3 500T', category: 'Cine', blurb: 'High-speed tungsten cine look, teal shadows, controlled highlights.', tags: ['street'] },
    { key: 'vision3_250d', name: 'Kodak Vision3 250D', category: 'Cine', blurb: 'Daylight cine look, wide latitude, subtle saturation and soft contrast.', tags: ['landscape', 'portrait'] },
  ],
};

const FilmStylesCard: React.FC<FilmStylesCardProps> = ({ selected, onSelect }) => {
  const [useCaseFilter, setUseCaseFilter] = useState<UseCaseFilter>('all');

  // Filter films based on use case
  const filteredCatalog = useMemo(() => {
    if (useCaseFilter === 'all') return CATALOG;

    const filtered: Record<string, FilmStyle[]> = {};
    Object.entries(CATALOG).forEach(([category, films]) => {
      const filteredFilms = films.filter(film =>
        film.tags?.includes(useCaseFilter) || false
      );
      if (filteredFilms.length > 0) {
        filtered[category] = filteredFilms;
      }
    });
    return filtered;
  }, [useCaseFilter]);

  const useCaseFilters = [
    { key: 'all', label: 'All', icon: null },
    { key: 'landscape', label: 'Landscape', icon: <LandscapeIcon /> },
    { key: 'portrait', label: 'Portrait', icon: <PortraitIcon /> },
    { key: 'street', label: 'Street', icon: <StreetviewIcon /> },
  ] as const;
  return (
    <Paper className="card slide-in" sx={{ p: 0, animationDelay: '0.1s' }}>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5, py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <MovieFilterIcon sx={{ color: 'primary.main', fontSize: 20 }} />
            <Box sx={{ flex: 1 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2c3338', margin: 0 }}>
                Film Styles
              </h3>
              <p style={{ fontSize: 12, color: '#5f6b74', margin: 0 }}>
                Choose a film stock aesthetic
              </p>
            </Box>
            {selected && (
              <Chip label="Applied" size="small" color="primary" variant="outlined" />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2.5 }}>
          {/* Use Case Filter Chips */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block', fontWeight: 600 }}>
              Filter by use case: {useCaseFilter !== 'all' && `(${Object.values(filteredCatalog).flat().length} films)`}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {useCaseFilters.map((filter) => (
                <Chip
                  key={filter.key}
                  label={filter.label}
                  icon={filter.icon || undefined}
                  size="small"
                  variant={useCaseFilter === filter.key ? 'filled' : 'outlined'}
                  color={useCaseFilter === filter.key ? 'primary' : 'default'}
                  onClick={() => setUseCaseFilter(filter.key as UseCaseFilter)}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: useCaseFilter === filter.key ? undefined : 'action.hover',
                    },
                  }}
                />
              ))}
            </Stack>
          </Box>

          <Box sx={{ display: 'grid', gap: 1.5, maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
            {Object.entries(filteredCatalog).map(([group, items]) => (
              <Box key={group}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 0.5, fontWeight: 700 }}>
                  {group}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                  {items.map(item => {
                    const isSel = selected === item.key;
                    return (
                      <Paper
                        key={item.key}
                        variant="outlined"
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSel}
                        onClick={() => onSelect?.(isSel ? undefined : item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelect?.(isSel ? undefined : item);
                          }
                        }}
                        sx={{
                          p: 1,
                          borderRadius: 2,
                          cursor: 'pointer',
                          outline: 'none',
                          borderColor: isSel ? 'primary.main' : undefined,
                          backgroundColor: isSel ? 'rgba(91,102,112,0.06)' : 'background.paper',
                          '&:hover': { backgroundColor: isSel ? 'rgba(91,102,112,0.08)' : 'rgba(91,102,112,0.04)' },
                          '&:focus-visible': { boxShadow: 'none' },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#2c3338' }} noWrap>
                            {item.name}
                          </Typography>
                          <Chip size="small" label={item.category} variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.secondary', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', mb: 0.75 }}
                        >
                          {item.blurb}
                        </Typography>
                      </Paper>
                    );
                  })}
                </Box>
              </Box>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default FilmStylesCard;
