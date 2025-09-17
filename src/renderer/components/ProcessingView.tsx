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
  Visibility as VisibilityIcon,
  Tune as TuneIcon,
  AutoAwesome as AutoAwesomeIcon,
  Lightbulb as LightbulbIcon,
} from '@mui/icons-material';
import {
  Box,
  Chip,
  LinearProgress,
  Paper,
  Slide,
  Typography,
  Fade,
  Grow,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Card,
  CardContent,
  alpha
} from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import { ProcessingState } from '../../shared/types';

interface ProcessingViewProps {
  processingState: ProcessingState;
  baseImage: string | null;
  targetImages: string[];
  prompt?: string;
}

interface ThinkingStep {
  id: string;
  type: 'thinking' | 'analysis' | 'tool_call' | 'progress' | 'complete';
  content: string;
  step?: string;
  progress?: number;
  toolName?: string;
  timestamp: number;
  icon?: React.ReactNode;
}

const ProcessingView: React.FC<ProcessingViewProps> = ({ processingState, baseImage: _baseImage, targetImages: _targetImages }) => {
  const { status, progress } = processingState;
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [newStepIndex, setNewStepIndex] = useState<number>(-1);
  const stepsContainerRef = useRef<HTMLDivElement>(null);
  const lastStepRef = useRef<HTMLDivElement>(null);
  // Enhanced thinking log with structured data
  const [thinkingLog, setThinkingLog] = useState<ThinkingStep[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Reset logs when a new processing session starts
  useEffect(() => {
    if (processingState.isProcessing && (processingState.progress || 0) <= 5) {
      setThinkingSteps([]);
      setThinkingLog([]);
      setCurrentStep('');
    }
  }, [processingState.isProcessing]);

  // Listen for real streaming updates from the AI service
  useEffect(() => {
    const handleStreamingUpdate = (update: { type: string; content: string; step?: string; progress?: number; toolName?: string; toolArgs?: any }) => {
      const stepType = update.type as ThinkingStep['type'];
      const icon = getStepIcon(stepType);

      const newThinkingStep: ThinkingStep = {
        id: `step-${Date.now()}-${Math.random()}`,
        type: stepType,
        content: update.content,
        step: update.step || getStepName(stepType),
        progress: update.progress || 0,
        toolName: update.toolName,
        timestamp: Date.now(),
        icon
      };

      // Add new thinking step
      setThinkingSteps(prev => {
        const newSteps = [...prev, newThinkingStep];
        setNewStepIndex(newSteps.length - 1);
        return newSteps;
      });

      // Add to thinking log
      setThinkingLog(prev => {
        const next = [...prev, newThinkingStep];
        return next.length > 50 ? next.slice(-50) : next; // Keep last 50 steps
      });

      // Show typing animation for new steps
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 1500);
    };

    // Set up the streaming update listener
    if (window.electronAPI?.onStreamingUpdate) {
      window.electronAPI.onStreamingUpdate(handleStreamingUpdate);
    }

    // Cleanup function
    return () => {
      // Note: We can't easily remove the listener, but it's okay since it's scoped to this component
    };
  }, []);

  // Keep the old status-based updates as fallback for backward compatibility
  useEffect(() => {
    if (status && status !== currentStep) {
      setCurrentStep(status);
      // Only add if we don't have streaming updates (fallback)
      if (thinkingSteps.length === 0) {
        const stepType = parseStepType(status);
        const icon = getStepIcon(stepType);

        const newThinkingStep: ThinkingStep = {
          id: `step-${Date.now()}-${Math.random()}`,
          type: stepType,
          content: status.replace(/^AI:\s*/, '').trim(),
          step: getStepName(stepType),
          progress: progress || 0,
          timestamp: Date.now(),
          icon
        };

        // Add new thinking step
        setThinkingSteps(prev => {
          const newSteps = [...prev, newThinkingStep];
          setNewStepIndex(newSteps.length - 1);
          return newSteps;
        });

        // Add to thinking log
        setThinkingLog(prev => {
          const next = [...prev, newThinkingStep];
          return next.length > 50 ? next.slice(-50) : next; // Keep last 50 steps
        });

        // Show typing animation for new steps
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 1500);
      }
    }
  }, [status, currentStep, progress, thinkingSteps.length]);

  // Helper functions for parsing step information
  const parseStepType = (status: string): ThinkingStep['type'] => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('tool') || lowerStatus.includes('function')) return 'tool_call';
    if (lowerStatus.includes('analyzing') || lowerStatus.includes('examining')) return 'analysis';
    if (lowerStatus.includes('complete') || lowerStatus.includes('finished')) return 'complete';
    if (lowerStatus.includes('progress') || lowerStatus.includes('step')) return 'progress';
    return 'thinking';
  };

  const getStepIcon = (type: ThinkingStep['type']): React.ReactNode => {
    switch (type) {
      case 'thinking': return <PsychologyIcon />;
      case 'analysis': return <SearchIcon />;
      case 'tool_call': return <SettingsIcon />;
      case 'progress': return <AutoFixHighIcon />;
      case 'complete': return <CheckCircleIcon />;
      default: return <LightbulbIcon />;
    }
  };

  const getStepName = (type: ThinkingStep['type']): string => {
    switch (type) {
      case 'thinking': return 'AI Reasoning';
      case 'analysis': return 'Image Analysis';
      case 'tool_call': return 'Tool Execution';
      case 'progress': return 'Processing';
      case 'complete': return 'Complete';
      default: return 'Processing';
    }
  };

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

  // Auto-scroll the compact log to bottom on new lines
  useEffect(() => {
    if (!logContainerRef.current) return;
    logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
  }, [thinkingLog.length]);

  // Reset new step index after animation
  useEffect(() => {
    if (newStepIndex >= 0) {
      const timer = setTimeout(() => {
        setNewStepIndex(-1);
      }, 800); // Increased from 600ms for smoother feel
      return () => clearTimeout(timer);
    }
  }, [newStepIndex]);


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
          backgroundColor: 'background.default',
          p: 4,
          borderRadius: 2,
          position: 'relative',
        }}
      >
        {/* Header with AI icon */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Avatar
            sx={{
              width: 60,
              height: 60,
              backgroundColor: 'primary.main',
              animation: 'aiThinking 2s infinite ease-in-out',
              '@keyframes aiThinking': {
                '0%, 100%': {
                  transform: 'scale(1)',
                },
                '50%': {
                  transform: 'scale(1.05)',
                },
              },
            }}
          >
            <AutoAwesomeIcon sx={{ fontSize: '2rem', color: 'white' }} />
          </Avatar>
          <Box>
            <Typography
              variant="h4"
              fontWeight={600}
              sx={{
                color: 'text.primary',
                mb: 0.5
              }}
            >
              AI Recipe Wizard
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: 'text.secondary',
                fontWeight: 400
              }}
            >
              Crafting your perfect photo recipe...
            </Typography>
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ maxWidth: 600, width: '100%', mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Progress
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {Math.round(progress || 0)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress || 0}
            sx={{
              height: 8,
              borderRadius: 2,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 2,
                backgroundColor: 'primary.main',
              },
            }}
          />
        </Box>

        {/* AI Thinking Process Display */}
        <Card
          sx={{
            maxWidth: 800,
            width: '100%',
            backgroundColor: 'background.paper',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <PsychologyIcon sx={{ fontSize: '2rem', color: 'primary.main' }} />
              <Typography variant="h6" fontWeight={600} color="primary">
                AI Thinking Process
              </Typography>
            </Box>

            <Box
              ref={stepsContainerRef}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                height: '400px',
                overflowY: 'auto',
                overflowX: 'hidden',
                pr: 1,
                '&::-webkit-scrollbar': { width: 6 },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  borderRadius: 3
                },
              }}
            >
              {thinkingSteps.length === 0 ? (
                <Box sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'text.secondary'
                }}>
                  <LightbulbIcon sx={{ fontSize: '3rem', mb: 2, opacity: 0.5 }} />
                  <Typography variant="h6" color="text.secondary">
                    AI is analyzing your images...
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    The thinking process will appear here as the AI works
                  </Typography>
                </Box>
              ) : (
                thinkingSteps.map((step, index) => (
                  <Grow
                    in={true}
                    timeout={600}
                    key={step.id}
                    style={{
                      transitionDelay: index === newStepIndex ? '0ms' : `${index * 100}ms`,
                    }}
                  >
                    <Box
                      ref={index === thinkingSteps.length - 1 ? lastStepRef : null}
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 2,
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: step.type === 'complete' ? 'success.light' :
                          step.type === 'tool_call' ? 'info.light' :
                            step.type === 'analysis' ? 'primary.light' :
                              'grey.100',
                        border: `1px solid ${step.type === 'complete' ? 'success.main' :
                          step.type === 'tool_call' ? 'info.main' :
                            step.type === 'analysis' ? 'primary.main' :
                              'grey.300'}`,
                        transition: 'all 0.3s ease',
                        transform: index === newStepIndex ? 'scale(1.02)' : 'scale(1)',
                        '&:hover': {
                          transform: 'scale(1.01)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        },
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          backgroundColor: step.type === 'complete' ? 'success.main' :
                            step.type === 'tool_call' ? 'info.main' :
                              step.type === 'analysis' ? 'primary.main' : 'secondary.main',
                          color: 'white',
                        }}
                      >
                        {step.icon}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="subtitle2" fontWeight={600} color="primary">
                            {step.step}
                          </Typography>
                          <Chip
                            label={step.type}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontSize: '0.7rem',
                              height: 20,
                              backgroundColor: alpha('background.paper', 0.8)
                            }}
                          />
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{
                            lineHeight: 1.6,
                            color: 'text.primary',
                            wordBreak: 'break-word'
                          }}
                        >
                          {step.content}
                        </Typography>
                        {step.toolName && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            Using tool: {step.toolName}
                          </Typography>
                        )}
                      </Box>
                      {index === newStepIndex && isTyping && (
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                          <Box sx={{
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            backgroundColor: 'primary.main',
                            animation: 'typing 1.4s infinite ease-in-out',
                            '@keyframes typing': {
                              '0%, 60%, 100%': { transform: 'translateY(0)', opacity: 0.4 },
                              '30%': { transform: 'translateY(-10px)', opacity: 1 },
                            }
                          }} />
                          <Box sx={{
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            backgroundColor: 'primary.main',
                            animation: 'typing 1.4s infinite ease-in-out',
                            animationDelay: '0.2s'
                          }} />
                          <Box sx={{
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            backgroundColor: 'primary.main',
                            animation: 'typing 1.4s infinite ease-in-out',
                            animationDelay: '0.4s'
                          }} />
                        </Box>
                      )}
                    </Box>
                  </Grow>
                ))
              )}
            </Box>
          </CardContent>
        </Card>

      </Box>
    </div>
  );
};

export default ProcessingView;
