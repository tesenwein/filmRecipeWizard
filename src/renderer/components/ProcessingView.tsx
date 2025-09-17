import {
  AutoFixHigh as AutoFixHighIcon,
  CheckCircle as CheckCircleIcon,
  Psychology as PsychologyIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  AutoAwesome as AutoAwesomeIcon,
  Lightbulb as LightbulbIcon,
} from '@mui/icons-material';
import {
  Box,
  Chip,
  LinearProgress,
  Typography,
  Grow,
  Avatar,
  Card,
  CardContent,
  alpha,
  useTheme
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
  toolArgs?: any;
  timestamp: number;
  icon?: React.ReactNode;
}


const ProcessingView: React.FC<ProcessingViewProps> = ({ processingState, baseImage: _baseImage, targetImages: _targetImages }) => {
  const theme = useTheme();
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
      // Skip progress updates entirely - they should only update progress, not create new steps
      if (update.type === 'progress') {
        // Just update the current step text if provided
        if (update.step) {
          setCurrentStep(update.step);
        }
        return;
      }

      const stepType = update.type as ThinkingStep['type'];
      const icon = getStepIcon(stepType);

      if (stepType === 'thinking') {
        // For thinking updates, append content to the last thinking step or create a new one
        setThinkingSteps(prev => {
          const lastStep = prev[prev.length - 1];
          if (lastStep && lastStep.type === 'thinking') {
            // Append content to existing thinking step
            const updatedSteps = [...prev];
            updatedSteps[updatedSteps.length - 1] = {
              ...lastStep,
              content: lastStep.content + update.content, // Append new content
              progress: update.progress || lastStep.progress,
              timestamp: Date.now()
            };
            return updatedSteps;
          } else {
            // Create new thinking step
            const newThinkingStep: ThinkingStep = {
              id: `step-${Date.now()}-${Math.random()}`,
              type: stepType,
              content: update.content,
              step: update.step || getStepName(stepType),
              progress: update.progress || 0,
              toolName: update.toolName,
              toolArgs: update.toolArgs,
              timestamp: Date.now(),
              icon
            };
            setNewStepIndex(prev.length);
            return [...prev, newThinkingStep];
          }
        });

        // Add to thinking log
        setThinkingLog(prev => {
          const lastLogStep = prev[prev.length - 1];
          if (lastLogStep && lastLogStep.type === 'thinking') {
            // Update last thinking step
            const updatedLog = [...prev];
            updatedLog[updatedLog.length - 1] = {
              ...lastLogStep,
              content: lastLogStep.content + update.content,
              progress: update.progress || lastLogStep.progress,
              timestamp: Date.now()
            };
            return updatedLog;
          } else {
            // Add new thinking step
            const newThinkingStep: ThinkingStep = {
              id: `step-${Date.now()}-${Math.random()}`,
              type: stepType,
              content: update.content,
              step: update.step || getStepName(stepType),
              progress: update.progress || 0,
              toolName: update.toolName,
              toolArgs: update.toolArgs,
              timestamp: Date.now(),
              icon
            };
            const next = [...prev, newThinkingStep];
            return next.length > 50 ? next.slice(-50) : next;
          }
        });
      } else {
        // For non-thinking updates (tool calls, etc.), create new steps as before
        const newThinkingStep: ThinkingStep = {
          id: `step-${Date.now()}-${Math.random()}`,
          type: stepType,
          content: update.content,
          step: update.step || getStepName(stepType),
          progress: update.progress || 0,
          toolName: update.toolName,
          toolArgs: update.toolArgs,
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
      }

      // Show typing animation for thinking-only updates to reduce flicker
      if (stepType === 'thinking') {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 1200);
      }
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
      // Also check if the status is not already covered by streaming content
      const hasSimilarContent = thinkingSteps.some(step =>
        step.content.toLowerCase().includes(status.toLowerCase()) ||
        status.toLowerCase().includes(step.content.toLowerCase())
      );

      if (thinkingSteps.length === 0 || !hasSimilarContent) {
        const stepType = parseStepType(status);
        const icon = getStepIcon(stepType);

        const newThinkingStep: ThinkingStep = {
          id: `step-${Date.now()}-${Math.random()}`,
          type: stepType,
          content: status.replace(/^AI:\s*/, '').trim(),
          step: getStepName(stepType),
          progress: progress || 0,
          toolName: undefined,
          toolArgs: undefined,
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

  // Removed duplicate auto-scroll; handled by the last-step effect below

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

  // Auto-scroll to bottom when a new step is added OR the last step grows
  const lastContentLenRef = useRef<number>(0);
  const lastStepIdRef = useRef<string | null>(null);
  useEffect(() => {
    const container = stepsContainerRef.current;
    if (!container) return;
    const last = thinkingSteps[thinkingSteps.length - 1];
    if (!last) return;

    const lastId = last.id;
    const currentLen = last.content?.length || 0;

    const isNewStep = lastStepIdRef.current !== lastId;
    const grew = currentLen > lastContentLenRef.current;

    if (isNewStep || grew) {
      container.scrollTop = container.scrollHeight;
    }

    lastStepIdRef.current = lastId;
    lastContentLenRef.current = currentLen;
  }, [thinkingSteps]);

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
          p: 4,
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
              variant="h5"
              fontWeight={600}
              sx={{
                color: 'text.primary',
                mb: 0.5
              }}
            >
              AI Recipe Wizard
            </Typography>
            <Typography
              variant="body1"
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
                pb: 2, // Add bottom padding to prevent cut-off
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
                          step.type === 'tool_call' ? 'grey.50' :
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
                              backgroundColor: alpha(theme.palette.background.paper, 0.8)
                            }}
                          />
                        </Box>
                        <Typography
                          component="div"
                          sx={{
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word',
                            whiteSpace: 'pre-wrap',
                            minHeight: '1.2em', // Prevent height jumping
                            lineHeight: 1.5,
                            fontFamily: 'inherit',
                            fontSize: '0.95rem',
                          }}
                        >
                          {step.content}
                        </Typography>
                        {step.toolName && (
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Using tool: {step.toolName}
                            </Typography>
                            {step.toolArgs && (
                              <Typography variant="caption" color="text.secondary" sx={{
                                display: 'block',
                                fontFamily: 'monospace',
                                fontSize: '0.7rem',
                                opacity: 0.8
                              }}>
                                {JSON.stringify(step.toolArgs, null, 2)}
                              </Typography>
                            )}
                          </Box>
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
