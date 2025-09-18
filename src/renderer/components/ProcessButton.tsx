import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Box, Button, Paper, Typography } from '@mui/material';
import React from 'react';

interface ProcessButtonProps {
  canProcess: boolean;
  onStartProcessing: () => void;
}

const ProcessButton: React.FC<ProcessButtonProps> = ({ canProcess, onStartProcessing }) => {
  return (
    <Paper className="card fade-in" sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
      <Box sx={{ mb: 2 }}>
        <AutoAwesomeIcon sx={{ fontSize: 32, mb: 1, color: 'primary.main' }} />
        <Typography 
          variant="h5" 
          sx={{ 
            fontSize: 20, 
            fontWeight: 800, 
            marginBottom: 1, 
            color: 'text.primary' 
          }}
        >
          Ready to Transform
        </Typography>
      </Box>
      <Button
        variant="contained"
        color="primary"
        onClick={onStartProcessing}
        size="large"
        disabled={!canProcess}
        sx={{
          textTransform: 'none',
          fontWeight: 700,
          fontSize: 16,
          px: 4,
          py: 1.5,
          borderRadius: 2,
        }}
      >
        Start Color Matching
      </Button>
    </Paper>
  );
};

export default ProcessButton;
