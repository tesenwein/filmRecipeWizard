import {
    AutoAwesome as AutoAwesomeIcon,
    CheckCircle as CheckCircleIcon,
    Palette as PaletteIcon,
    PhotoCamera as PhotoCameraIcon,
    Search as SearchIcon,
    Settings as SettingsIcon,
    Tune as TuneIcon
} from '@mui/icons-material';
import {
    Avatar,
    Box,
    Card,
    CardContent,
    Chip,
    Grow,
    LinearProgress,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { ProcessingState } from '../../shared/types';

interface ProcessingViewProps {
  processingState: ProcessingState;
  baseImage: string | null;
  targetImages: string[];
  prompt?: string;
}

interface RecipeStep {
  id: string;
  type: 'initialization' | 'analysis' | 'color_matching' | 'adjustments' | 'finalization' | 'complete';
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress?: number;
  timestamp: number;
  icon?: React.ReactNode;
  toolName?: string;
  subSteps?: string[];
}


const ProcessingView: React.FC<ProcessingViewProps> = ({ processingState, baseImage: _baseImage, targetImages: _targetImages }) => {
  const [recipeSteps, setRecipeSteps] = useState<RecipeStep[]>([]);

  // Initialize recipe steps when processing starts
  useEffect(() => {
    if (processingState.isProcessing && (processingState.progress || 0) <= 5) {
      const initialSteps: RecipeStep[] = [
        {
          id: 'init',
          type: 'initialization',
          title: 'Initializing AI Analysis',
          description: 'Setting up the AI engine and preparing image analysis',
          status: 'completed',
          progress: 100,
          timestamp: Date.now(),
          icon: <SettingsIcon />
        },
        {
          id: 'analysis',
          type: 'analysis',
          title: 'Analyzing Images',
          description: 'Examining reference and target images to understand color characteristics',
          status: 'active',
          progress: undefined, // Show indeterminate progress bar
          timestamp: Date.now(),
          icon: <SearchIcon />
        },
        {
          id: 'color_matching',
          type: 'color_matching',
          title: 'Color Matching',
          description: 'Identifying color palettes and tonal relationships between images',
          status: 'pending',
          progress: 0,
          timestamp: Date.now(),
          icon: <PaletteIcon />
        },
        {
          id: 'adjustments',
          type: 'adjustments',
          title: 'Generating Adjustments',
          description: 'Creating Lightroom/Camera Raw adjustments for exposure, contrast, and color',
          status: 'pending',
          progress: 0,
          timestamp: Date.now(),
          icon: <TuneIcon />
        },
        {
          id: 'finalization',
          type: 'finalization',
          title: 'Finalizing Recipe',
          description: 'Compiling all adjustments into the final photo recipe',
          status: 'pending',
          progress: 0,
          timestamp: Date.now(),
          icon: <PhotoCameraIcon />
        }
      ];
      setRecipeSteps(initialSteps);
    }
  }, [processingState.isProcessing]);

  // Listen for backend-driven streaming updates
  useEffect(() => {
    const handleStreamingUpdate = (update: { type: string; content: string; step?: string; progress?: number; toolName?: string; toolArgs?: any }) => {
      setRecipeSteps(prev => {
        const updatedSteps = [...prev];
        const currentProgress = update.progress || 0;

        // Handle backend-driven step updates
        if (update.type === 'step_progress') {
          // Update progress for the specified step
          const stepIndex = updatedSteps.findIndex(step => step.type === update.step);
          if (stepIndex >= 0 && updatedSteps[stepIndex].status === 'active') {
            updatedSteps[stepIndex] = {
              ...updatedSteps[stepIndex],
              progress: Math.min(currentProgress, 100)
            };
          }
        } else if (update.type === 'step_transition') {
          // Transition to the specified step
          const targetStepIndex = updatedSteps.findIndex(step => step.type === update.step);
          if (targetStepIndex >= 0) {
            // Complete current active step
            const currentActiveIndex = updatedSteps.findIndex(step => step.status === 'active');
            if (currentActiveIndex >= 0) {
              updatedSteps[currentActiveIndex] = {
                ...updatedSteps[currentActiveIndex],
                status: 'completed',
                progress: 100
              };
            }

            // Activate target step immediately
            updatedSteps[targetStepIndex] = {
              ...updatedSteps[targetStepIndex],
              status: 'active',
              progress: Math.min(currentProgress, 100),
              toolName: update.toolName
            };
          }
        } else if (update.type === 'tool-result') {
          // Handle tool results - mark current step as completed
          const activeStepIndex = updatedSteps.findIndex(step => step.status === 'active');
          if (activeStepIndex >= 0) {
            updatedSteps[activeStepIndex] = {
              ...updatedSteps[activeStepIndex],
              status: 'completed',
              progress: 100
            };
          }
        } else if (update.type === 'complete') {
          // Complete all remaining steps
          updatedSteps.forEach((step, index) => {
            if (step.status === 'active' || step.status === 'pending') {
              updatedSteps[index] = {
                ...step,
                status: 'completed',
                progress: 100
              };
            }
          });
        }

        return updatedSteps;
      });
    };

    // Set up the streaming update listener
    if (window.electronAPI?.onStreamingUpdate) {
      window.electronAPI.onStreamingUpdate(handleStreamingUpdate);
    }

    return () => {
      // Cleanup
    };
  }, []);

  // Helper function to get step status color
  const getStepStatusColor = (status: RecipeStep['status']) => {
    switch (status) {
      case 'completed': return 'primary.main';
      case 'active': return 'primary.main';
      case 'error': return 'grey.600';
      default: return 'grey.400';
    }
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
          p: 2,
          position: 'relative',
        }}
      >
        {/* Header with AI icon */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
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
            <AutoAwesomeIcon sx={{ fontSize: '1.5rem', color: 'white' }} />
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
                fontWeight: 400,
                fontStyle: 'normal' // Ensure description is not italic
              }}
            >
              Crafting your perfect photo recipe...
            </Typography>
          </Box>
        </Box>


        {/* Recipe Generation Steps */}
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
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}>
              Recipe Generation Progress
            </Typography>

            <Box sx={{ width: '100%' }}>
              {recipeSteps.map((step, _index) => (
                <Grow in={true} timeout={600} key={step.id}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      mb: 1.5,
                      borderRadius: 2,
                      backgroundColor: step.status === 'completed' ? 'grey.50' :
                        step.status === 'active' ? 'grey.100' :
                          step.status === 'error' ? 'grey.50' : 'grey.50',
                      border: `1px solid ${step.status === 'completed' ? 'grey.300' :
                        step.status === 'active' ? 'primary.main' :
                          step.status === 'error' ? 'grey.400' : 'grey.300'}`,
                      transition: 'all 0.3s ease',
                      opacity: step.status === 'pending' ? 0.6 : 1,
                      transform: step.status === 'active' ? 'scale(1.01)' : 'scale(1)',
                      boxShadow: step.status === 'active' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        backgroundColor: getStepStatusColor(step.status),
                        color: 'white',
                        animation: step.status === 'active' ? 'pulse 2s infinite' : 'none',
                        '@keyframes pulse': {
                          '0%': { transform: 'scale(1)' },
                          '50%': { transform: 'scale(1.05)' },
                          '100%': { transform: 'scale(1)' },
                        },
                      }}
                    >
                      {step.status === 'completed' ? <CheckCircleIcon /> : step.icon}
                    </Avatar>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.25 }}>
                        {step.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.85rem', fontStyle: 'normal' }}>
                        {step.description}
                      </Typography>


                      {/* Show sub-steps for active tool execution only */}
                      {step.status === 'active' && step.subSteps && step.subSteps.length > 0 && (
                        <Box sx={{ mb: 1 }}>
                          <List dense sx={{ py: 0 }}>
                            {step.subSteps.map((subStep, subIndex) => (
                              <ListItem key={subIndex} sx={{ py: 0.25, px: 0 }}>
                                <ListItemIcon sx={{ minWidth: 20 }}>
                                  <Box
                                    sx={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: '50%',
                                      backgroundColor: 'primary.main',
                                      animation: 'pulse 2s infinite',
                                      animationDelay: `${subIndex * 0.3}s`,
                                    }}
                                  />
                                </ListItemIcon>
                                <ListItemText
                                  primary={
                                    <Typography variant="caption" color="text.secondary">
                                      {subStep}
                                    </Typography>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}

                      {step.status === 'active' && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant={step.progress !== undefined ? "determinate" : "indeterminate"}
                            value={step.progress}
                            sx={{
                              flex: 1,
                              height: 4,
                              borderRadius: 2,
                              backgroundColor: 'rgba(0,0,0,0.1)',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 2,
                                backgroundColor: 'primary.main',
                              },
                            }}
                          />
                          {step.progress !== undefined && (
                            <Typography variant="caption" sx={{ minWidth: '35px', textAlign: 'right' }}>
                              {Math.round(step.progress)}%
                            </Typography>
                          )}
                        </Box>
                      )}

                      {step.status === 'completed' && (
                        <Box sx={{ mt: 0.5 }}>
                          <Chip
                            label="Completed"
                            size="small"
                            variant="outlined"
                            sx={{
                              fontSize: '0.7rem',
                              borderColor: 'primary.main',
                              color: 'primary.main'
                            }}
                          />
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Grow>
              ))}
            </Box>
          </CardContent>
        </Card>

      </Box>
    </div>
  );
};

export default ProcessingView;
