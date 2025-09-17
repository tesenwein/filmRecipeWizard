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
          background:
            'radial-gradient(400px 200px at 80% -10%, rgba(102,126,234,0.08), transparent 60%), ' +
            'radial-gradient(300px 150px at -10% -20%, rgba(118,75,162,0.06), transparent 60%), ' +
            '#f8fafc',
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
