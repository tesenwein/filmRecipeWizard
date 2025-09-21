import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import ChatIcon from '@mui/icons-material/Chat';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HomeIcon from '@mui/icons-material/Home';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import PaletteIcon from '@mui/icons-material/Palette';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import TuneIcon from '@mui/icons-material/Tune';
import { Avatar, Box, Button, Chip, Divider, IconButton, Paper, Slider, Tab, Tabs, TextField, Typography } from '@mui/material';
// Subcomponents
import React, { useEffect, useRef, useState } from 'react';
import { ProcessingResult, UserProfile } from '../../shared/types';
import { useAlert } from '../context/AlertContext';
import { useAppStore } from '../store/appStore';
import ConfirmDialog from './ConfirmDialog';
import { RecipeAdjustmentsPanel } from './RecipeAdjustmentsPanel';
import RecipeChat from './RecipeChat';
import ImageSelectionChips from './results/ImageSelectionChips';
import RecipeNameHeader from './results/RecipeNameHeader';
import SingleImage from './SingleImage';

// Function to detect available features in AI adjustments
const getAvailableFeatures = (adjustments: any): string[] => {
  if (!adjustments) return [];

  const features: string[] = [];

  // Basic Adjustments
  if (
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
  const hasHSL = Object.keys(adjustments).some(key => key.startsWith('hue_') || key.startsWith('sat_') || key.startsWith('lum_'));
  if (hasHSL) {
    features.push('HSL Adjustments');
  }

  // Color Grading
  const hasColorGrading = Object.keys(adjustments).some(key => key.startsWith('color_grade_'));
  if (hasColorGrading) {
    features.push('Color Grading');
  }

  // Tone Curves
  if (adjustments.tone_curve || adjustments.tone_curve_red || adjustments.tone_curve_green || adjustments.tone_curve_blue) {
    features.push('Tone Curves');
  }

  // Point Color
  if (adjustments.point_colors && adjustments.point_colors.length > 0) {
    features.push('Point Color');
  }

  // Film Grain
  if (adjustments.grain_amount !== undefined || adjustments.grain_size !== undefined || adjustments.grain_frequency !== undefined) {
    features.push('Film Grain');
  }

  // Post-Crop Vignette
  if (adjustments.vignette_amount !== undefined || adjustments.vignette_midpoint !== undefined || adjustments.vignette_feather !== undefined || adjustments.vignette_roundness !== undefined || adjustments.vignette_style !== undefined || adjustments.vignette_highlight_contrast !== undefined) {
    features.push('Post-Crop Vignette');
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
        // Export strength multiplier (0.0–2.0). 1.0 = 100%.
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
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [expectGenerating, setExpectGenerating] = useState(false);
  const subscribedRef = useRef(false);

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
        const [data, proc] = await Promise.all([window.electronAPI.getImageDataUrls(processId), window.electronAPI.getProcess(processId)]);
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
            console.debug('Store update error ignored');
          }
        }
      }
    } catch (e) {
      console.error('Failed to add recipe image:', e);
    }
  };

  // Description editing functions
  const startEditingDescription = (resultIndex: number) => {
    const currentDescription = processDescription || '';
    setDescriptionInput(currentDescription);
    setEditingDescription(resultIndex);
  };

  const cancelEditingDescription = () => {
    setEditingDescription(null);
    setDescriptionInput('');
  };

  const saveDescription = async (_resultIndex: number) => {
    try {
      if (!processId) return;

      const newDescription = descriptionInput.trim();
      if (!newDescription) {
        cancelEditingDescription();
        return;
      }

      // Update the recipe in storage
      await useAppStore.getState().updateRecipeInStorage(processId, {
        description: newDescription,
      } as any);

      // Reflect the change in UI immediately
      setProcessDescription(newDescription);

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
      const [data, proc] = await Promise.all([window.electronAPI.getImageDataUrls(processId), window.electronAPI.getProcess(processId)]);
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
          console.debug('Store update error ignored');
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

  const [processName, setProcessName] = useState<string | undefined>(undefined);
  const [maskOverrides, setMaskOverrides] = useState<any[] | undefined>(undefined);
  const [adjustmentOverrides, setAdjustmentOverrides] = useState<Record<string, number> | undefined>(undefined);
  const [processDescription, setProcessDescription] = useState<string | undefined>(undefined);
  
  // State for chat preview updates and pending modifications
  const [pendingChatModifications, setPendingChatModifications] = useState<any>(null);

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

        // Handle image data response - even if process not found, we get empty arrays
        if (imgResponse.success) {
          setBaseImageUrls(Array.isArray(imgResponse.baseImageUrls) ? imgResponse.baseImageUrls : []);
          setActiveBase(0);
        } else {
          console.warn('[RESULTS] Failed to load image data URLs:', imgResponse.error);
          setBaseImageUrls([]);
        }

        // Handle process data response
        if (processResponse.success && processResponse.process) {
          setProcessPrompt(processResponse.process.prompt);
          setProcessOptions(processResponse.process.userOptions);
          setAuthor((processResponse.process as any).author);
          const nm = (processResponse.process as any).name;
          setProcessName(typeof nm === 'string' && nm.trim().length > 0 ? nm : undefined);
          const desc = (processResponse.process as any).description;
          setProcessDescription(typeof desc === 'string' && desc.trim().length > 0 ? desc : undefined);

          // Do not source description from AI adjustments; keep top-level only
          const masks = (processResponse.process as any).maskOverrides;
          setMaskOverrides(Array.isArray(masks) ? masks : undefined);
          const adjOv = (processResponse.process as any).aiAdjustmentOverrides;
          setAdjustmentOverrides(adjOv && typeof adjOv === 'object' ? adjOv : undefined);
          // name is handled in header component
        } else {
          console.warn('[RESULTS] Process not found or failed to load:', processResponse.error);
          setProcessPrompt(prompt);
          setProcessOptions(undefined);
          setProcessName(undefined);
          setProcessDescription(undefined);
          setMaskOverrides(undefined);
          setAdjustmentOverrides(undefined);
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

  // Clear reprocessing indicator when recipe status flips away from 'generating'
  const { recipes } = useAppStore();
  useEffect(() => {
    if (!isReprocessing || !processId || !expectGenerating) return;
    const rec = recipes.find(r => r.id === processId);
    if (rec && rec.status && rec.status !== 'generating') {
      setIsReprocessing(false);
      setExpectGenerating(false);
    }
  }, [recipes, isReprocessing, processId]);

  // Clear indicator when processing completes event fires
  useEffect(() => {
    if (subscribedRef.current) return;
    subscribedRef.current = true;
    try {
      window.electronAPI.onProcessingComplete?.(() => {
        setIsReprocessing(false);
        setExpectGenerating(false);
      });
    } catch {
      // Ignore subscription errors
      console.debug('Subscription error ignored');
    }
  }, []);

  // Reset export options when aiFunctions changes
  useEffect(() => {
    setExportOptions({});
  }, [aiFunctions]);

  // Name editing handled by RecipeNameHeader subcomponent

  // Compute effective masks by applying overrides (add/update/remove) to AI masks
  const getEffectiveMasks = (aiMasks: any[] | undefined, overrides: any[] | undefined) => {
    const baseMasks = Array.isArray(aiMasks) ? [...aiMasks] : [];
    const ops = Array.isArray(overrides) ? overrides : [];
    const idOf = (m: any) => (m?.name && typeof m.name === 'string' ? m.name : `${m?.type || 'mask'}:${m?.subCategoryId ?? ''}`);
    const indexOf = (list: any[], m: any) => list.findIndex(x => idOf(x) === idOf(m));
    for (const op of ops) {
      const idx = indexOf(baseMasks, op);
      const kind = (op?.op || 'add') as string;
      if (kind === 'remove') {
        if (idx >= 0) baseMasks.splice(idx, 1);
        continue;
      }
      if (kind === 'update') {
        if (idx >= 0) {
          const prev = baseMasks[idx] || {};
          baseMasks[idx] = { ...prev, ...op, adjustments: { ...(prev.adjustments || {}), ...(op.adjustments || {}) } };
        } else {
          baseMasks.push(op);
        }
        continue;
      }
      // default add
      if (idx >= 0) {
        const prev = baseMasks[idx] || {};
        baseMasks[idx] = { ...prev, ...op, adjustments: { ...(prev.adjustments || {}), ...(op.adjustments || {}) } };
      } else {
        baseMasks.push(op);
      }
    }
    return baseMasks;
  };

  // Generate default options based on aiFunctions
  const getDefaultOptions = () =>
    ({
      exposure: true, // Enable by default
      hsl: aiFunctions?.hsl ?? true,
      colorGrading: aiFunctions?.colorGrading ?? true,
      curves: aiFunctions?.curves ?? true,
      sharpenNoise: true, // Enable by default
      vignette: true, // Enable by default
      pointColor: aiFunctions?.pointColor ?? true,
      grain: aiFunctions?.grain ?? false, // Keep grain off by default as per user preference
      masks: aiFunctions?.masks ?? true,
      // Start export strength at 100%
      strength: 1.0,
    } as const);

  const defaultOptions = getDefaultOptions();

  const getOptions = (index: number) => exportOptions[index] || defaultOptions;

  // Create effective adjustments by applying chat modifications to original aiAdjustments
  const getEffectiveAdjustments = (result: ProcessingResult) => {
    const originalAdjustments = result.metadata?.aiAdjustments;
    if (!originalAdjustments) return null;

    // Start with a copy of the original adjustments
    const effectiveAdjustments = { ...originalAdjustments };

    // Apply userOptions modifications if they exist
    if (processOptions) {
      // Map userOptions to aiAdjustments properties

      if (typeof processOptions.contrast === 'number') {
        effectiveAdjustments.contrast = processOptions.contrast;
      }

      if (typeof processOptions.vibrance === 'number') {
        effectiveAdjustments.vibrance = processOptions.vibrance;
      }

      if (typeof processOptions.saturationBias === 'number') {
        effectiveAdjustments.saturation = processOptions.saturationBias;
      }

    }

    // Apply mask overrides if they exist
    if (Array.isArray(maskOverrides) && maskOverrides.length > 0) {
      const idOf = (m: any) =>
        m?.id ||
        (m?.name
          ? `name:${m.name}`
          : `${m?.type || 'mask'}:${m?.subCategoryId ?? ''}:${(m?.referenceX ?? '').toString().slice(0, 4)}:${(m?.referenceY ?? '')
              .toString()
              .slice(0, 4)}`);
      const indexOf = (list: any[], m: any) => list.findIndex(x => idOf(x) === idOf(m));

      let masks = Array.isArray(effectiveAdjustments.masks) ? [...effectiveAdjustments.masks] : [];
      const ops = maskOverrides;

      for (const op of ops) {
        const operation = op.op || 'add';
        if (operation === 'remove_all' || operation === 'clear') {
          masks = [];
          continue;
        }
        const idx = indexOf(masks, op);
        if (operation === 'remove') {
          if (idx >= 0) masks.splice(idx, 1);
          continue;
        }
        if (operation === 'update') {
          if (idx >= 0) {
            const prev = masks[idx] || {};
            masks[idx] = {
              ...prev,
              ...op,
              id: (prev as any).id || (op as any).id,
              adjustments: { ...(prev.adjustments || {}), ...(op.adjustments || {}) },
            };
          } else {
            masks.push({ ...op, id: (op as any).id || idOf(op) });
          }
          continue;
        }
        // default add
        if (idx >= 0) {
          const prev = masks[idx] || {};
          masks[idx] = {
            ...prev,
            ...op,
            id: (prev as any).id || (op as any).id || idOf(op),
            adjustments: { ...(prev.adjustments || {}), ...(op.adjustments || {}) },
          };
        } else {
          masks.push({ ...op, id: (op as any).id || idOf(op) });
        }
      }

      effectiveAdjustments.masks = masks;
    }

    // Apply global adjustment overrides (e.g., grain, vignette) if present
    if (adjustmentOverrides && typeof adjustmentOverrides === 'object') {
      Object.assign(effectiveAdjustments as any, adjustmentOverrides);
    }

    return effectiveAdjustments;
  };

  const handleExportXMP = async (index: number, result: ProcessingResult) => {
    const adjustments = getEffectiveAdjustments(result);
    if (!adjustments) return;

    try {
      const adjForExport = { ...adjustments } as any;
      if (processName) adjForExport.preset_name = processName;
      if (processDescription) adjForExport.description = processDescription;
      const res = await window.electronAPI.downloadXMP({
        adjustments: adjForExport,
        include: getOptions(index),
        recipeName: processName,
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
    const adjustments = getEffectiveAdjustments(result);
    if (!adjustments) return;

    try {
      const adjForExport = { ...adjustments } as any;
      if (processName) adjForExport.preset_name = processName;
      if (processDescription) adjForExport.description = processDescription;
      
      const res = await (window.electronAPI as any).generateLUT({
        adjustments: adjForExport,
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
      const adjustments = getEffectiveAdjustments(result);
      if (!adjustments) return;

      // Generate and export camera profile from current adjustments
      const adjForExport = { ...adjustments } as any;
      if (processName) adjForExport.preset_name = processName;
      if (processDescription) adjForExport.description = processDescription;
      const res = await (window.electronAPI as any).exportProfile({
        adjustments: adjForExport,
        recipeIndex: index,
        recipeName: processName,
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
            The AI processing failed for all images. This might be due to API issues or invalid images.
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
            displayNameOverride={processName}
            onNameChange={n => {
              try {
                setProcessName(n);
              } catch {
                // Ignore name update errors
                console.debug('Name update error ignored');
              }
            }}
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
            <Tab icon={<ChatIcon />} label="AI Chat" iconPosition="start" />
            <Tab icon={<DownloadIcon />} label="Lightroom Export" iconPosition="start" />
            <Tab icon={<PaletteIcon />} label="LUT Export" iconPosition="start" />
            {author && (author.firstName || author.lastName) && <Tab icon={<PersonOutlineIcon />} label="Author" iconPosition="start" />}
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
                    <Typography variant="h5" sx={{ mb: 4, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
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
                          {editingDescription === selectedResult ? (
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                              <TextField
                                fullWidth
                                multiline
                                minRows={2}
                                maxRows={4}
                                value={descriptionInput}
                                onChange={e => setDescriptionInput(e.target.value)}
                                placeholder="Enter recipe description..."
                                size="small"
                                autoFocus
                                onKeyDown={e => {
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
                                <IconButton size="small" onClick={() => saveDescription(selectedResult)} title="Save description">
                                  <CheckIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" onClick={cancelEditingDescription} title="Cancel editing">
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Box>
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontStyle: 'italic', flex: 1 }}>
                                {processDescription || 'No description available'}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => startEditingDescription(selectedResult)}
                                title="Edit description"
                                sx={{ mt: -0.5 }}
                              >
                                <EditOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          )}
                        </Box>

                        {/* Style Information */}
                        {processOptions && (processOptions.artistStyle || processOptions.filmStyle) && (
                          <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                              Applied Styles
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {processOptions.artistStyle?.name && (
                                <Chip label={`Artist: ${processOptions.artistStyle.name}`} variant="outlined" />
                              )}
                              {processOptions.filmStyle?.name && (
                                <Chip label={`Film: ${processOptions.filmStyle.name}`} variant="outlined" />
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
                              placeholderLabel={baseImageUrls.length === 0 ? 'Click to add' : 'No image'}
                              placeholderIcon={
                                baseImageUrls.length === 0 ? (
                                  <AddPhotoAlternateOutlinedIcon style={{ fontSize: 28, color: '#7c8aa0', opacity: 0.9 }} />
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
                                  onClick={() => setActiveBase((activeBase - 1 + baseImageUrls.length) % baseImageUrls.length)}
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
                                  onClick={() => setActiveBase((activeBase + 1) % baseImageUrls.length)}
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
                    <Typography variant="h5" sx={{ mb: 4, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TuneIcon color="primary" />
                      Applied Adjustments
                      <Chip
                        label={`${Math.round((result.metadata.aiAdjustments.confidence || 0) * 100)}% Confidence`}
                        size="medium"
                        color="primary"
                        sx={{ ml: 'auto' }}
                      />
                    </Typography>

                    <Paper sx={{ p: 2 }}>
                      {(() => {
                        const effectiveAdjustments = getEffectiveAdjustments(result);
                        const effectiveMasks = getEffectiveMasks(effectiveAdjustments?.masks, maskOverrides);
                        const effective = { ...effectiveAdjustments, masks: effectiveMasks } as any;
                        return (
                          <RecipeAdjustmentsPanel
                            recipe={
                              {
                                id: processId || '',
                                name: processName || 'Unnamed Recipe',
                                prompt: processPrompt || '',
                                description: processDescription,
                                userOptions: processOptions,
                                results: successfulResults,
                                timestamp: new Date().toISOString(),
                                // expose overrides for panel sections
                                ...(maskOverrides ? { maskOverrides } : {}),
                              } as any
                            }
                            pendingModifications={pendingChatModifications}
                            aiAdjustments={effective}
                            showOnlyCurrent
                          />
                        );
                      })()}
                    </Paper>

                    {/* Intentionally hide AI Functions toggles in adjustments panel */}
                  </Box>
                )}

                {/* Tab Panel 3: Lightroom Export */}
                {activeTab === 2 && (
                  <Box>
                    <Typography variant="h5" sx={{ mb: 4, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ChatIcon color="primary" />
                      AI Chat
                    </Typography>
                    <Box sx={{ height: '600px' }}>
                      <RecipeChat
                        recipe={{
                          id: processId || '',
                          name: processName || 'Unnamed Recipe',
                          prompt: processPrompt || '',
                          description: processDescription,
                          userOptions: processOptions,
                          maskOverrides: maskOverrides,
                          aiAdjustmentOverrides: adjustmentOverrides,
                          results: successfulResults,
                          timestamp: new Date().toISOString(),
                        }}
                        isReprocessing={isReprocessing}
                        onRecipeModification={async modifications => {
                          if (!processId) return;
                          try {
                            const updates: any = {};
                            if (modifications.userOptions) {
                              const merged = { ...(processOptions || {}), ...modifications.userOptions } as any;
                              // merge nested aiFunctions if present
                              if ((processOptions as any)?.aiFunctions || (modifications.userOptions as any).aiFunctions) {
                                merged.aiFunctions = {
                                  ...(processOptions as any)?.aiFunctions,
                                  ...(modifications.userOptions as any).aiFunctions,
                                };
                              }
                              updates.userOptions = merged;
                              setProcessOptions(merged);
                            }
                            if ((modifications as any).aiAdjustments && typeof (modifications as any).aiAdjustments === 'object') {
                              const cur = adjustmentOverrides || {};
                              const merged = { ...cur, ...(modifications as any).aiAdjustments } as Record<string, number>;
                              updates.aiAdjustmentOverrides = merged;
                              setAdjustmentOverrides(merged);
                            }
                            if (typeof modifications.prompt === 'string' && modifications.prompt !== processPrompt) {
                              updates.prompt = modifications.prompt;
                              setProcessPrompt(modifications.prompt);
                            }
                            // Name changes are not accepted from AI chat
                            if (
                              typeof (modifications as any).description === 'string' &&
                              (modifications as any).description !== processDescription
                            ) {
                              updates.description = (modifications as any).description;
                              setProcessDescription((modifications as any).description);
                            }
                            // Apply mask overrides even when they are the only change (store operations)
                            if (Array.isArray((modifications as any).masks)) {
                              const ops = (modifications as any).masks as any[];
                              let next = Array.isArray(maskOverrides) ? [...maskOverrides] : [];
                              const idOf = (m: any) =>
                                m?.id ||
                                (m?.name
                                  ? `name:${m.name}`
                                  : `${m?.type || 'mask'}:${m?.subCategoryId ?? ''}:${(m?.referenceX ?? '').toString().slice(0, 4)}:${(
                                      m?.referenceY ?? ''
                                    )
                                      .toString()
                                      .slice(0, 4)}`);
                              const indexOf = (list: any[], m: any) => list.findIndex(x => idOf(x) === idOf(m));
                              for (const op of ops) {
                                const operation = op.op || 'add';
                                if (operation === 'remove_all' || operation === 'clear') {
                                  next = [];
                                  continue;
                                }
                                const idx = indexOf(next, op);
                                if (operation === 'remove') {
                                  if (idx >= 0) next.splice(idx, 1);
                                  continue;
                                }
                                if (operation === 'update') {
                                  if (idx >= 0) {
                                    const prev = next[idx] || {};
                                    next[idx] = {
                                      ...prev,
                                      ...op,
                                      id: prev.id || op.id,
                                      adjustments: { ...(prev.adjustments || {}), ...(op.adjustments || {}) },
                                    };
                                  } else {
                                    next.push({ ...op, id: op.id || idOf(op) });
                                  }
                                  continue;
                                }
                                // default add
                                if (idx >= 0) {
                                  const prev = next[idx] || {};
                                  next[idx] = {
                                    ...prev,
                                    ...op,
                                    id: prev.id || op.id || idOf(op),
                                    adjustments: { ...(prev.adjustments || {}), ...(op.adjustments || {}) },
                                  };
                                } else {
                                  next.push({ ...op, id: op.id || idOf(op) });
                                }
                              }
                              updates.maskOverrides = next;
                              setMaskOverrides(next);
                            }
                            if (Object.keys(updates).length > 0) {
                              await window.electronAPI.updateProcess(processId, updates);
                            }
                          } catch (e) {
                            console.error('[RESULTS] Failed to apply recipe modifications', e);
                          }
                        }}
                        onAcceptChanges={async () => {
                          // Accept: save changes only and generate XMP locally (no new AI call)
                          if (!processId) return;
                          try {
                            // Clear pending changes immediately for snappy UI
                            setPendingChatModifications(null);

                            const current = successfulResults[selectedResult];
                            const adjustments = getEffectiveAdjustments(current);
                            if (!adjustments) {
                              console.warn('[RESULTS] No adjustments available to generate XMP');
                              return;
                            }
                            const adjForExport = { ...adjustments } as any;
                            if (processName) adjForExport.preset_name = processName;
                            if (processDescription) adjForExport.description = processDescription;

                            const gen = await (window.electronAPI as any).generateXmpContent({
                              adjustments: adjForExport,
                              include: { strength: 1.0 },
                              recipeName: processName,
                            });
                            if (!gen?.success || !gen?.content) {
                              showError(`Failed to create XMP${gen?.error ? `: ${gen.error}` : ''}`);
                              return;
                            }

                            await window.electronAPI.updateProcess(processId, {
                              xmpPreset: gen.content,
                              xmpCreatedAt: new Date().toISOString(),
                              // Ensure status reflects completed state (no generating spinner)
                              status: 'completed',
                            } as any);
                          } catch (error) {
                            console.error('[RESULTS] Failed to create/store XMP:', error);
                            showError('Failed to apply and store XMP');
                          }
                        }}
                        onRejectChanges={() => {
                          // Clear pending modifications when rejecting changes
                          setPendingChatModifications(null);
                          // Handle rejecting changes
                          console.log('Changes rejected');
                        }}
                        onPendingModifications={(modifications) => {
                          setPendingChatModifications(modifications);
                        }}
                      />
                    </Box>
                  </Box>
                )}

                {activeTab === 3 && (
                  <Box>
                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
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
                          const availableFeatures = getAvailableFeatures(result.metadata?.aiAdjustments);
                          if (availableFeatures.length === 0) {
                            return (
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                                No specific features detected - basic adjustments will be included
                              </Typography>
                            );
                          }
                          return (
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {availableFeatures.map((feature, idx) => (
                                <Chip key={idx} size="small" label={feature} color="primary" variant="outlined" />
                              ))}
                            </Box>
                          );
                        })()}
                        {/* Export Strength and Button - 50/50 Layout */}
                        <Box sx={{ display: 'flex', gap: 3, mt: 3, alignItems: 'stretch' }}>
                          <Paper variant="outlined" sx={{ p: 3, flex: 1, backgroundColor: 'grey.50' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                              Export Strength
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Slider
                                value={Math.round((getOptions(index).strength ?? 1.0) * 100)}
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
                                {Math.round((getOptions(index).strength ?? 1.0) * 100)}%
                              </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              Tip: 100% applies the full AI adjustments. Lower values create softer effects.
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
                        <Typography variant="body2" sx={{ px: 2, color: 'text.secondary', fontWeight: 500 }}>
                          OR
                        </Typography>
                        <Divider sx={{ flex: 1 }} />
                      </Box>

                      <Paper elevation={1} sx={{ p: 4 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                          Camera Profile (.xmp)
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                          Create a new Camera Profile from your recipe adjustments for use in Lightroom.
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
                            Export Profile (.xmp)
                          </Button>
                        </Box>
                      </Paper>
                    </Box>
                  </Box>
                )}

                {/* Tab Panel 4: LUT Export */}
                {activeTab === 4 && (
                  <Box>
                    <Typography variant="h5" sx={{ mb: 4, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
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
                          Generate a 3D LUT file that captures the color transformations from this processing session.
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
                                  onClick={() => setLutFormat(format.value as 'cube' | '3dl' | 'lut')}
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
                              Tip: 100% applies the full AI adjustments. Lower values create more subtle effects.
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
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
                            What is a 3D LUT?
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                            A 3D Lookup Table captures the exact color transformations applied by the AI, allowing you to recreate this look
                            in other software.
                          </Typography>
                        </Box>

                        {/* Compatible software list removed — no longer necessary. */}

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
                            33³ LUTs offer the best balance of quality and file size for most applications.
                          </Typography>
                        </Box>
                      </Paper>
                    </Box>
                  </Box>
                )}

                {/* Tab Panel 6: Author */}
                {author && (author.firstName || author.lastName) && activeTab === 5 && (
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
                              {`${(author.firstName?.[0] || '').toUpperCase()}${(author.lastName?.[0] || '').toUpperCase()}`}
                            </Avatar>
                            {(author.firstName || author.lastName) && (
                              <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
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
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
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
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
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
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
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
