import { Box, LinearProgress, Typography } from '@mui/material';
import React from 'react';
import IconSvg from '../../../assets/icons/icon.svg';

interface SplashScreenProps {
  status: string;
  progress: number;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ status, progress }) => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <img src={IconSvg} alt="Film Recipe Wizard" style={{ width: 80, height: 80, marginBottom: 24 }} />
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
        Film Recipe Wizard
      </Typography>
      <Box sx={{ width: '300px', mb: 2 }}>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3 }} />
      </Box>
      <Typography variant="body2" color="text.secondary">{status}</Typography>
    </Box>
  );
};

export default SplashScreen;