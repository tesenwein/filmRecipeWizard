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
    },
    {
      key: 'newton',
      name: 'Helmut Newton',
      category: 'Portrait',
      blurb: 'High-contrast fashion noir, glossy monochrome, bold highlights and shadows.'
    },
    {
      key: 'aavedon',
      name: 'Richard Avedon',
      category: 'Portrait',
      blurb: 'Minimal backgrounds, crisp tones, expressive portraiture, high-key balance.'
    },
    {
      key: 'testino',
      name: 'Mario Testino',
      category: 'Portrait',
      blurb: 'Polished color fashion, luminous skin tones, bright and energetic palette.'
    },
    {
      key: 'demarchelier',
      name: 'Patrick Demarchelier',
      category: 'Portrait',
      blurb: 'Elegant fashion portraiture, soft natural light, refined color and composition.'
    },
    {
      key: 'weber',
      name: 'Bruce Weber',
      category: 'Portrait',
      blurb: 'Natural outdoor portraiture, warm golden tones, romantic and nostalgic mood.'
    },
    {
      key: 'bailey',
      name: 'David Bailey',
      category: 'Portrait',
      blurb: 'Raw energy, high contrast, bold composition, iconic 60s fashion aesthetic.'
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
    },
    {
      key: 'mccurry_landscape',
      name: 'Steve McCurry',
      category: 'Landscape',
      blurb: 'Rich cultural landscapes, warm golden light, deep saturated colors.'
    },
    {
      key: 'burtynsky',
      name: 'Edward Burtynsky',
      category: 'Landscape',
      blurb: 'Industrial landscapes, muted palettes, environmental storytelling through color.'
    },
    {
      key: 'mishkin',
      name: 'Alexey Mishkin',
      category: 'Landscape',
      blurb: 'Moody atmospheric landscapes, soft contrast, ethereal light and mist.'
    },
    {
      key: 'moon',
      name: 'Michael Moon',
      category: 'Landscape',
      blurb: 'Dramatic seascapes, high contrast, powerful waves and stormy skies.'
    },
    {
      key: 'cornish',
      name: 'Joe Cornish',
      category: 'Landscape',
      blurb: 'Classic British landscapes, natural color, balanced composition and light.'
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
    },
    {
      key: 'winogrand',
      name: 'Garry Winogrand',
      category: 'Street',
      blurb: 'Dynamic composition, tilted angles, high contrast, urban chaos and energy.'
    },
    {
      key: 'frank',
      name: 'Robert Frank',
      category: 'Street',
      blurb: 'Raw documentary style, high grain, emotional depth, American road trip aesthetic.'
    },
    {
      key: 'friedlander',
      name: 'Lee Friedlander',
      category: 'Street',
      blurb: 'Complex compositions, reflections, shadows, layered urban environments.'
    },
    {
      key: 'levitt',
      name: 'Helen Levitt',
      category: 'Street',
      blurb: 'Intimate street moments, children at play, natural light, gentle contrast.'
    },
    {
      key: 'parks',
      name: 'Gordon Parks',
      category: 'Street',
      blurb: 'Social documentary, powerful storytelling, balanced tones, human dignity.'
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
    },
    {
      key: 'meisel',
      name: 'Steven Meisel',
      category: 'Editorial',
      blurb: 'High-fashion editorial, dramatic lighting, bold composition, cinematic quality.'
    },
    {
      key: 'bourdin',
      name: 'Guy Bourdin',
      category: 'Editorial',
      blurb: 'Surreal fashion imagery, bold color, dramatic composition, provocative storytelling.'
    },
    {
      key: 'klein',
      name: 'William Klein',
      category: 'Editorial',
      blurb: 'Raw energy, high contrast, bold grain, dynamic composition and movement.'
    }
  ],
  Fashion: [
    {
      key: 'demarchelier_fashion',
      name: 'Patrick Demarchelier',
      category: 'Fashion',
      blurb: 'Elegant fashion photography, soft natural light, refined color and composition.'
    },
    {
      key: 'weber_fashion',
      name: 'Bruce Weber',
      category: 'Fashion',
      blurb: 'Natural outdoor fashion, warm golden tones, romantic and nostalgic mood.'
    },
    {
      key: 'bailey_fashion',
      name: 'David Bailey',
      category: 'Fashion',
      blurb: 'Raw energy, high contrast, bold composition, iconic 60s fashion aesthetic.'
    },
    {
      key: 'lindbergh_fashion',
      name: 'Peter Lindbergh',
      category: 'Fashion',
      blurb: 'Cinematic monochrome fashion, natural light, honest texture, minimal retouching.'
    },
    {
      key: 'testino_fashion',
      name: 'Mario Testino',
      category: 'Fashion',
      blurb: 'Polished color fashion, luminous skin tones, bright and energetic palette.'
    },
    {
      key: 'meisel_fashion',
      name: 'Steven Meisel',
      category: 'Fashion',
      blurb: 'High-fashion editorial, dramatic lighting, bold composition, cinematic quality.'
    },
    {
      key: 'bourdin_fashion',
      name: 'Guy Bourdin',
      category: 'Fashion',
      blurb: 'Surreal fashion imagery, bold color, dramatic composition, provocative storytelling.'
    },
    {
      key: 'klein_fashion',
      name: 'William Klein',
      category: 'Fashion',
      blurb: 'Raw energy, high contrast, bold grain, dynamic composition and movement.'
    }
  ]
};

const ArtisticStylesCard: React.FC<ArtisticStylesCardProps> = ({ selected, onSelect }) => {
  return (
    <Paper className="card slide-in" sx={{ p: 0, animationDelay: '0.08s' }}>
      <Accordion>
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
            {selected && (
              <Chip label="Applied" size="small" color="primary" variant="outlined" />
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
