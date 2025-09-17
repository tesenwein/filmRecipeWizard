import { Box, LinearProgress, Typography } from '@mui/material';
import React from 'react';
import { ProcessingState } from '../../shared/types';

interface ProcessingViewProps {
  processingState: ProcessingState;
  baseImage: string | null;
  targetImages: string[];
  prompt?: string;
}

const ProcessingView: React.FC<ProcessingViewProps> = ({
  processingState,
  baseImage: _baseImage,
  targetImages: _targetImages,
}) => {
  const { status } = processingState;

  return (
    <div className="container" style={{ maxWidth: 980, margin: '0 auto' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: { xs: 320, sm: 420, md: 520 },
          borderRadius: 2,
          backgroundColor: '#f8fafc',
          textAlign: 'center',
        }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
          Applying Recipe
        </Typography>
        <Box sx={{ maxWidth: 420, width: '100%', mb: 2 }}>
          <LinearProgress variant="indeterminate" />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
          {status}
        </Typography>
      </Box>
    </div>
  );
};

export default ProcessingView;
