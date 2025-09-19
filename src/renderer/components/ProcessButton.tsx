import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Button } from '@mui/material';
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
    <Button
      variant="contained"
      color="primary"
      onClick={onStartProcessing}
      disabled={!canProcess}
      sx={{
        width: '100%',
        height: 64,
        textTransform: 'none',
        borderRadius: 2,
        fontSize: 16,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
      }}
    >
      <AutoAwesomeIcon sx={{ fontSize: 20 }} />
      {hasActiveOptions ? 'Start Recipe Generation' : 'Configure Your Style'}
    </Button>
  );
};

export default ProcessButton;
