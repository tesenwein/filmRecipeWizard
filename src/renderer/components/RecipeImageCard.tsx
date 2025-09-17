import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Button, Chip, Box, Paper, IconButton, Tooltip } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import React from 'react';
import NoImagePlaceholder from './NoImagePlaceholder';
import SingleImage from './SingleImage';
import ImageGrid from './ImageGrid';

interface RecipeImageCardProps {
  baseImages: string[];
  basePreviews: string[];
  onSelectImages: () => void;
  onRemoveImage?: (index: number) => void;
}

const RecipeImageCard: React.FC<RecipeImageCardProps> = ({ baseImages, basePreviews, onSelectImages, onRemoveImage }) => {
  const count = Array.isArray(baseImages) ? Math.min(baseImages.length, 3) : 0;

  return (
    <Paper className="card slide-in" sx={{ p: 0, animationDelay: '0.1s' }}>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5, py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <PaletteOutlinedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
            <Box sx={{ flex: 1 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2c3338', margin: 0 }}>
                Reference Style
              </h3>
              <p style={{ fontSize: 12, color: '#5f6b74', margin: 0 }}>
                Upload up to 3 reference images
              </p>
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2.5 }}>
          {count > 0 ? (
            <Box>
              <Box
                sx={{
                  width: '100%',
                  minHeight: 260,
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: 'none',
                  position: 'relative',
                  boxShadow: 'none',
                }}
              >
                <SingleImage source={basePreviews[0] || baseImages[0]} alt="Reference" fit="cover" />
                {onRemoveImage && (
                  <Tooltip title="Remove this reference">
                    <IconButton
                      size="small"
                      onClick={() => onRemoveImage(0)}
                      sx={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        zIndex: 2,
                        background: 'rgba(255,255,255,0.6)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        color: '#111',
                        border: '1px solid rgba(255,255,255,0.4)',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                        '&:hover': { background: 'rgba(255,255,255,0.75)' },
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <Chip
                  label={`${count} reference${count !== 1 ? 's' : ''}`}
                  size="medium"
                  sx={{ position: 'absolute', top: 12, right: 12, background: 'primary.main', color: 'white', fontSize: 12, fontWeight: 600 }}
                />
              </Box>
              {count > 1 && (
                <Box sx={{ mt: 2 }}>
                  <ImageGrid
                    sources={(basePreviews.length ? basePreviews : baseImages).slice(1)}
                    columns={4}
                    tileHeight={80}
                    onRemove={onRemoveImage ? (i) => onRemoveImage(i + 1) : undefined}
                  />
                </Box>
              )}
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#2c3338', fontWeight: 500, marginBottom: 12 }}>
                  {baseImages[0].split('/').pop()}
                </p>
                <Button
                  variant="outlined"
                  onClick={onSelectImages}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    color: 'primary.main',
                    borderColor: 'primary.main',
                    '&:hover': { backgroundColor: 'rgba(91, 102, 112, 0.06)' },
                  }}
                >
                  Change Images
                </Button>
              </Box>
            </Box>
          ) : (
            <Box>
              <NoImagePlaceholder label="No references selected" height={220} style={{ marginBottom: 16 }} />
              <Button
                variant="contained"
                onClick={onSelectImages}
                fullWidth
                size="small"
                sx={{ textTransform: 'none', fontWeight: 700, py: 1.25, borderRadius: 2 }}
              >
                Select Reference Images
              </Button>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default RecipeImageCard;
