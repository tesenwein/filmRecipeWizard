import BrushIcon from '@mui/icons-material/Brush';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Paper, Typography } from '@mui/material';
import React from 'react';
import { ARTIST_STYLES, ArtistStyle } from '../data/artist-styles';

interface ArtisticStylesCardProps {
  selected?: string;
  onSelect?: (style?: ArtistStyle) => void;
}

const CATALOG = ARTIST_STYLES;

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
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                            <Chip 
                              size="small" 
                              label={item.colorType === 'monochrome' ? 'B&W' : 'Color'} 
                              variant="outlined" 
                              color={item.colorType === 'monochrome' ? 'secondary' : 'primary'} 
                              sx={{ height: 20, fontSize: 11 }} 
                            />
                          </Box>
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
