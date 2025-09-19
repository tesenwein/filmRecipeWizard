import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { ProcessingResult } from '../../../shared/types';

interface ImageSelectionChipsProps {
  successfulResults: ProcessingResult[];
  selectedResult: number;
  setSelectedResult: (index: number) => void;
  processOptions?: any;
}

const ImageSelectionChips: React.FC<ImageSelectionChipsProps> = ({
  successfulResults,
  selectedResult,
  setSelectedResult,
  processOptions,
}) => {
  return (
    <Box sx={{ p: 3, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
        Select Image:
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {successfulResults.map((_result, index) => {
          const name = `Image ${index + 1}`;
          return (
            <Chip
              key={index}
              label={name}
              onClick={() => setSelectedResult(index)}
              color={selectedResult === index ? 'primary' : 'default'}
              variant={selectedResult === index ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
          );
        })}
      </Box>
    </Box>
  );
};

export default ImageSelectionChips;
