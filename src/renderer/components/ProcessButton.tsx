import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Button, Box, Paper } from '@mui/material';
import React from 'react';

interface ProcessButtonProps {
  canProcess: boolean;
  onStartProcessing: () => void;
}

const ProcessButton: React.FC<ProcessButtonProps> = ({ canProcess, onStartProcessing }) => {
  return (
    <Paper className="card fade-in" sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
      <Box sx={{ mb: 2 }}>
        <AutoAwesomeIcon sx={{ fontSize: 32, mb: 1, color: 'primary.main' }} />
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: '#2c3338' }}>
          Ready to Transform
        </h3>
        <p style={{ fontSize: 13, margin: 0, color: '#5f6b74' }}>
          AI will analyze and apply intelligent color grading to your images
        </p>
      </Box>
      <Button
        variant="contained"
        color="primary"
        onClick={onStartProcessing}
        size="large"
        disabled={!canProcess}
        sx={{ textTransform: 'none', fontWeight: 700, fontSize: 16, px: 4, py: 1.5, borderRadius: '12px' }}
      >
        Start Color Matching
      </Button>
    </Paper>
  );
};

export default ProcessButton;
