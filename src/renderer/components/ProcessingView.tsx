import {
  AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Typography
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useEffect, useState } from 'react';
import { ProcessingState } from '../../shared/types';

interface ProcessingViewProps {
  processingState: ProcessingState;
  baseImage: string | null;
  prompt?: string;
}


const ProcessingView: React.FC<ProcessingViewProps> = ({ processingState, baseImage: _baseImage }) => {
  const [loadingText, setLoadingText] = useState('Initializing AI analysis...');

  // Simulate realistic progress during processing
  useEffect(() => {
    if (processingState.isProcessing) {
      const progressMessages = [
        'Initializing AI analysis...',
        'Analyzing your images...',
        'Identifying color patterns...',
        'Processing color data...',
        'Generating adjustments...',
        'Creating photo recipe...',
        'Finalizing results...'
      ];

      let currentMessageIndex = 0;
      let currentProgress = 0;

      const interval = setInterval(() => {
        currentProgress += Math.random() * 15 + 5; // Random progress between 5-20%
        
        if (currentProgress >= 100) {
          currentProgress = 100;
          setLoadingText('Complete!');
          clearInterval(interval);
          return;
        }

        // Update message every 20-30% progress
        if (currentProgress > (currentMessageIndex + 1) * 15 && currentMessageIndex < progressMessages.length - 1) {
          currentMessageIndex++;
          setLoadingText(progressMessages[currentMessageIndex]);
        }
      }, 800); // Update every 800ms for smooth animation

      return () => clearInterval(interval);
    } else {
      setLoadingText('Initializing AI analysis...');
    }
  }, [processingState.isProcessing]);

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 3, md: 6 },
        py: { xs: 6, md: 8 },
        backgroundColor: 'white',
      }}
    >
        <Box
          sx={(theme) => ({
            position: 'relative',
            width: '100%',
            maxWidth: 560,
            overflow: 'hidden',
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
            backgroundColor: alpha(theme.palette.background.paper, 0.92),
          })}
        >
        <Box
          sx={() => ({
            position: 'absolute',
            inset: 0,
            opacity: 0.9,
            pointerEvents: 'none',
          })}
        />
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            px: { xs: 4, md: 6 },
            py: { xs: 6, md: 7 },
            gap: 3,
          }}
        >
          <Avatar
            sx={(theme) => ({
              width: 96,
              height: 96,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              animation: 'pulse 4s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.04)' },
              },
            })}
          >
            <AutoAwesomeIcon sx={{ fontSize: '2.75rem' }} />
          </Avatar>

          <Typography
            variant="h4"
            fontWeight={600}
            sx={(theme) => ({
              mt: 2,
              color: theme.palette.text.primary,
              letterSpacing: '-0.01em',
            })}
          >
            AI Recipe Wizard
          </Typography>

          <Typography
            variant="subtitle1"
            sx={(theme) => ({
              color: theme.palette.text.secondary,
              maxWidth: 420,
            })}
          >
            {loadingText}
          </Typography>

          <Box
            sx={(theme) => ({
              width: '100%',
              backgroundColor: alpha(theme.palette.primary.main, 0.04),
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
              px: { xs: 3, md: 4 },
              py: { xs: 3, md: 4 },
            })}
          >
        
            <Box
              sx={(theme) => ({
                display: 'flex',
                justifyContent: 'center',
                gap: 2,
                mt: 2,
                color: theme.palette.primary.main,
              })}
            >
              {[0, 1, 2].map((index) => (
                <Box
                  key={index}
                  sx={(theme) => ({
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: alpha(theme.palette.primary.main, 0.22),
                    animation: 'floatDot 1.8s ease-in-out infinite',
                    animationDelay: `${index * 0.2}s`,
                    '@keyframes floatDot': {
                      '0%, 100%': { transform: 'translateY(0)', opacity: 0.6 },
                      '50%': { transform: 'translateY(-6px)', opacity: 1 },
                    },
                  })}
                />
              ))}
            </Box>
          </Box>

          <Typography
            variant="body2"
            sx={(theme) => ({
              color: theme.palette.text.secondary,
              maxWidth: 400,
              lineHeight: 1.6,
            })}
          >
            Creating your personalized photo recipe with advanced AI analysis.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default ProcessingView;
