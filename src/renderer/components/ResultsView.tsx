import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HomeIcon from '@mui/icons-material/Home';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import MovieFilterIcon from '@mui/icons-material/MovieFilter';
import PaletteIcon from '@mui/icons-material/Palette';
import PersonIcon from '@mui/icons-material/Person';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import TuneIcon from '@mui/icons-material/Tune';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Avatar,
    Box,
    Button,
    Chip,
    Divider,
    IconButton,
    Paper,
    Slider,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
// Subcomponents
import React, { useEffect, useState } from 'react';
import { ProcessingResult, UserProfile } from '../../shared/types';
import { useAlert } from '../context/AlertContext';
import { useAppStore } from '../store/appStore';
import AIFunctionsSelector from './AIFunctionsSelector';
import ConfirmDialog from './ConfirmDialog';
import ImageSelectionChips from './results/ImageSelectionChips';
import RecipeNameHeader from './results/RecipeNameHeader';
import SingleImage from './SingleImage';

// Function to detect available features in AI adjustments
const getAvailableFeatures = (adjustments: any): string[] => {
  if (!adjustments) return [];

  const features: string[] = [];

  // Basic Adjustments
  if (
    adjustments.temperature !== undefined ||
    adjustments.tint !== undefined ||
    adjustments.exposure !== undefined ||
    adjustments.contrast !== undefined ||
    adjustments.highlights !== undefined ||
    adjustments.shadows !== undefined ||
    adjustments.whites !== undefined ||
    adjustments.blacks !== undefined ||
    adjustments.clarity !== undefined ||
    adjustments.vibrance !== undefined ||
    adjustments.saturation !== undefined
  ) {
    features.push('Basic Adjustments');
  }

  // HSL Adjustments
  const hasHSL = Object.keys(adjustments).some(
    key => key.startsWith('hue_') || key.startsWith('sat_') || key.startsWith('lum_')
  );
  if (hasHSL) {
    features.push('HSL Adjustments');
  }

  // Color Grading
  const hasColorGrading = Object.keys(adjustments).some(key => key.startsWith('color_grade_'));
  if (hasColorGrading) {
    features.push('Color Grading');
  }

  // Tone Curves
  if (
    adjustments.tone_curve ||
    adjustments.tone_curve_red ||
    adjustments.tone_curve_green ||
    adjustments.tone_curve_blue
  ) {
    features.push('Tone Curves');
  }

  // Point Color
  if (adjustments.point_colors && adjustments.point_colors.length > 0) {
    features.push('Point Color');
  }

  // Film Grain
  if (
    adjustments.grain_amount !== undefined ||
    adjustments.grain_size !== undefined ||
    adjustments.grain_frequency !== undefined
  ) {
    features.push('Film Grain');
  }

  // Local Adjustments (Masks)
  if (adjustments.masks && adjustments.masks.length > 0) {
    features.push('Local Adjustments');
  }

  return features;
};

interface ResultsViewProps {
  results: ProcessingResult[];
  baseImage: string | null;
  targetImages: string[];
  onReset: () => void;
  processId?: string; // Optional process ID to load base64 image data
  prompt?: string; // Optional prompt provided in this session
  aiFunctions?: {
    temperatureTint?: boolean;
    masks?: boolean;
    colorGrading?: boolean;
    hsl?: boolean;
    curves?: boolean;
    grain?: boolean;
    pointColor?: boolean;
  };
}

const ResultsView: React.FC<ResultsViewProps> = ({
  results,
  baseImage: _baseImage,
  targetImages: _targetImages,
  onReset,
  processId,
  prompt,
  aiFunctions,
}) => {
  const { showError } = useAlert();
  const { deleteRecipe } = useAppStore();
  // Base64 image data URLs for display
  const [baseImageUrls, setBaseImageUrls] = useState<string[]>([]);
  const [activeBase, setActiveBase] = useState(0);
  const [exportOptions, setExportOptions] = useState<
    Record<
      number,
      {
        wbBasic: boolean;
        exposure: boolean;
        hsl: boolean;
        colorGrading: boolean;
        curves: boolean;
        sharpenNoise: boolean;
        vignette: boolean;
        pointColor?: boolean;
        grain?: boolean;
        // Export strength multiplier (0.0–2.0). 0.5 = 50%.
        strength?: number;
      }
    >
  >({});

  const successfulResults = results.filter(result => result.success);
  const failedResults = results.filter(result => !result.success && result.error);
  const [processPrompt, setProcessPrompt] = useState<string | undefined>(undefined);
  const [processOptions, setProcessOptions] = useState<any | undefined>(undefined);
  const [author, setAuthor] = useState<UserProfile | undefined>(undefined);
  
  // Description editing state
  const [editingDescription, setEditingDescription] = useState<number | null>(null);
  const [descriptionInput, setDescriptionInput] = useState<string>('');

  // New state for tab management
  const [activeTab, setActiveTab] = useState(0);
  const [selectedResult, setSelectedResult] = useState(0);

  // LUT export state
  const [lutSize, setLutSize] = useState<'17' | '33' | '65'>('33');
  const [lutFormat, setLutFormat] = useState<'cube' | '3dl' | 'lut'>('cube');
  const [lutStrength, setLutStrength] = useState(100);
  const [profileExportStatus, setProfileExportStatus] = useState<{
    ok: boolean;
    msg: string;
    path?: string;
  } | null>(null);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleContinueAfterError = async () => {
    if (!processId) return;

    try {
      // Delete the failed recipe
      await deleteRecipe(processId);
      // Navigate to home (gallery)
      onReset();
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      showError('Failed to delete recipe. Please try again.');
    }
  };

  const handleAddRecipeImage = async () => {
    try {
      if (!processId) return;
      const files = await window.electronAPI.selectFiles({
        title: 'Select Recipe Image (Style Reference)',
        filters: [
          {
            name: 'Images',
            extensions: ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'dng', 'cr2', 'nef', 'arw'],
          },
        ],
        properties: ['openFile'],
      });
      if (files && files.length) {
        const res = await window.electronAPI.addBaseImages(processId, files.slice(0, 1));
        if (!res?.success) {
          showError(res?.error || 'Failed to add recipe image');
          return;
        }

        // Reload the image data after adding
        const [data, proc] = await Promise.all([
          window.electronAPI.getImageDataUrls(processId),
          window.electronAPI.getProcess(processId),
        ]);
        if (data.success) {
          setBaseImageUrls(Array.isArray(data.baseImageUrls) ? data.baseImageUrls : []);
          setActiveBase(0);
        }
        if (proc.success && proc.process) {
          try {
            useAppStore.getState().updateRecipe(processId, {
              recipeImageData: (proc.process as any).recipeImageData,
            } as any);
          } catch {
            // Ignore store update errors
          }
        }
      }
    } catch (e) {
      console.error('Failed to add recipe image:', e);
    }
  };

  // Description editing functions
  const startEditingDescription = (resultIndex: number) => {
    const result = successfulResults[resultIndex];
    const currentDescription = result.metadata?.aiAdjustments?.description || '';
    setDescriptionInput(currentDescription);
    setEditingDescription(resultIndex);
  };

  const cancelEditingDescription = () => {
    setEditingDescription(null);
    setDescriptionInput('');
  };

  const saveDescription = async (resultIndex: number) => {
    try {
      if (!processId) return;
      
      const newDescription = descriptionInput.trim();
      if (!newDescription) {
        cancelEditingDescription();
        return;
      }

      // Update the recipe in storage
      await useAppStore.getState().updateRecipeInStorage(processId, { 
        description: newDescription 
      } as any);
      
      setEditingDescription(null);
      setDescriptionInput('');
    } catch (e) {
      console.error('Failed to save description:', e);
      showError('Failed to save description');
    }
  };

  const handleRemoveRecipeImage = async () => {
    try {
      if (!processId) return;
      const res = await window.electronAPI.removeBaseImage(processId, 0);
      if (!res?.success) {
        showError(res?.error || 'Failed to remove recipe image');
        return;
      }
      const [data, proc] = await Promise.all([
        window.electronAPI.getImageDataUrls(processId),
        window.electronAPI.getProcess(processId),
      ]);
      if (data.success) {
        setBaseImageUrls(Array.isArray(data.baseImageUrls) ? data.baseImageUrls : []);
        setActiveBase(0);
      }
      if (proc.success && proc.process) {
        try {
          useAppStore.getState().updateRecipe(processId, {
            recipeImageData: (proc.process as any).recipeImageData,
          } as any);
        } catch {
          // Ignore store update errors
        }
      }
    } catch (e) {
      console.error('Failed to remove recipe image:', e);
    }
  };

  // Confirm dialog for removing the recipe image
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const openRemoveDialog = () => setRemoveDialogOpen(true);
  const closeRemoveDialog = () => setRemoveDialogOpen(false);
  const confirmRemoveRecipeImage = async () => {
    try {
      await handleRemoveRecipeImage();
    } finally {
      setRemoveDialogOpen(false);
    }
  };

  // Load base64 image data when processId is provided
  useEffect(() => {
    const loadBase64Images = async () => {
      if (!processId) {
        // Clear base64 data when no processId
        setBaseImageUrls([]);
        setProcessPrompt(prompt);
        return;
      }

      try {
        const [imgResponse, processResponse] = await Promise.all([
          window.electronAPI.getImageDataUrls(processId),
          window.electronAPI.getProcess(processId),
        ]);
        if (imgResponse.success) {
          setBaseImageUrls(
            Array.isArray(imgResponse.baseImageUrls) ? imgResponse.baseImageUrls : []
          );
          setActiveBase(0);
        } else {
          throw new Error(imgResponse.error || 'Failed to load image data URLs');
        }
        if (processResponse.success && processResponse.process) {
          setProcessPrompt(processResponse.process.prompt);
          setProcessOptions(processResponse.process.userOptions);
          setAuthor((processResponse.process as any).author);
          // name is handled in header component
        } else {
          setProcessPrompt(prompt);
        }
      } catch (error) {
        console.error('[RESULTS] Error loading base64 images:', error);
        setBaseImageUrls([]);
        setProcessPrompt(prompt);
        setProcessOptions(undefined);
      }
    };

    loadBase64Images();
  }, [processId, prompt]);

  // Reset export options when aiFunctions changes
  useEffect(() => {
    setExportOptions({});
  }, [aiFunctions]);

  // Name editing handled by RecipeNameHeader subcomponent

  // Generate default options based on aiFunctions
  const getDefaultOptions = () =>
    ({
      wbBasic: aiFunctions?.temperatureTint ?? true,
      exposure: true, // Enable by default
      hsl: aiFunctions?.hsl ?? true,
      colorGrading: aiFunctions?.colorGrading ?? true,
      curves: aiFunctions?.curves ?? true,
      sharpenNoise: true, // Enable by default
      vignette: true, // Enable by default
      pointColor: aiFunctions?.pointColor ?? true,
      grain: aiFunctions?.grain ?? false, // Keep grain off by default as per user preference
      masks: aiFunctions?.masks ?? true,
      // Start export strength at 50%
      strength: 0.5,
    } as const);

  const defaultOptions = getDefaultOptions();

  const getOptions = (index: number) => exportOptions[index] || defaultOptions;

  const handleExportXMP = async (index: number, result: ProcessingResult) => {
    const adjustments = result.metadata?.aiAdjustments;
    if (!adjustments) return;
    try {
      const res = await window.electronAPI.downloadXMP({
        adjustments,
        include: getOptions(index),
      });
      if (!res.success) {
        showError(`Export failed: ${res.error}`);
      }
    } catch (e) {
      console.error('Export error:', e);
      showError('Export failed.');
    }
  };

  const handleExportLUT = async (result: ProcessingResult) => {
    const adjustments = result.metadata?.aiAdjustments;
    if (!adjustments) return;

    try {
      const res = await (window.electronAPI as any).generateLUT({
        adjustments,
        size: parseInt(lutSize),
        format: lutFormat,
        strength: lutStrength / 100, // Convert percentage to 0-1 range
      });
      if (!res.success) {
        showError(`LUT export failed: ${res.error}`);
      }
    } catch (e) {
      console.error('LUT export error:', e);
      showError('LUT export failed.');
    }
  };

  const handleExportProfile = async (index: number, result: any) => {
    setProfileExportStatus(null);
    try {
      // Extract adjustments same way as preset export
      const adjustments = result.metadata?.aiAdjustments;
      if (!adjustments) return;

      // Generate and export camera profile from current adjustments
      const res = await (window.electronAPI as any).exportProfile({
        adjustments,
        recipeIndex: index,
      });

      if (res?.success) {
        setProfileExportStatus({ ok: true, msg: '', path: res.outputPath });
      } else {
        setProfileExportStatus({ ok: false, msg: res?.error || 'Export failed' });
      }
    } catch (e) {
      setProfileExportStatus({ ok: false, msg: e instanceof Error ? e.message : 'Export failed' });
    }
  };

  return (
    <Box sx={{ maxWidth: '100%', margin: '0 auto' }}>
      {/* No Results Message */}
      {results.length === 0 && (
        <Paper className="card" sx={{ textAlign: 'center', py: 8 }}>
          <Box sx={{ mb: 3, opacity: 0.5 }}>
            <DownloadIcon sx={{ fontSize: 64, color: '#666' }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#666', mb: 2 }}>
            No Results Available
          </Typography>
          <Typography variant="body1" sx={{ color: '#999', mb: 4 }}>
            This project doesn't have any processing results yet, or they failed to load.
          </Typography>
          <Button variant="contained" onClick={onReset} startIcon={<RefreshIcon />}>
            Start New Process
          </Button>
        </Paper>
      )}

      {/* Failed Results Message */}
      {results.length > 0 && successfulResults.length === 0 && failedResults.length > 0 && (
        <Paper className="card" sx={{ textAlign: 'center', py: 8 }}>
          <Box sx={{ mb: 3, opacity: 0.5 }}>
            <DeleteOutlineIcon sx={{ fontSize: 64, color: '#d32f2f' }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#d32f2f', mb: 2 }}>
            Processing Failed
          </Typography>
          <Typography variant="body1" sx={{ color: '#999', mb: 4 }}>
            The AI processing failed for all images. This might be due to API issues or invalid
            images.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="outlined" onClick={onReset} startIcon={<RefreshIcon />}>
              Try Again
            </Button>
            <Button variant="contained" onClick={handleContinueAfterError} startIcon={<HomeIcon />}>
              Continue to Home
            </Button>
          </Box>
        </Paper>
      )}

      {/* Main Content with Tabs */}
      {successfulResults.length > 0 && (
        <Paper className="card" sx={{ p: 0, overflow: 'hidden' }}>
          <RecipeNameHeader
            processId={processId}
            successfulResults={successfulResults}
            selectedResult={selectedResult}
            processOptions={processOptions}
          />

          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              px: 3,
              pt: 1,
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
            }}
          >
            <Tab icon={<CompareArrowsIcon />} label="Overview" iconPosition="start" />
            <Tab icon={<TuneIcon />} label="Adjustments Details" iconPosition="start" />
            <Tab icon={<DownloadIcon />} label="Lightroom Export" iconPosition="start" />
            <Tab icon={<PaletteIcon />} label="LUT Export" iconPosition="start" />
            {author && (author.firstName || author.lastName) && (
              <Tab icon={<PersonOutlineIcon />} label="Author" iconPosition="start" />
            )}
          </Tabs>

          {/* Image Selection */}
          {successfulResults.length > 1 && (
            <ImageSelectionChips
              successfulResults={successfulResults}
              selectedResult={selectedResult}
              setSelectedResult={setSelectedResult}
              processOptions={processOptions}
            />
          )}

          {/* Tab Content */}
          <Box sx={{ p: 3 }}>
            {successfulResults.map((result, index) => (
              <Box
                key={index}
                sx={{
                  display: selectedResult === index ? 'block' : 'none',
                }}
              >
                {/* Tab Panel 1: Overview */}
                {activeTab === 0 && (
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{ mb: 4, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
                    >
                      <CompareArrowsIcon color="primary" />
                      Overview
                    </Typography>

                    <Box
                      sx={{
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: {
                          xs: '1fr',
                          md: '2fr 1fr',
                        },
                      }}
                    >
                      {/* Left Column: Basic Information */}
                      <Paper elevation={1} sx={{ p: 3 }}>
                        {/* Description */}
                        <Box sx={{ mb: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              Description
                            </Typography>
                            {editingDescription !== selectedResult && (
                              <IconButton 
                                size="small" 
                                onClick={() => startEditingDescription(selectedResult)}
                                title="Edit description"
                              >
                                <EditOutlinedIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                          
                          {editingDescription === selectedResult ? (
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                              <TextField
                                fullWidth
                                multiline
                                minRows={2}
                                maxRows={4}
                                value={descriptionInput}
                                onChange={(e) => setDescriptionInput(e.target.value)}
                                placeholder="Enter recipe description..."
                                size="small"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.ctrlKey) {
                                    e.preventDefault();
                                    saveDescription(selectedResult);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    cancelEditingDescription();
                                  }
                                }}
                              />
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <IconButton 
                                  size="small" 
                                  onClick={() => saveDescription(selectedResult)}
                                  title="Save description"
                                >
                                  <CheckIcon fontSize="small" />
                                </IconButton>
                                <IconButton 
                                  size="small" 
                                  onClick={cancelEditingDescription}
                                  title="Cancel editing"
                                >
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Box>
                          ) : (
                            <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                                {result.metadata?.aiAdjustments?.description || 'No description available'}
                              </Typography>
                            </Paper>
                          )}
                        </Box>

                        {/* AI Analysis */}
                        {result.metadata?.aiAdjustments?.reasoning && (
                          <Box sx={{ mb: 3 }}>
                            <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                {result.metadata.aiAdjustments.reasoning}
                              </Typography>
                            </Paper>
                          </Box>
                        )}

                        {/* User Prompt */}
                        {processPrompt && processPrompt.trim().length > 0 && (
                          <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                              User Prompt
                            </Typography>
                            <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                {processPrompt}
                              </Typography>
                            </Paper>
                          </Box>
                        )}

                        {/* Style Information */}
                        {processOptions &&
                          (processOptions.artistStyle ||
                            processOptions.filmStyle) && (
                            <Box sx={{ mb: 3 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                                Applied Styles
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {processOptions.artistStyle?.name && (
                                  <Chip
                                    label={`Artist: ${processOptions.artistStyle.name}`}
                                    variant="outlined"
                                  />
                                )}
                                {processOptions.filmStyle?.name && (
                                  <Chip
                                    label={`Film: ${processOptions.filmStyle.name}`}
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            </Box>
                          )}

                        {/* Options */}
                        {processOptions &&
                          (processOptions.filmGrain !== undefined ||
                            processOptions.preserveSkinTones !== undefined) && (
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                Options
                              </Typography>
                              <Box
                                sx={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                  gap: 2,
                                }}
                              >
                                {processOptions.filmGrain !== undefined && (
                                  <Paper
                                    variant="outlined"
                                    sx={{
                                      p: 2,
                                      textAlign: 'center',
                                      backgroundColor: 'grey.50',
                                      border: '1px solid',
                                      borderColor: 'grey.200',
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 0.5,
                                        mb: 1,
                                      }}
                                    >
                                      <MovieFilterIcon
                                        sx={{ fontSize: '16px', color: 'text.secondary' }}
                                      />
                                      <Typography
                                        variant="body2"
                                        sx={{ color: 'text.secondary', fontWeight: 600 }}
                                      >
                                        Film Grain
                                      </Typography>
                                    </Box>
                                    <Chip
                                      label={processOptions.filmGrain ? 'On' : 'Off'}
                                      color={processOptions.filmGrain ? 'success' : 'default'}
                                      variant="filled"
                                      size="small"
                                      sx={{ fontWeight: 600 }}
                                    />
                                  </Paper>
                                )}
                                {processOptions.preserveSkinTones !== undefined && (
                                  <Paper
                                    variant="outlined"
                                    sx={{
                                      p: 2,
                                      textAlign: 'center',
                                      backgroundColor: 'grey.50',
                                      border: '1px solid',
                                      borderColor: 'grey.200',
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 0.5,
                                        mb: 1,
                                      }}
                                    >
                                      <PersonIcon
                                        sx={{ fontSize: '16px', color: 'text.secondary' }}
                                      />
                                      <Typography
                                        variant="body2"
                                        sx={{ color: 'text.secondary', fontWeight: 600 }}
                                      >
                                        Preserve Skin Tones
                                      </Typography>
                                    </Box>
                                    <Chip
                                      label={processOptions.preserveSkinTones ? 'On' : 'Off'}
                                      color={
                                        processOptions.preserveSkinTones ? 'success' : 'default'
                                      }
                                      variant="filled"
                                      size="small"
                                      sx={{ fontWeight: 600 }}
                                    />
                                  </Paper>
                                )}
                              </Box>
                            </Box>
                          )}
                      </Paper>

                      {/* Right Column: Recipe Image */}
                      <Box>
                        <Paper elevation={1} sx={{ p: 3 }}>
                          <Box
                            sx={{
                              width: '100%',
                              height: 400,
                              borderRadius: 2,
                              overflow: 'hidden',
                              position: 'relative',
                              backgroundColor: 'grey.100',
                              cursor: baseImageUrls.length === 0 ? 'pointer' : 'default',
                            }}
                            onClick={baseImageUrls.length === 0 ? handleAddRecipeImage : undefined}
                          >
                            <SingleImage
                              source={baseImageUrls[activeBase]}
                              alt={`Recipe Image ${activeBase + 1}`}
                              fit="contain"
                              placeholderLabel={
                                baseImageUrls.length === 0 ? 'Click to add' : 'No image'
                              }
                              placeholderIcon={
                                baseImageUrls.length === 0 ? (
                                  <AddPhotoAlternateOutlinedIcon
                                    style={{ fontSize: 28, color: '#7c8aa0', opacity: 0.9 }}
                                  />
                                ) : undefined
                              }
                            />
                            {baseImageUrls.length > 0 && (
                              <IconButton
                                aria-label="Remove recipe image"
                                title="Remove recipe image"
                                onClick={openRemoveDialog}
                                size="small"
                                sx={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  zIndex: 2,
                                  bgcolor: 'rgba(255,255,255,0.7)',
                                  backdropFilter: 'blur(8px)',
                                  WebkitBackdropFilter: 'blur(8px)',
                                  border: '1px solid rgba(0,0,0,0.06)',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                  color: 'error.main',
                                  '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.9)',
                                  },
                                }}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            )}
                            {baseImageUrls.length > 1 && (
                              <>
                                <Button
                                  variant="contained"
                                  size="small"
                                  onClick={() =>
                                    setActiveBase(
                                      (activeBase - 1 + baseImageUrls.length) % baseImageUrls.length
                                    )
                                  }
                                  sx={{
                                    position: 'absolute',
                                    top: 'calc(50% - 16px)',
                                    left: 8,
                                    minWidth: 0,
                                    p: 0.5,
                                    opacity: 0.8,
                                  }}
                                >
                                  ‹
                                </Button>
                                <Button
                                  variant="contained"
                                  size="small"
                                  onClick={() =>
                                    setActiveBase((activeBase + 1) % baseImageUrls.length)
                                  }
                                  sx={{
                                    position: 'absolute',
                                    top: 'calc(50% - 16px)',
                                    right: 8,
                                    minWidth: 0,
                                    p: 0.5,
                                    opacity: 0.8,
                                  }}
                                >
                                  ›
                                </Button>
                              </>
                            )}
                          </Box>
                        </Paper>
                        <ConfirmDialog
                          open={removeDialogOpen}
                          onClose={closeRemoveDialog}
                          onConfirm={confirmRemoveRecipeImage}
                          title="Remove Recipe Image"
                          content="Are you sure you want to remove the recipe reference image?"
                          confirmButtonText="Remove"
                          confirmColor="error"
                        />
                      </Box>
                    </Box>
                  </Box>
                )}

                {/* Tab Panel 2: Adjustments */}
                {activeTab === 1 && result.metadata?.aiAdjustments && (
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{ mb: 4, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
                    >
                      <TuneIcon color="primary" />
                      Applied Adjustments
                      <Chip
                        label={`${Math.round(
                          (result.metadata.aiAdjustments.confidence || 0) * 100
                        )}% Confidence`}
                        size="medium"
                        color="primary"
                        sx={{ ml: 'auto' }}
                      />
                    </Typography>

                    {/* Processing Context */}
                    {(processPrompt || processOptions) && (
                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Processing Context
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {processPrompt && processPrompt.trim().length > 0 && (
                              <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                                  Prompt
                                </Typography>
                                <Paper sx={{ p: 3, backgroundColor: 'grey.50' }}>
                                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                    {processPrompt}
                                  </Typography>
                                </Paper>
                              </Box>
                            )}
                            {processOptions && (
                              <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                  User Settings
                                </Typography>
                                <Paper sx={{ p: 3, backgroundColor: 'grey.50' }}>
                                  <Box
                                    sx={{
                                      display: 'grid',
                                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                      gap: 2,
                                    }}
                                  >
                                    <Typography variant="body1">
                                      <strong>Vibe:</strong> {processOptions.vibe || '—'}
                                    </Typography>
                                    <Typography variant="body1">
                                      <strong>Warmth:</strong> {processOptions.warmth ?? '—'}
                                    </Typography>
                                    <Typography variant="body1">
                                      <strong>Tint:</strong> {processOptions.tint ?? '—'}
                                    </Typography>
                                    <Typography variant="body1">
                                      <strong>Contrast:</strong> {processOptions.contrast ?? '—'}
                                    </Typography>
                                    <Typography variant="body1">
                                      <strong>Vibrance:</strong> {processOptions.vibrance ?? '—'}
                                    </Typography>
                                    <Typography variant="body1">
                                      <strong>Moodiness:</strong> {processOptions.moodiness ?? '—'}
                                    </Typography>
                                    <Typography variant="body1">
                                      <strong>Saturation Bias:</strong>{' '}
                                      {processOptions.saturationBias ?? '—'}
                                    </Typography>
                                    <Typography variant="body1">
                                      <strong>Film Grain:</strong>{' '}
                                      {processOptions.filmGrain ? 'On' : 'Off'}
                                    </Typography>
                                    <Typography variant="body1">
                                      <strong>Preserve Skin Tones:</strong>{' '}
                                      {processOptions.preserveSkinTones ? 'On' : 'Off'}
                                    </Typography>
                                    {processOptions.artistStyle?.name && (
                                      <Typography variant="body1">
                                        <strong>Artist Style:</strong>{' '}
                                        {processOptions.artistStyle.name}
                                      </Typography>
                                    )}
                                    {processOptions.filmStyle?.name && (
                                      <Typography variant="body1">
                                        <strong>Film Stock:</strong> {processOptions.filmStyle.name}
                                      </Typography>
                                    )}
                                  </Box>
                                </Paper>
                              </Box>
                            )}
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    )}

                    {/* Basic Adjustments */}
                    <Accordion defaultExpanded>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">Basic Adjustments</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 4,
                            flexDirection: { xs: 'column', md: 'row' },
                          }}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant="subtitle1"
                              sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}
                            >
                              White Balance
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <Typography variant="body1">Temperature</Typography>
                                <Chip
                                  label={`${Math.round(
                                    result.metadata.aiAdjustments.temperature || 0
                                  )} K`}
                                  variant="outlined"
                                />
                              </Box>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <Typography variant="body1">Tint</Typography>
                                <Chip
                                  label={Math.round(result.metadata.aiAdjustments.tint || 0)}
                                  variant="outlined"
                                />
                              </Box>
                            </Box>
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant="subtitle1"
                              sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}
                            >
                              Exposure
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <Typography variant="body1">Exposure</Typography>
                                <Chip
                                  label={(result.metadata.aiAdjustments.exposure || 0).toFixed(2)}
                                  variant="outlined"
                                />
                              </Box>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <Typography variant="body1">Contrast</Typography>
                                <Chip
                                  label={result.metadata.aiAdjustments.contrast ?? 0}
                                  variant="outlined"
                                />
                              </Box>
                            </Box>
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant="subtitle1"
                              sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}
                            >
                              Tone
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <Typography variant="body1">Highlights</Typography>
                                <Chip
                                  label={result.metadata.aiAdjustments.highlights ?? 0}
                                  variant="outlined"
                                />
                              </Box>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <Typography variant="body1">Shadows</Typography>
                                <Chip
                                  label={result.metadata.aiAdjustments.shadows ?? 0}
                                  variant="outlined"
                                />
                              </Box>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <Typography variant="body1">Whites</Typography>
                                <Chip
                                  label={result.metadata.aiAdjustments.whites ?? 0}
                                  variant="outlined"
                                />
                              </Box>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <Typography variant="body1">Blacks</Typography>
                                <Chip
                                  label={result.metadata.aiAdjustments.blacks ?? 0}
                                  variant="outlined"
                                />
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                      </AccordionDetails>
                    </Accordion>

                    {/* Presence & Color */}
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">Presence & Color</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 3,
                            flexDirection: { xs: 'column', sm: 'row' },
                          }}
                        >
                          <Box
                            sx={{
                              flex: 1,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <Typography variant="body1">Clarity</Typography>
                            <Chip
                              label={result.metadata.aiAdjustments.clarity ?? 0}
                              variant="outlined"
                            />
                          </Box>
                          <Box
                            sx={{
                              flex: 1,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <Typography variant="body1">Vibrance</Typography>
                            <Chip
                              label={result.metadata.aiAdjustments.vibrance ?? 0}
                              variant="outlined"
                            />
                          </Box>
                          <Box
                            sx={{
                              flex: 1,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <Typography variant="body1">Saturation</Typography>
                            <Chip
                              label={result.metadata.aiAdjustments.saturation ?? 0}
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      </AccordionDetails>
                    </Accordion>

                    {/* HSL Adjustments */}
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">HSL Color Adjustments</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 3,
                            flexDirection: { xs: 'column', md: 'row' },
                          }}
                        >
                          {['Hue', 'Saturation', 'Luminance'].map(adjustmentType => (
                            <Box key={adjustmentType} sx={{ flex: 1 }}>
                              <Typography
                                variant="subtitle1"
                                sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}
                              >
                                {adjustmentType}
                              </Typography>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {[
                                  'red',
                                  'orange',
                                  'yellow',
                                  'green',
                                  'aqua',
                                  'blue',
                                  'purple',
                                  'magenta',
                                ].map(color => {
                                  const key = `${adjustmentType
                                    .toLowerCase()
                                    .slice(0, 3)}_${color}`;
                                  const value = (result.metadata!.aiAdjustments as any)[key] ?? 0;
                                  return (
                                    <Box
                                      key={color}
                                      sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                      }}
                                    >
                                      <Typography
                                        variant="body2"
                                        sx={{ textTransform: 'capitalize' }}
                                      >
                                        {color}
                                      </Typography>
                                      <Chip size="small" label={value} variant="outlined" />
                                    </Box>
                                  );
                                })}
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </AccordionDetails>
                    </Accordion>

                    {/* AI Notes */}
                    {typeof result.metadata.aiAdjustments.reasoning === 'string' &&
                      result.metadata.aiAdjustments.reasoning.trim().length > 0 && (
                        <Accordion>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">Analysis Notes</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Paper sx={{ p: 3, backgroundColor: 'grey.50' }}>
                              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                {result.metadata.aiAdjustments.reasoning}
                              </Typography>
                            </Paper>
                          </AccordionDetails>
                        </Accordion>
                      )}

                    {/* AI Functions Used */}
                    {aiFunctions && (
                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            AI Functions Used
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <AIFunctionsSelector
                            styleOptions={{ aiFunctions }}
                            onStyleOptionsChange={() => {}} // Read-only in results view
                          />
                        </AccordionDetails>
                      </Accordion>
                    )}
                  </Box>
                )}

                {/* Tab Panel 3: Lightroom Export */}
                {activeTab === 2 && (
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
                    >
                      <DownloadIcon color="primary" />
                      Lightroom Export
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Paper elevation={1} sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                          Lightroom Preset (.xmp)
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                          The XMP preset will include these features detected in the AI adjustments:
                        </Typography>
                        {(() => {
                          const availableFeatures = getAvailableFeatures(
                            result.metadata?.aiAdjustments
                          );
                          if (availableFeatures.length === 0) {
                            return (
                              <Typography
                                variant="body2"
                                sx={{ color: 'text.secondary', fontStyle: 'italic' }}
                              >
                                No specific features detected - basic adjustments will be included
                              </Typography>
                            );
                          }
                          return (
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {availableFeatures.map((feature, idx) => (
                                <Chip
                                  key={idx}
                                  size="small"
                                  label={feature}
                                  color="primary"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          );
                        })()}
                        {/* Export Strength and Button - 50/50 Layout */}
                        <Box sx={{ display: 'flex', gap: 3, mt: 3, alignItems: 'stretch' }}>
                          <Paper
                            variant="outlined"
                            sx={{ p: 3, flex: 1, backgroundColor: 'grey.50' }}
                          >
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                              Export Strength
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Slider
                                value={Math.round((getOptions(index).strength ?? 0.5) * 100)}
                                onChange={(_e, val) => {
                                  const pct = Array.isArray(val) ? val[0] : (val as number);
                                  setExportOptions(prev => ({
                                    ...prev,
                                    [index]: {
                                      ...(prev[index] || defaultOptions),
                                      strength: Math.max(0, Math.min(200, pct)) / 100,
                                    },
                                  }));
                                }}
                                min={0}
                                max={200}
                                step={5}
                                valueLabelDisplay="auto"
                                valueLabelFormat={v => `${v}%`}
                                sx={{ flex: 1 }}
                              />
                              <Typography variant="body2" sx={{ width: 56, textAlign: 'right' }}>
                                {Math.round((getOptions(index).strength ?? 0.5) * 100)}%
                              </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              Tip: 100% applies the full AI adjustments. 50% is softer.
                            </Typography>
                          </Paper>
                          <Box
                            sx={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                            }}
                          >
                            <Button
                              variant="contained"
                              startIcon={<DownloadIcon />}
                              onClick={() => handleExportXMP(index, result)}
                              sx={{ textTransform: 'none', fontWeight: 700, py: 2, px: 4 }}
                              size="large"
                            >
                              Export Preset (.xmp)
                            </Button>
                          </Box>
                        </Box>
                      </Paper>

                      {/* Divider between Preset and Camera Profile */}
                      <Box sx={{ display: 'flex', alignItems: 'center', my: 4 }}>
                        <Divider sx={{ flex: 1 }} />
                        <Typography
                          variant="body2"
                          sx={{ px: 2, color: 'text.secondary', fontWeight: 500 }}
                        >
                          OR
                        </Typography>
                        <Divider sx={{ flex: 1 }} />
                      </Box>

                      <Paper elevation={1} sx={{ p: 4 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                          Camera Profile (.xmp)
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                          Create a new Camera Profile from your recipe adjustments for use in
                          Lightroom.
                        </Typography>
                        {profileExportStatus && (
                          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                            <Typography
                              variant="body2"
                              color={profileExportStatus.ok ? 'success.main' : 'error.main'}
                              sx={{ fontWeight: 600 }}
                            >
                              {profileExportStatus.msg}
                            </Typography>
                          </Paper>
                        )}
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            variant="contained"
                            startIcon={<DownloadIcon />}
                            onClick={() => handleExportProfile(index, result)}
                            sx={{ textTransform: 'none', fontWeight: 700, py: 2, px: 4 }}
                            size="large"
                          >
                            Create Camera Profile (.xmp)
                          </Button>
                        </Box>
                      </Paper>
                    </Box>
                  </Box>
                )}

                {/* Tab Panel 4: LUT Export */}
                {activeTab === 3 && (
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{ mb: 4, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
                    >
                      <PaletteIcon color="primary" />
                      LUT Export
                    </Typography>

                    <Box
                      sx={{
                        display: 'grid',
                        gap: 3,
                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                      }}
                    >
                      {/* LUT Export Options */}
                      <Paper elevation={1} sx={{ p: 4 }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                          3D LUT Creation
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                          Generate a 3D LUT file that captures the color transformations from this
                          processing session.
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                              LUT Size
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {[
                                { value: '17', label: '17³ (Small)' },
                                { value: '33', label: '33³ (Standard)' },
                                { value: '65', label: '65³ (High Quality)' },
                              ].map(option => (
                                <Chip
                                  key={option.value}
                                  label={option.label}
                                  variant={lutSize === option.value ? 'filled' : 'outlined'}
                                  color={lutSize === option.value ? 'primary' : 'default'}
                                  clickable
                                  onClick={() => setLutSize(option.value as '17' | '33' | '65')}
                                  sx={{ cursor: 'pointer' }}
                                />
                              ))}
                            </Box>
                          </Box>

                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                              Format
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {[
                                { value: 'cube', label: '.cube (Adobe)' },
                                { value: '3dl', label: '.3dl (Autodesk)' },
                                { value: 'lut', label: '.lut (DaVinci)' },
                              ].map(format => (
                                <Chip
                                  key={format.value}
                                  label={format.label}
                                  variant={lutFormat === format.value ? 'filled' : 'outlined'}
                                  color={lutFormat === format.value ? 'primary' : 'default'}
                                  clickable
                                  onClick={() =>
                                    setLutFormat(format.value as 'cube' | '3dl' | 'lut')
                                  }
                                  sx={{ cursor: 'pointer' }}
                                />
                              ))}
                            </Box>
                          </Box>

                          <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'grey.50' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                              Export Strength
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Slider
                                value={lutStrength}
                                onChange={(_e, val) => {
                                  const pct = Array.isArray(val) ? val[0] : (val as number);
                                  setLutStrength(Math.max(0, Math.min(200, pct)));
                                }}
                                min={0}
                                max={200}
                                step={5}
                                valueLabelDisplay="auto"
                                valueLabelFormat={v => `${v}%`}
                                sx={{ flex: 1, maxWidth: 300 }}
                              />
                              <Typography variant="body2" sx={{ width: 56, textAlign: 'right' }}>
                                {lutStrength}%
                              </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              Tip: 100% applies the full AI adjustments. Lower values create more
                              subtle effects.
                            </Typography>
                          </Paper>
                        </Box>

                        <Button
                          variant="contained"
                          size="large"
                          startIcon={<PaletteIcon />}
                          fullWidth
                          onClick={() => handleExportLUT(result)}
                          sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            py: 1.5,
                          }}
                        >
                          Generate {lutSize}³ .{lutFormat} LUT
                        </Button>
                      </Paper>

                      {/* LUT Information */}
                      <Paper elevation={1} sx={{ p: 4 }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                          About LUTs
                        </Typography>

                        <Box sx={{ mb: 3 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}
                          >
                            What is a 3D LUT?
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                            A 3D Lookup Table captures the exact color transformations applied by
                            the AI, allowing you to recreate this look in other software.
                          </Typography>
                        </Box>

                        <Box sx={{ mb: 3 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}
                          >
                            Compatible Software
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              • Adobe Lightroom & Photoshop
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              • DaVinci Resolve
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              • Final Cut Pro
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              • Luminar & Aurora HDR
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              • Most video editing software
                            </Typography>
                          </Box>
                        </Box>

                        <Box
                          sx={{
                            p: 2,
                            backgroundColor: 'info.light',
                            borderRadius: 1,
                            color: 'info.contrastText',
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              mb: 0.5,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                            }}
                          >
                            <LightbulbIcon sx={{ fontSize: '16px' }} />
                            Pro Tip
                          </Typography>
                          <Typography variant="body2">
                            33³ LUTs offer the best balance of quality and file size for most
                            applications.
                          </Typography>
                        </Box>
                      </Paper>
                    </Box>
                  </Box>
                )}

                {/* Tab Panel 5: Author */}
                {author && (author.firstName || author.lastName) && activeTab === 4 && (
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        mb: 3,
                        fontWeight: 600,
                        color: 'text.secondary',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <PersonOutlineIcon color="action" />
                      Author
                    </Typography>

                    {/* Single centered card with author information */}
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 4,
                          maxWidth: 560,
                          width: '100%',
                          borderRadius: 3,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: '1fr' }}>
                          {/* Avatar + Name */}
                          <Box
                            sx={{
                              mb: 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              textAlign: 'left',
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 48,
                                height: 48,
                                bgcolor: 'grey.100',
                                color: 'text.primary',
                                fontWeight: 600,
                              }}
                            >
                              {`${(author.firstName?.[0] || '').toUpperCase()}${(
                                author.lastName?.[0] || ''
                              ).toUpperCase()}`}
                            </Avatar>
                            {(author.firstName || author.lastName) && (
                              <Typography
                                variant="h6"
                                sx={{ fontWeight: 600, color: 'text.primary' }}
                              >
                                {[author.firstName, author.lastName].filter(Boolean).join(' ')}
                              </Typography>
                            )}
                          </Box>

                          <Divider />

                          {/* Contact Information Grid */}
                          <Box
                            sx={{
                              display: 'grid',
                              gap: 2.5,
                              gridTemplateColumns: {
                                xs: '1fr',
                                sm: 'repeat(auto-fit, minmax(220px, 1fr))',
                              },
                              alignItems: 'start',
                            }}
                          >
                            {/* Email */}
                            {author.email && (
                              <Box sx={{ textAlign: 'left' }}>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5 }}
                                >
                                  Email
                                </Typography>
                                <Typography
                                  variant="body2"
                                  component="a"
                                  href={`mailto:${author.email}`}
                                  sx={{
                                    color: 'text.primary',
                                    textDecoration: 'none',
                                    '&:hover': { textDecoration: 'underline' },
                                    wordBreak: 'break-all',
                                  }}
                                >
                                  {author.email}
                                </Typography>
                              </Box>
                            )}

                            {/* Website */}
                            {author.website && (
                              <Box sx={{ textAlign: 'left' }}>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5 }}
                                >
                                  Website
                                </Typography>
                                <Typography
                                  variant="body2"
                                  component="a"
                                  href="#"
                                  onClick={e => {
                                    e.preventDefault();
                                    window.open(author.website!, '_blank');
                                  }}
                                  sx={{
                                    color: 'text.primary',
                                    textDecoration: 'none',
                                    '&:hover': { textDecoration: 'underline' },
                                    wordBreak: 'break-all',
                                  }}
                                >
                                  {author.website}
                                </Typography>
                              </Box>
                            )}

                            {/* Instagram */}
                            {author.instagram && (
                              <Box sx={{ textAlign: 'left' }}>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5 }}
                                >
                                  Instagram
                                </Typography>
                                <Typography
                                  variant="body2"
                                  component="a"
                                  href="#"
                                  onClick={e => {
                                    e.preventDefault();
                                    let url: string;
                                    if (author.instagram!.startsWith('http')) {
                                      url = author.instagram!;
                                    } else {
                                      const instagramHandle = author.instagram!.replace(/^@/, '');
                                      url = `https://www.instagram.com/${instagramHandle}`;
                                    }
                                    window.open(url, '_blank');
                                  }}
                                  sx={{
                                    color: 'text.primary',
                                    textDecoration: 'none',
                                    '&:hover': { textDecoration: 'underline' },
                                  }}
                                >
                                  {author.instagram}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </Paper>
                    </Box>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default ResultsView;
