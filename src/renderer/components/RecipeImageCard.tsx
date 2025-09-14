import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Button, Chip, Box, Paper } from '@mui/material';
import React from 'react';
import NoImagePlaceholder from './NoImagePlaceholder';
import SingleImage from './SingleImage';

interface RecipeImageCardProps {
  baseImage: string | null;
  baseDisplay: string | null;
  onSelectImage: () => void;
}

const RecipeImageCard: React.FC<RecipeImageCardProps> = ({
  baseImage,
  baseDisplay,
  onSelectImage,
}) => {
  return (
    <Paper className="card slide-in" sx={{ p: 0, animationDelay: '0.1s' }}>
      <Accordion disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5, py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <PaletteOutlinedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
            <Box sx={{ flex: 1 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2c3338', margin: 0 }}>
                Reference Style
              </h3>
              <p style={{ fontSize: 12, color: '#5f6b74', margin: 0 }}>
                Upload image with desired look
              </p>
            </Box>
            <Chip label="Optional" size="small" variant="outlined" />
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2.5 }}>
          {baseImage ? (
            <Box sx={{ mb: 2 }}>
              <Box sx={{
                width: '100%',
                height: 100,
                borderRadius: 2,
                overflow: 'hidden',
                border: 'none',
                position: 'relative'
              }}>
                {baseDisplay && (
                  <SingleImage source={baseDisplay} alt="Reference" fit="cover" />
                )}
                <Chip
                  label="✓ Reference"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    background: 'primary.main',
                    color: 'white',
                    fontSize: 11
                  }}
                />
              </Box>
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
                {(baseImage || '').split('/').pop()}
              </p>
            </Box>
          ) : (
            <NoImagePlaceholder label="No reference selected" height={100} style={{ marginBottom: 16 }} />
          )}

          <Button
            variant="outlined"
            onClick={onSelectImage}
            fullWidth
            size="small"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              py: 1,
              borderRadius: 2
            }}
          >
            Select Reference Image
          </Button>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default RecipeImageCard;
