import { Box, LinearProgress, Typography, Paper, Fade, Chip, Slide } from '@mui/material';
import {
  Psychology as PsychologyIcon,
  Search as SearchIcon,
  Palette as PaletteIcon,
  Thermostat as ThermostatIcon,
  ColorLens as ColorLensIcon,
  TheaterComedy as TheaterComedyIcon,
  ShowChart as ShowChartIcon,
  GpsFixed as GpsFixedIcon,
  Brush as BrushIcon,
  Movie as MovieIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Settings as SettingsIcon,
  AutoFixHigh as AutoFixHighIcon,
} from '@mui/icons-material';
import React, { useState, useEffect, useRef } from 'react';
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
  const { status, progress } = processingState;
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [newStepIndex, setNewStepIndex] = useState<number>(-1);
  const stepsContainerRef = useRef<HTMLDivElement>(null);
  const lastStepRef = useRef<HTMLDivElement>(null);

  // Parse status updates to build thinking steps
  useEffect(() => {
    if (status && status !== currentStep) {
      setCurrentStep(status);

      // Add new thinking step if it's not already in the list
      setThinkingSteps(prev => {
        if (!prev.includes(status)) {
          const newSteps = [...prev, status];
          setNewStepIndex(newSteps.length - 1);
          return newSteps;
        }
        return prev;
      });

      // Show typing animation for new steps
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 1000);
    }
  }, [status, currentStep]);

  // Auto-scroll to bottom when new steps are added
  useEffect(() => {
    if (lastStepRef.current) {
      lastStepRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      });
    }
  }, [thinkingSteps.length]);

  // Reset new step index after animation
  useEffect(() => {
    if (newStepIndex >= 0) {
      const timer = setTimeout(() => {
        setNewStepIndex(-1);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [newStepIndex]);

  const getStepIcon = (step: string) => {
    if (step.includes('Analyzing')) return <SearchIcon />;
    if (step.includes('Identifying')) return <PaletteIcon />;
    if (step.includes('temperature') || step.includes('tint')) return <ThermostatIcon />;
    if (step.includes('HSL') || step.includes('color ranges')) return <ColorLensIcon />;
    if (step.includes('color grading')) return <TheaterComedyIcon />;
    if (step.includes('tonal') || step.includes('curves')) return <ShowChartIcon />;
    if (step.includes('local adjustments') || step.includes('areas')) return <GpsFixedIcon />;
    if (step.includes('color points')) return <BrushIcon />;
    if (step.includes('film grain')) return <MovieIcon />;
    if (step.includes('skin tone')) return <PersonIcon />;
    if (step.includes('Complete')) return <CheckCircleIcon />;
    if (step.includes('Generating') || step.includes('Processing')) return <SettingsIcon />;
    if (step.includes('Optimizing') || step.includes('Fine-tuning')) return <AutoFixHighIcon />;
    return <PsychologyIcon />;
  };

  const getStepColor = (step: string, index: number) => {
    if (step === currentStep) return 'primary';
    if (index < thinkingSteps.length - 1) return 'success';
    return 'default';
  };

  return (
    <div className="container" style={{ maxWidth: 980, margin: '0 auto' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: { xs: 400, sm: 500, md: 600 },
          borderRadius: 2,
          backgroundColor: '#f8fafc',
          p: 4,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <PsychologyIcon
            sx={{
              fontSize: '3rem',
              color: 'primary.main',
              animation: 'pulse 2s infinite ease-in-out',
              '@keyframes pulse': {
                '0%, 100%': { transform: 'scale(1)', opacity: 1 },
                '50%': { transform: 'scale(1.1)', opacity: 0.8 },
              },
            }}
          />
          <Typography variant="h5" fontWeight={700} sx={{ textAlign: 'center' }}>
            AI is Thinking...
          </Typography>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ maxWidth: 500, width: '100%', mb: 4 }}>
          <LinearProgress
            variant="determinate"
            value={progress || 0}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(0,0,0,0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
              }
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
            {Math.round(progress || 0)}% Complete
          </Typography>
        </Box>

        {/* Thinking Steps */}
        <Paper
          elevation={1}
          sx={{
            p: 2,
            maxWidth: 500,
            width: '100%',
            backgroundColor: 'white',
            borderRadius: 2,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(25, 118, 210, 0.05), transparent)',
              animation: 'shimmer 4s infinite',
              '@keyframes shimmer': {
                '0%': { left: '-100%' },
                '100%': { left: '100%' },
              },
            },
          }}
        >
          <Box
            ref={stepsContainerRef}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              maxHeight: '300px',
              overflowY: 'auto',
              overflowX: 'hidden',
              pr: 1,
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '4px',
                border: '2px solid transparent',
                backgroundClip: 'content-box',
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.3)',
                },
              },
              '&::-webkit-scrollbar-corner': {
                backgroundColor: 'transparent',
              },
            }}
          >
            {thinkingSteps.map((step, index) => (
              <Slide
                direction="up"
                in={true}
                timeout={300}
                key={index}
                style={{
                  transitionDelay: index === newStepIndex ? '0ms' : `${index * 100}ms`,
                }}
              >
                <Box
                  ref={index === thinkingSteps.length - 1 ? lastStepRef : null}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: 'transparent',
                    transition: 'all 0.2s ease',
                    transform: index === newStepIndex ? 'scale(1.01)' : 'scale(1)',
                    opacity: step === currentStep ? 1 : 0.7,
                  }}
                >
                  <Chip
                    icon={getStepIcon(step)}
                    label={step}
                    color={getStepColor(step, index)}
                    variant="outlined"
                    size="small"
                    sx={{
                      fontWeight: step === currentStep ? 500 : 400,
                      fontSize: '0.875rem',
                      '& .MuiChip-icon': {
                        fontSize: '1.1em',
                      },
                      '& .MuiChip-label': {
                        px: 1,
                      },
                    }}
                  />
                  {step === currentStep && isTyping && (
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 0.5,
                        ml: 'auto',
                      }}
                    >
                      <Box
                        sx={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          backgroundColor: 'primary.main',
                          animation: 'typing 1.4s infinite ease-in-out',
                          '&:nth-of-type(1)': { animationDelay: '0s' },
                          '&:nth-of-type(2)': { animationDelay: '0.2s' },
                          '&:nth-of-type(3)': { animationDelay: '0.4s' },
                          '@keyframes typing': {
                            '0%, 60%, 100%': { transform: 'translateY(0)' },
                            '30%': { transform: 'translateY(-10px)' },
                          },
                        }}
                      />
                      <Box
                        sx={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          backgroundColor: 'primary.main',
                          animation: 'typing 1.4s infinite ease-in-out',
                          animationDelay: '0.2s',
                        }}
                      />
                      <Box
                        sx={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          backgroundColor: 'primary.main',
                          animation: 'typing 1.4s infinite ease-in-out',
                          animationDelay: '0.4s',
                        }}
                      />
                    </Box>
                  )}
                </Box>
              </Slide>
            ))}
          </Box>
        </Paper>

      </Box>
    </div>
  );
};

export default ProcessingView;
