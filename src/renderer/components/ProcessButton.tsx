import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Box, Button, Paper, Typography } from '@mui/material';
import React from 'react';

interface ProcessButtonProps {
  canProcess: boolean;
  onStartProcessing: () => void;
  hasActiveOptions?: boolean;
}

const ProcessButton: React.FC<ProcessButtonProps> = ({
  canProcess,
  onStartProcessing,
  hasActiveOptions = true,
}) => {
  return (
    <Paper className="card fade-in" sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
      <Box sx={{ mb: 2 }}>
        <AutoAwesomeIcon sx={{ fontSize: 32, mb: 1, color: 'primary.main' }} />
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: '#2c3338' }}>
          {hasActiveOptions ? 'Ready to Transform' : 'Configure Your Style'}
        </h3>
        {!hasActiveOptions && (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13, mb: 2 }}>
            Add a reference image, select a style, or enter a prompt to get started
          </Typography>
        )}
      </Box>
      <Button
        variant="contained"
        color="primary"
        onClick={onStartProcessing}
        size="medium"
        disabled={!canProcess}
        sx={{
          textTransform: 'none',
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
