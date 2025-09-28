import {
  AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  LinearProgress,
  Typography
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useEffect, useState } from 'react';
import { ProcessingState } from '../../shared/types';

interface ProcessingViewProps {
  processingState: ProcessingState;
  baseImage: string | null;
  targetImages: string[];
  prompt?: string;
}


const ProcessingView: React.FC<ProcessingViewProps> = ({ processingState, baseImage: _baseImage, targetImages: _targetImages }) => {
  const [progress, setProgress] = useState(0);
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
          setProgress(100);
          setLoadingText('Complete!');
          clearInterval(interval);
          return;
        }

        setProgress(Math.min(currentProgress, 95)); // Cap at 95% until actually complete

        // Update message every 20-30% progress
        if (currentProgress > (currentMessageIndex + 1) * 15 && currentMessageIndex < progressMessages.length - 1) {
          currentMessageIndex++;
          setLoadingText(progressMessages[currentMessageIndex]);
        }
      }, 800); // Update every 800ms for smooth animation

      return () => clearInterval(interval);
    } else {
      setProgress(0);
      setLoadingText('Initializing AI analysis...');
    }
  }, [processingState.isProcessing]);

  return (
    <Box
      sx={(theme) => ({
        width: '100%',
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 3, md: 6 },
        py: { xs: 6, md: 8 },
        background: `linear-gradient(160deg, ${alpha(theme.palette.grey[100], 0.9)} 0%, ${alpha(theme.palette.grey[200], 0.85)} 55%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
      })}
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
          boxShadow: `0 28px 60px ${alpha(theme.palette.grey[900], 0.14)}`,
        })}
      >
        <Box
          sx={(theme) => ({
            position: 'absolute',
            inset: 0,
            background: `
              radial-gradient(circle at 12% 18%, ${alpha(theme.palette.primary.light, 0.18)} 0%, transparent 50%),
              radial-gradient(circle at 88% 26%, ${alpha(theme.palette.secondary.light, 0.16)} 0%, transparent 55%),
              linear-gradient(180deg, transparent 0%, ${alpha(theme.palette.primary.main, 0.06)} 100%)
            `,
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
              boxShadow: `0 16px 36px ${alpha(theme.palette.primary.main, 0.15)}`,
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
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={(theme) => ({
                height: 10,
                borderRadius: 5,
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 5,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                },
              })}
            />

            <Typography
              variant="h5"
              fontWeight={500}
              sx={(theme) => ({
                mt: 3,
                color: theme.palette.text.primary,
                letterSpacing: '-0.01em',
              })}
            >
              {Math.round(progress)}%
            </Typography>

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
