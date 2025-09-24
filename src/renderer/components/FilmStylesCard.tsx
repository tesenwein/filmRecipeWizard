import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LandscapeIcon from '@mui/icons-material/Landscape';
import MovieFilterIcon from '@mui/icons-material/MovieFilter';
import PortraitIcon from '@mui/icons-material/Portrait';
import StreetviewIcon from '@mui/icons-material/Streetview';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import React, { useMemo, useState } from 'react';
import { FILM_STYLES, FilmStyle } from '../data/film-styles';

type UseCaseFilter = 'all' | 'landscape' | 'portrait' | 'street';

interface FilmStylesCardProps {
  selected?: string;
  onSelect?: (style?: FilmStyle) => void;
}

const CATALOG = FILM_STYLES;

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
