import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import React from 'react';
import { StyleOptions } from '../../shared/types';

interface AIFunctionsSelectorProps {
  styleOptions?: StyleOptions;
  onStyleOptionsChange?: (options: Partial<StyleOptions>) => void;
}

const AIFunctionsSelector: React.FC<AIFunctionsSelectorProps> = ({
  styleOptions,
  onStyleOptionsChange,
}) => {
  const aiFunctions = styleOptions?.aiFunctions || {};

  const handleToggle = (key: keyof NonNullable<StyleOptions['aiFunctions']>, value: boolean) => {
    onStyleOptionsChange?.({
      aiFunctions: { ...aiFunctions, [key]: value },
    });
  };

  return (
    <Accordion defaultExpanded={false}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          px: 2.5,
          py: 1.5,
          '&.Mui-expanded': { minHeight: 'auto' },
          '& .MuiAccordionSummary-content': { margin: '12px 0' },
        }}
      >
        <Box>
          <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
            AI Functions
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 12 }}>
            Select which features the AI can use for color adjustments
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2.5, pt: 2, pb: 2.5 }}>
        <Stack spacing={2}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={aiFunctions.temperatureTint !== false}
                onChange={(_, c) => handleToggle('temperatureTint', c)}
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Temperature & Tint
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                  White balance adjustments for color temperature and tint correction
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={aiFunctions.colorGrading !== false}
                onChange={(_, c) => handleToggle('colorGrading', c)}
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Color Grading
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                  Shadow, midtone, and highlight color wheel adjustments
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={aiFunctions.hsl !== false}
                onChange={(_, c) => handleToggle('hsl', c)}
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  HSL Adjustments
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                  Hue, saturation, and luminance adjustments per color range
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={aiFunctions.curves !== false}
                onChange={(_, c) => handleToggle('curves', c)}
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Tone Curves
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                  RGB and luminance curve adjustments for tonal control
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={aiFunctions.masks !== false}
                onChange={(_, c) => handleToggle('masks', c)}
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Masks & Local Adjustments
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                  Area-specific adjustments using radial, linear, and AI masks
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={aiFunctions.pointColor !== false}
                onChange={(_, c) => handleToggle('pointColor', c)}
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Point Color
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                  Targeted color adjustments using point color tools
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={!!aiFunctions.grain}
                onChange={(_, c) => handleToggle('grain', c)}
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Film Grain
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                  Analog film texture simulation (disabled by default)
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={!!styleOptions?.preserveSkinTones}
                onChange={(_, c) =>
                  onStyleOptionsChange?.({
                    preserveSkinTones: c,
                  })
                }
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Preserve Skin Tones
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                  Protect skin tones from excessive color adjustments
                </Typography>
              </Box>
            }
          />
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default AIFunctionsSelector;
