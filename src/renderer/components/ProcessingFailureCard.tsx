import { Box, Button, Paper, Typography } from '@mui/material';
import React from 'react';
import { ProcessingResult } from '../../shared/types';

interface ProcessingFailureCardProps {
  result: ProcessingResult;
  index: number;
  totalResults: number;
  onRestart?: () => void;
  onReset: () => void;
}

const ProcessingFailureCard: React.FC<ProcessingFailureCardProps> = ({
  result,
  index,
  totalResults,
  onRestart,
  onReset,
}) => {
  return (
    <Paper
      className="card slide-in"
      elevation={0}
      sx={{
        borderRadius: 2,
        border: 'none',
        background: '#fff8f8',
        p: 2.5,
        animationDelay: `${index * 0.1}s`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
        <Box sx={{ fontSize: '28px', lineHeight: 1 }}>❌</Box>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#d32f2f',
              mb: 0.5,
            }}
          >
            Processing Failed
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Image {index + 1} of {totalResults}
          </Typography>

          <Box
            sx={{
              background: '#ffffff',
              borderRadius: 2,
              p: 2,
              mb: 2,
              fontFamily: 'monospace',
              fontSize: '13px',
              color: '#d32f2f',
              whiteSpace: 'pre-wrap',
              maxHeight: '200px',
              overflow: 'auto',
            }}
          >
            {result.error || 'Unknown error occurred'}
          </Box>

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            {onRestart && (
              <Button
                variant="contained"
                color="primary"
                onClick={onRestart}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Try Again
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={onReset}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Start Over
            </Button>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default ProcessingFailureCard;
