import {
  AutoFixHigh as AutoFixHighIcon,
  Brush as BrushIcon,
  CheckCircle as CheckCircleIcon,
  ColorLens as ColorLensIcon,
  GpsFixed as GpsFixedIcon,
  Movie as MovieIcon,
  Palette as PaletteIcon,
  Person as PersonIcon,
  Psychology as PsychologyIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  ShowChart as ShowChartIcon,
  TheaterComedy as TheaterComedyIcon,
  Thermostat as ThermostatIcon,
} from '@mui/icons-material';
import { Box, Chip, LinearProgress, Paper, Slide, Typography } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import { ProcessingState } from '../../shared/types';

interface ProcessingViewProps {
  processingState: ProcessingState;
  baseImage: string | null;
  targetImages: string[];
  prompt?: string;
}

const ProcessingView: React.FC<ProcessingViewProps> = ({ processingState, baseImage: _baseImage, targetImages: _targetImages }) => {
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
      setTimeout(() => setIsTyping(false), 1500); // Increased for more natural feel
    }
  }, [status, currentStep]);

  // Auto-scroll to bottom when new steps are added (less aggressive)
  useEffect(() => {
    if (lastStepRef.current && stepsContainerRef.current) {
      // Only scroll if we're near the bottom to avoid jumpy behavior
      const container = stepsContainerRef.current;
      const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100;

      if (isNearBottom) {
        lastStepRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest',
        });
      }
    }
  }, [thinkingSteps.length]);

  // Reset new step index after animation
  useEffect(() => {
    if (newStepIndex >= 0) {
      const timer = setTimeout(() => {
        setNewStepIndex(-1);
      }, 800); // Increased from 600ms for smoother feel
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
    <div className="container" style={{ maxWidth: 'none', padding: '20px' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          minHeight: '80vh',
          backgroundColor: '#f8fafc',
          p: 4,
          borderRadius: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <PsychologyIcon
            sx={{
              fontSize: '3rem',
              color: 'primary.main',
              animation: 'smoothPulse 3s infinite cubic-bezier(0.4, 0, 0.6, 1)',
              '@keyframes smoothPulse': {
                '0%, 100%': {
                  transform: 'scale(1) rotate(0deg)',
                  opacity: 1,
                  filter: 'brightness(1)',
                },
                '33%': {
                  transform: 'scale(1.05) rotate(2deg)',
                  opacity: 0.9,
                  filter: 'brightness(1.1)',
                },
                '66%': {
                  transform: 'scale(1.08) rotate(-1deg)',
                  opacity: 0.85,
                  filter: 'brightness(1.15)',
                },
              },
            }}
          />
          <Typography variant="h6" fontWeight={600} sx={{ textAlign: 'center' }}>
            AI is Thinking...
          </Typography>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ maxWidth: 600, width: '100%', mb: 4 }}>
          <LinearProgress
            variant="determinate"
            value={progress || 0}
            sx={{
              height: 12,
              borderRadius: 6,
              backgroundColor: 'rgba(0,0,0,0.08)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 6,
                transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 50%, #1976d2 100%)',
                backgroundSize: '200% 100%',
                animation: 'progressShimmer 2s infinite ease-in-out',
                '@keyframes progressShimmer': {
                  '0%': { backgroundPosition: '200% 0' },
                  '100%': { backgroundPosition: '-200% 0' },
                },
              },
            }}
          />
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 1.5,
              display: 'block',
              textAlign: 'center',
              fontWeight: 500,
              transition: 'all 0.3s ease',
            }}
          >
            {Math.round(progress || 0)}% Complete
          </Typography>
        </Box>

        {/* Thinking Steps */}
        <Paper
          elevation={1}
          sx={{
            p: 3,
            maxWidth: 700,
            width: '100%',
            backgroundColor: 'white',
            borderRadius: 3,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background:
                'linear-gradient(90deg, transparent 0%, rgba(25, 118, 210, 0.02) 25%, rgba(25, 118, 210, 0.06) 50%, rgba(25, 118, 210, 0.02) 75%, transparent 100%)',
              animation: 'smoothShimmer 6s infinite cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              '@keyframes smoothShimmer': {
                '0%': {
                  left: '-100%',
                  opacity: 0,
                },
                '10%': {
                  opacity: 1,
                },
                '90%': {
                  opacity: 1,
                },
                '100%': {
                  left: '100%',
                  opacity: 0,
                },
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
              height: '400px',
              overflowY: 'auto',
              overflowX: 'hidden',
              pr: 1,
              // Smooth momentum scrolling
              WebkitOverflowScrolling: 'touch',
              // Hide scrollbar completely
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              // For Firefox
              scrollbarWidth: 'none',
              // For IE and Edge
              msOverflowStyle: 'none',
            }}
          >
            {thinkingSteps.map((step, index) => (
              <Slide
                direction="up"
                in={true}
                timeout={500}
                key={index}
                style={{
                  transitionDelay: index === newStepIndex ? '0ms' : `${index * 80}ms`,
                }}
              >
                <Box
                  ref={index === thinkingSteps.length - 1 ? lastStepRef : null}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: 'transparent',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: index === newStepIndex ? 'scale(1.02) translateX(4px)' : 'scale(1)',
                    opacity: step === currentStep ? 1 : 0.85,
                    borderLeft: step === currentStep ? '3px solid' : '3px solid transparent',
                    borderLeftColor: step === currentStep ? 'primary.main' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.02)',
                      transform: 'scale(1.01) translateX(2px)',
                    },
                  }}
                >
                  <Chip
                    icon={getStepIcon(step)}
                    label={step}
                    color={getStepColor(step, index)}
                    variant="outlined"
                    size="small"
                    sx={{
                      fontWeight: step === currentStep ? 600 : 500,
                      fontSize: '0.875rem',
                      height: '32px',
                      '& .MuiChip-icon': {
                        fontSize: '1em',
                      },
                      '& .MuiChip-label': {
                        px: 1.5,
                        fontSize: '0.875rem',
                      },
                    }}
                  />
                  {step === currentStep && isTyping && (
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 0.7,
                        ml: 'auto',
                        alignItems: 'center',
                      }}
                    >
                      <Box
                        sx={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          backgroundColor: 'primary.main',
                          animation: 'smoothTyping 1.8s infinite cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                          '@keyframes smoothTyping': {
                            '0%, 70%, 100%': {
                              transform: 'translateY(0) scale(1)',
                              opacity: 0.6,
                            },
                            '35%': {
                              transform: 'translateY(-8px) scale(1.2)',
                              opacity: 1,
                            },
                          },
                        }}
                      />
                      <Box
                        sx={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          backgroundColor: 'primary.main',
                          animation: 'smoothTyping 1.8s infinite cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                          animationDelay: '0.3s',
                        }}
                      />
                      <Box
                        sx={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          backgroundColor: 'primary.main',
                          animation: 'smoothTyping 1.8s infinite cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                          animationDelay: '0.6s',
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
