import BrushIcon from '@mui/icons-material/Brush';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Paper, Typography } from '@mui/material';
import React from 'react';

type ArtistStyle = {
  key: string;
  name: string;
  category: string; // Portrait, Landscape, Street, Editorial
  blurb: string;
};

interface ArtisticStylesCardProps {
  selected?: string;
  onSelect?: (style?: ArtistStyle) => void;
}

const CATALOG: Record<string, ArtistStyle[]> = {
  Portrait: [
    {
      key: 'leibovitz',
      name: 'Annie Leibovitz',
      category: 'Portrait',
      blurb: 'Dramatic portraiture, controlled light, rich tonal color, crisp detail.'
    },
    {
      key: 'lindbergh',
      name: 'Peter Lindbergh',
      category: 'Portrait',
      blurb: 'Cinematic monochrome, natural light, honest texture, minimal retouching.'
    },
    {
      key: 'mccurry',
      name: 'Steve McCurry',
      category: 'Portrait',
      blurb: 'Vivid color portraiture, deep cultural tones, warm highlights and rich saturation.'
    },
    {
      key: 'platon',
      name: 'Platon',
      category: 'Portrait',
      blurb: 'High-contrast black & white, powerful close-up faces, stark backgrounds.'
    },
    {
      key: 'penn',
      name: 'Irving Penn',
      category: 'Portrait',
      blurb: 'Minimalist studio elegance, refined tonality, subtle contrast and texture.'
    },
    {
      key: 'kander',
      name: 'Nadav Kander',
      category: 'Portrait',
      blurb: 'Muted palettes, painterly tones, contemplative atmosphere with gentle contrast.'
    }
  ],
  Landscape: [
    {
      key: 'ansel',
      name: 'Ansel Adams',
      category: 'Landscape',
      blurb: 'High-contrast black & white, deep dynamic range, dramatic skies.'
    },
    {
      key: 'rowell',
      name: 'Galen Rowell',
      category: 'Landscape',
      blurb: 'Vivid natural color, clarity, luminous twilight and alpine hues.'
    },
    {
      key: 'kenna',
      name: 'Michael Kenna',
      category: 'Landscape',
      blurb: 'Minimalist long exposures, ethereal monochrome, quiet negative space.'
    },
    {
      key: 'salgado',
      name: 'Sebastião Salgado',
      category: 'Landscape',
      blurb: 'Monochrome grandeur, sculpted contrast, immense textures and atmosphere.'
    },
    {
      key: 'lik',
      name: 'Peter Lik',
      category: 'Landscape',
      blurb: 'Hyper-vivid color, polished contrast, dramatic skies and glowing horizons.'
    }
  ],
  Street: [
    {
      key: 'hcb',
      name: 'Henri Cartier-Bresson',
      category: 'Street',
      blurb: 'Classic monochrome, decisive moments, gentle contrast and grain.'
    },
    {
      key: 'fanho',
      name: 'Fan Ho',
      category: 'Street',
      blurb: 'Geometric light, deep shadows, sculpted contrast, poetic atmosphere.'
    },
    {
      key: 'moriyama',
      name: 'Daido Moriyama',
      category: 'Street',
      blurb: 'Gritty high-contrast monochrome, bold grain, raw urban energy.'
    },
    {
      key: 'maier',
      name: 'Vivian Maier',
      category: 'Street',
      blurb: 'Classic candid moments, balanced tones, subtle contrast and human warmth.'
    },
    {
      key: 'meyerowitz',
      name: 'Joel Meyerowitz',
      category: 'Street',
      blurb: 'Lyrical color street, gentle contrast, ambient light and pastel nuance.'
    }
  ],
  Editorial: [
    {
      key: 'aavedon',
      name: 'Richard Avedon',
      category: 'Editorial',
      blurb: 'Minimal backgrounds, crisp tones, expressive portraiture, high-key balance.'
    },
    {
      key: 'newton',
      name: 'Helmut Newton',
      category: 'Editorial',
      blurb: 'High-contrast fashion noir, glossy monochrome, bold highlights and shadows.'
    },
    {
      key: 'testino',
      name: 'Mario Testino',
      category: 'Editorial',
      blurb: 'Polished color fashion, luminous skin tones, bright and energetic palette.'
    },
    {
      key: 'timwalker',
      name: 'Tim Walker',
      category: 'Editorial',
      blurb: 'Whimsical editorial color, dreamlike palettes, saturated yet soft contrast.'
    },
    {
      key: 'unwerth',
      name: 'Ellen von Unwerth',
      category: 'Editorial',
      blurb: 'Playful high-fashion energy, punchy contrast, sensual monochrome or vivid color.'
    }
  ]
};

const ArtisticStylesCard: React.FC<ArtisticStylesCardProps> = ({ selected, onSelect }) => {
  return (
    <Paper className="card slide-in" sx={{ p: 0, animationDelay: '0.08s' }}>
      <Accordion defaultExpanded disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5, py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <BrushIcon sx={{ color: 'primary.main', fontSize: 20 }} />
            <Box sx={{ flex: 1 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2c3338', margin: 0 }}>
                Artistic Styles
              </h3>
              <p style={{ fontSize: 12, color: '#5f6b74', margin: 0 }}>
                Choose a celebrated look to mimic in AI grading
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
          {/* Scrollable styles list */}
          <Box sx={{ display: 'grid', gap: 1.5, maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
            {Object.entries(CATALOG).map(([group, items]) => (
              <Box key={group}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 0.5, fontWeight: 700 }}>
                  {group}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                  {items.map((item) => {
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

export default ArtisticStylesCard;
