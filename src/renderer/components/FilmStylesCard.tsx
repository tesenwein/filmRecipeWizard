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
    { key: 'kodak_gold_200', name: 'Kodak Gold 200', category: 'Color Negative', blurb: 'Golden warmth, nostalgic palette, pleasant contrast and grain.' },
    { key: 'kodak_ektar_100', name: 'Kodak Ektar 100', category: 'Color Negative', blurb: 'Ultra-vivid color, crisp micro-contrast, fine grain for daylight.' },
    { key: 'fuji_superia_400', name: 'Fuji Superia 400', category: 'Color Negative', blurb: 'Cooler greens, balanced contrast, pleasant consumer film vibe.' },
    { key: 'fuji_pro_400h', name: 'Fuji Pro 400H', category: 'Color Negative', blurb: 'Soft pastel color, cool greens, gentle contrast, airy highlights.' },
  ],
  'Slide (E-6)': [
    { key: 'kodachrome_64', name: 'Kodachrome 64', category: 'Slide', blurb: 'Rich reds, deep blacks, high micro-contrast, classic vintage slide.' },
    { key: 'velvia_50', name: 'Fujifilm Velvia 50', category: 'Slide', blurb: 'Super-saturated color, strong contrast, especially vivid greens and reds.' },
    { key: 'provia_100f', name: 'Fujifilm Provia 100F', category: 'Slide', blurb: 'Neutral color slide, moderate contrast, clean and crisp tones.' },
  ],
  'Black & White': [
    { key: 'ilford_hp5_400', name: 'Ilford HP5 Plus 400', category: 'B&W', blurb: 'Classic grain, flexible contrast, versatile for street and portrait.' },
    { key: 'kodak_trix_400', name: 'Kodak Tri-X 400', category: 'B&W', blurb: 'Punchy contrast, gritty grain, timeless documentary aesthetics.' },
    { key: 'ilford_delta_3200', name: 'Ilford Delta 3200', category: 'B&W', blurb: 'Very high speed look, chunky grain, low light mood and texture.' },
  ],
  'Cine / Tungsten': [
    { key: 'cinestill_800t', name: 'CineStill 800T', category: 'Cine', blurb: 'Tungsten balance, cyan halation glow, cinematic night color.' },
  ],
};

const FilmStylesCard: React.FC<FilmStylesCardProps> = ({ selected, onSelect }) => {
  return (
    <Paper className="card slide-in" sx={{ p: 0, animationDelay: '0.1s' }}>
      <Accordion disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
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
