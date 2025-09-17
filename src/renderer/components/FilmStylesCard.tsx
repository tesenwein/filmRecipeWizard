import MovieFilterIcon from '@mui/icons-material/MovieFilter';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Paper,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import React from 'react';

type FilmStyle = {
  key: string;
  name: string;
  category: string; // Color Negative, Slide, B&W, Cine
  blurb: string;
};

interface FilmStylesCardProps {
  selected?: string;
  onSelect?: (style?: FilmStyle) => void;
}

const CATALOG: Record<string, FilmStyle[]> = {
  'Color Negative': [
    { key: 'kodak_portra_400', name: 'Kodak Portra 400', category: 'Color Negative', blurb: 'Warm skin tones, soft contrast, fine grain, forgiving latitude.' },
    { key: 'kodak_portra_160', name: 'Kodak Portra 160', category: 'Color Negative', blurb: 'Neutral warmth, very fine grain, smooth tonal roll-off in daylight.' },
    { key: 'kodak_portra_800', name: 'Kodak Portra 800', category: 'Color Negative', blurb: 'Low-light capable, warm skintones, pleasing grain with gentle contrast.' },
    { key: 'kodak_gold_200', name: 'Kodak Gold 200', category: 'Color Negative', blurb: 'Golden warmth, nostalgic palette, pleasant contrast and grain.' },
    { key: 'kodak_ultramax_400', name: 'Kodak UltraMax 400', category: 'Color Negative', blurb: 'Punchy consumer film, saturated color, forgiving latitude, visible grain.' },
    { key: 'kodak_colorplus_200', name: 'Kodak ColorPlus 200', category: 'Color Negative', blurb: 'Retro warmth, softer contrast, classic everyday film aesthetics.' },
    { key: 'kodak_ektar_100', name: 'Kodak Ektar 100', category: 'Color Negative', blurb: 'Ultra-vivid color, crisp micro-contrast, fine grain for daylight.' },
    { key: 'fuji_superia_400', name: 'Fuji Superia 400', category: 'Color Negative', blurb: 'Cooler greens, balanced contrast, pleasant consumer film vibe.' },
    { key: 'fuji_pro_400h', name: 'Fuji Pro 400H', category: 'Color Negative', blurb: 'Soft pastel color, cool greens, gentle contrast, airy highlights.' },
    { key: 'fujicolor_c200', name: 'Fujicolor C200', category: 'Color Negative', blurb: 'Fresh greens, clean blues, moderate contrast, affordable classic.' },
    { key: 'fuji_pro_160ns', name: 'Fujifilm Pro 160NS', category: 'Color Negative', blurb: 'Smooth skin tones, low contrast, pastel palette for portraits.' },
    { key: 'agfa_vista_200', name: 'Agfa Vista 200', category: 'Color Negative', blurb: 'Warm-leaning color, light grain, budget-friendly vintage look.' },
    { key: 'lomo_color_400', name: 'Lomography Color 400', category: 'Color Negative', blurb: 'Playful color shifts, strong grain, flexible exposure for fun looks.' },
    { key: 'lomo_800', name: 'Lomography 800', category: 'Color Negative', blurb: 'Night-friendly color with punchy contrast and prominent grain.' },
  ],
  'Color Positive': [
    { key: 'kodachrome_64', name: 'Kodachrome 64', category: 'Color Positive', blurb: 'Rich reds, deep blacks, high micro-contrast, classic vintage slide.' },
    { key: 'velvia_50', name: 'Fujifilm Velvia 50', category: 'Color Positive', blurb: 'Super-saturated color, strong contrast, especially vivid greens and reds.' },
    { key: 'provia_100f', name: 'Fujifilm Provia 100F', category: 'Color Positive', blurb: 'Neutral color slide, moderate contrast, clean and crisp tones.' },
    { key: 'velvia_100', name: 'Fujifilm Velvia 100', category: 'Color Positive', blurb: 'Slightly faster Velvia with bold saturation and high contrast.' },
    { key: 'astia_100f', name: 'Fujifilm Astia 100F', category: 'Color Positive', blurb: 'Soft contrast, gentle color, flattering skin tones for fashion.' },
    { key: 'ektachrome_e100', name: 'Kodak Ektachrome E100', category: 'Color Positive', blurb: 'Cool-neutral balance, crisp detail, modern slide with clean saturation.' },
  ],
  'Black & White': [
    { key: 'ilford_hp5_400', name: 'Ilford HP5 Plus 400', category: 'B&W', blurb: 'Classic grain, flexible contrast, versatile for street and portrait.' },
    { key: 'kodak_trix_400', name: 'Kodak Tri-X 400', category: 'B&W', blurb: 'Punchy contrast, gritty grain, timeless documentary aesthetics.' },
    { key: 'ilford_delta_3200', name: 'Ilford Delta 3200', category: 'B&W', blurb: 'Very high speed look, chunky grain, low light mood and texture.' },
    { key: 'ilford_fp4_125', name: 'Ilford FP4 Plus 125', category: 'B&W', blurb: 'Fine grain, classic midtones, moderate contrast for daylight work.' },
    { key: 'ilford_pan_f_50', name: 'Ilford Pan F 50', category: 'B&W', blurb: 'Ultra-fine grain, high resolution, rich tonality at low ISO.' },
    { key: 'kodak_tmax_100', name: 'Kodak T-Max 100', category: 'B&W', blurb: 'Modern T‑grain, extremely fine grain, clean tonality and high detail.' },
    { key: 'kodak_tmax_400', name: 'Kodak T-Max 400', category: 'B&W', blurb: 'Balanced modern grain, crisp tonality, flexible across lighting.' },
    { key: 'fuji_acros_100_ii', name: 'Fujifilm ACROS 100 II', category: 'B&W', blurb: 'Deep blacks, smooth midtones, subtle grain with long tonal range.' },
  ],
  'Cine / Tungsten': [
    { key: 'cinestill_800t', name: 'CineStill 800T', category: 'Cine', blurb: 'Tungsten balance, cyan halation glow, cinematic night color.' },
    { key: 'cinestill_50d', name: 'CineStill 50D', category: 'Cine', blurb: 'Daylight balance from cinema stock, ultra-fine grain, clean color.' },
    { key: 'vision3_500t', name: 'Kodak Vision3 500T', category: 'Cine', blurb: 'High-speed tungsten cine look, teal shadows, controlled highlights.' },
    { key: 'vision3_250d', name: 'Kodak Vision3 250D', category: 'Cine', blurb: 'Daylight cine look, wide latitude, subtle saturation and soft contrast.' },
  ],
};

const FilmStylesCard: React.FC<FilmStylesCardProps> = ({ selected, onSelect }) => {
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
            {selected ? (
              <Chip label="Applied" size="small" color="primary" variant="outlined" />
            ) : (
              <Chip label="Optional" size="small" variant="outlined" />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2.5 }}>
          <Box sx={{ display: 'grid', gap: 1.5, maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
            {Object.entries(CATALOG).map(([group, items]) => (
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
