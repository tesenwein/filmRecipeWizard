import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import SettingsIcon from '@mui/icons-material/Settings';
import TuneIcon from '@mui/icons-material/Tune';
import PhotoFilterIcon from '@mui/icons-material/PhotoFilter';
import PaletteIcon from '@mui/icons-material/Palette';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Tooltip,
  Typography,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Grid,
  Paper,
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { ProcessingResult } from '../../shared/types';
import Base64Image from './Base64Image';

interface ResultsViewProps {
  results: ProcessingResult[];
  baseImage: string | null;
  targetImages: string[];
  onReset: () => void;
  onRestart?: () => void;
  onNewProcessingSession?: () => void;
  processId?: string; // Optional process ID to load base64 image data
  prompt?: string; // Optional prompt provided in this session
}

const ResultsView: React.FC<ResultsViewProps> = ({
  results,
  baseImage: _baseImage,
  targetImages: _targetImages,
  onReset,
  onRestart,
  onNewProcessingSession,
  processId,
  prompt,
}) => {
  // Base64 image data URLs for display
  const [baseImageDataUrl, setBaseImageDataUrl] = useState<string | null>(null);
  const [targetImageDataUrls, setTargetImageDataUrls] = useState<string[]>([]);
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
      }
    >
  >({});

  const successfulResults = results.filter(result => result.success);
  const failedResults = results.filter(result => !result.success);
  const [confirmNewGeneration, setConfirmNewGeneration] = useState(false);
  const [processPrompt, setProcessPrompt] = useState<string | undefined>(undefined);
  const [processOptions, setProcessOptions] = useState<any | undefined>(undefined);

  // New state for tab management
  const [activeTab, setActiveTab] = useState(0);
  const [selectedResult, setSelectedResult] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  useEffect(() => {
    console.log('[RESULTS] Render with results', {
      count: results.length,
      success: successfulResults.length,
      failed: failedResults.length,
      processId,
    });
  }, [results, successfulResults.length, failedResults.length, processId]);

  // Load base64 image data when processId is provided
  useEffect(() => {
    const loadBase64Images = async () => {
      if (!processId) {
        // Clear base64 data when no processId
        setBaseImageDataUrl(null);
        setTargetImageDataUrls([]);
        setProcessPrompt(prompt);
        return;
      }

      try {
        const [imgResponse, processResponse] = await Promise.all([
          window.electronAPI.getImageDataUrls(processId),
          window.electronAPI.getProcess(processId),
        ]);
        if (imgResponse.success) {
          setBaseImageDataUrl(imgResponse.baseImageUrl || null);
          setTargetImageDataUrls(imgResponse.targetImageUrls || []);
          console.log('[RESULTS] Loaded base64 images for process', processId);
        } else {
          throw new Error(imgResponse.error || 'Failed to load image data URLs');
        }
        if (processResponse.success && processResponse.process) {
          setProcessPrompt(processResponse.process.prompt);
          setProcessOptions(processResponse.process.userOptions);
        } else {
          setProcessPrompt(prompt);
        }
      } catch (error) {
        console.error('[RESULTS] Error loading base64 images:', error);
        setBaseImageDataUrl(null);
        setTargetImageDataUrls([]);
        setProcessPrompt(prompt);
        setProcessOptions(undefined);
      }
    };

    loadBase64Images();
  }, [processId, prompt]);

  const handleAttachBaseImage = async () => {
    try {
      if (!processId) return;
      const files = await window.electronAPI.selectFiles({
        title: 'Select Base Image (Reference Style)',
        filters: [
          {
            name: 'Images',
            extensions: ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'dng', 'cr2', 'nef', 'arw'],
          },
        ],
        properties: ['openFile'],
      });
      if (files && files[0]) {
        const res = await window.electronAPI.setBaseImage(processId, files[0]);
        if (res.success) {
          const data = await window.electronAPI.getImageDataUrls(processId);
          if (data.success) {
            setBaseImageDataUrl(data.baseImageUrl || null);
          }
        } else {
          alert(res.error || 'Failed to set base image');
        }
      }
    } catch (e) {
      console.error('Failed to attach base image:', e);
    }
  };

  // Derive successful target URLs to keep alignment with displayed cards
  const successfulTargetUrls = useMemo(() => {
    const pairs = results.map((r, i) => ({ ok: r.success, url: targetImageDataUrls[i] }));
    return pairs.filter(p => p.ok).map(p => p.url);
  }, [results, targetImageDataUrls]);

  const defaultOptions = {
    wbBasic: true,
    exposure: false,
    hsl: true,
    colorGrading: true,
    curves: true,
    sharpenNoise: true,
    vignette: true,
    // Enable Point Color by default in export options
    pointColor: true,
    // Film Grain optional export (default ON)
    grain: true,
    // Masks (local adjustments) optional export (default OFF)
    masks: false,
  } as const;

  const getOptions = (index: number) => exportOptions[index] || defaultOptions;
  const toggleOption = (index: number, key: keyof ReturnType<typeof getOptions>) => {
    setExportOptions(prev => ({
      ...prev,
      [index]: {
        ...(prev[index] || defaultOptions),
        [key]: !(prev[index]?.[key] ?? (defaultOptions as any)[key]),
      },
    }));
  };

  const allKeys = [
    'exposure',
    'wbBasic',
    'hsl',
    'colorGrading',
    'curves',
    'sharpenNoise',
    'vignette',
    'pointColor',
    'grain',
    'masks',
  ] as const;

  const isAllSelected = (index: number) => {
    const opts = getOptions(index) as any;
    return allKeys.every(k => !!opts[k]);
  };

  const setAllOptions = (index: number, value: boolean) => {
    setExportOptions(prev => ({
      ...prev,
      [index]: allKeys.reduce((acc, k) => ({ ...acc, [k]: value }), {
        ...(prev[index] || defaultOptions),
      }) as any,
    }));
  };

  const handleExportXMP = async (index: number, result: ProcessingResult) => {
    const adjustments = result.metadata?.aiAdjustments;
    if (!adjustments) return;
    try {
      const res = await window.electronAPI.downloadXMP({
        adjustments,
        include: getOptions(index),
      });
      if (!res.success) {
        alert(`Export failed: ${res.error}`);
      }
    } catch (e) {
      console.error('Export error:', e);
      alert('Export failed.');
    }
  };

  return (
    <Box sx={{ maxWidth: '100%', margin: '0 auto' }}>
      {/* Header */}
      <Paper className="card" sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#222', mb: 1 }}>
          Processing Complete
        </Typography>
        {results.length > 1 ? (
          <Typography variant="body1" sx={{ color: '#555', mb: 2 }}>
            {successfulResults.length} of {results.length} images processed successfully
          </Typography>
        ) : results.length === 1 ? (
          <Typography variant="body1" sx={{ color: '#555', mb: 2 }}>
            {successfulResults.length === 1 ? 'Image processed successfully' : 'Processing failed'}
          </Typography>
        ) : null}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          {onNewProcessingSession ? (
            <Button variant="contained" onClick={() => setConfirmNewGeneration(true)}>
              New Processing Session
            </Button>
          ) : (
            <Button variant="contained" onClick={onReset}>
              New Processing Session
            </Button>
          )}
        </Box>
      </Paper>

      {/* No Results Message */}
      {results.length === 0 && (
        <Paper className="card" sx={{ textAlign: 'center', py: 8 }}>
          <Box sx={{ fontSize: '64px', mb: 3, opacity: 0.5 }}>📭</Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#666', mb: 2 }}>
            No Results Available
          </Typography>
          <Typography variant="body1" sx={{ color: '#999', mb: 4 }}>
            This project doesn't have any processing results yet, or they failed to load.
          </Typography>
          <Button variant="contained" onClick={onReset}>
            🔄 Start New Process
          </Button>
        </Paper>
      )}

      {/* Main Content with Tabs */}
      {successfulResults.length > 0 && (
        <Paper className="card" sx={{ p: 0, overflow: 'hidden' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              px: 3,
              pt: 2,
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 }
            }}
          >
            <Tab
              icon={<CompareArrowsIcon />}
              label="Image Comparison"
              iconPosition="start"
            />
            <Tab
              icon={<TuneIcon />}
              label="Adjustments Details"
              iconPosition="start"
            />
            <Tab
              icon={<DownloadIcon />}
              label="Export Options"
              iconPosition="start"
            />
          </Tabs>

          {/* Image Selection */}
          {successfulResults.length > 1 && (
            <Box sx={{ p: 3, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Select Image:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {successfulResults.map((result, index) => {
                  const aiName = result?.metadata?.aiAdjustments &&
                    (result.metadata.aiAdjustments as any).preset_name;
                  const name = typeof aiName === 'string' && aiName.trim().length > 0
                    ? aiName
                    : `Image ${index + 1}`;
                  return (
                    <Chip
                      key={index}
                      label={name}
                      onClick={() => setSelectedResult(index)}
                      color={selectedResult === index ? 'primary' : 'default'}
                      variant={selectedResult === index ? 'filled' : 'outlined'}
                      sx={{ cursor: 'pointer' }}
                    />
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Tab Content */}
          <Box sx={{ p: 3 }}>
            {successfulResults.map((result, index) => (
              <Box
                key={index}
                sx={{
                  display: selectedResult === index ? 'block' : 'none'
                }}
              >
                {/* Tab Panel 1: Image Comparison */}
                {activeTab === 0 && (
                  <Box>
                    <Typography variant="h5" sx={{ mb: 4, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CompareArrowsIcon color="primary" />
                      Before & After Comparison
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                      <Box sx={{ flex: 1 }}>
                        <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                          <Typography variant="h6" sx={{
                            display: 'block',
                            mb: 2,
                            fontWeight: 600,
                            color: 'text.secondary'
                          }}>
                            Reference Style
                          </Typography>
                          <Box sx={{
                            width: '100%',
                            height: 450,
                            borderRadius: 2,
                            overflow: 'hidden',
                            position: 'relative',
                            backgroundColor: 'grey.100'
                          }}>
                            <Base64Image dataUrl={baseImageDataUrl || undefined} alt="Reference" />
                            {!baseImageDataUrl && processId && (
                              <Tooltip title="Add reference image">
                                <IconButton
                                  size="large"
                                  onClick={handleAttachBaseImage}
                                  className="no-drag"
                                  sx={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    backgroundColor: 'rgba(255,255,255,0.95)',
                                    backdropFilter: 'blur(10px)',
                                    '&:hover': { backgroundColor: 'rgba(255,255,255,1)' },
                                    boxShadow: 3
                                  }}
                                >
                                  <AddPhotoAlternateOutlinedIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </Paper>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                          <Typography variant="h6" sx={{
                            display: 'block',
                            mb: 2,
                            fontWeight: 600,
                            color: 'primary.main'
                          }}>
                            Processed Result
                          </Typography>
                          <Box sx={{
                            width: '100%',
                            height: 450,
                            borderRadius: 2,
                            overflow: 'hidden',
                            position: 'relative',
                            backgroundColor: 'grey.100'
                          }}>
                            {(() => {
                              const targetUrl = successfulTargetUrls[index];
                              return targetUrl ? (
                                <Base64Image dataUrl={targetUrl} alt={`Processed image ${index + 1}`} />
                              ) : (
                                <Box sx={{
                                  width: '100%',
                                  height: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'text.secondary'
                                }}>
                                  <Typography>No image available</Typography>
                                </Box>
                              );
                            })()}
                          </Box>
                        </Paper>
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

                    {/* Processing Context */}
                    {(processPrompt || processOptions) && (
                      <Accordion sx={{ mb: 2 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SettingsIcon color="action" />
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
                                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                                    <Typography variant="body1"><strong>Vibe:</strong> {processOptions.vibe || '—'}</Typography>
                                    <Typography variant="body1"><strong>Warmth:</strong> {processOptions.warmth ?? '—'}</Typography>
                                    <Typography variant="body1"><strong>Tint:</strong> {processOptions.tint ?? '—'}</Typography>
                                    <Typography variant="body1"><strong>Contrast:</strong> {processOptions.contrast ?? '—'}</Typography>
                                    <Typography variant="body1"><strong>Vibrance:</strong> {processOptions.vibrance ?? '—'}</Typography>
                                    <Typography variant="body1"><strong>Moodiness:</strong> {processOptions.moodiness ?? '—'}</Typography>
                                    <Typography variant="body1"><strong>Saturation Bias:</strong> {processOptions.saturationBias ?? '—'}</Typography>
                                    <Typography variant="body1"><strong>Film Grain:</strong> {processOptions.filmGrain ? 'On' : 'Off'}</Typography>
                                    {processOptions.artistStyle?.name && (
                                      <Typography variant="body1"><strong>Artist Style:</strong> {processOptions.artistStyle.name}</Typography>
                                    )}
                                    {processOptions.filmStyle?.name && (
                                      <Typography variant="body1"><strong>Film Stock:</strong> {processOptions.filmStyle.name}</Typography>
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
                    <Accordion defaultExpanded sx={{ mb: 2 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PhotoFilterIcon color="action" />
                          Basic Adjustments
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                              White Balance
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body1">Temperature</Typography>
                                <Chip label={`${Math.round(result.metadata.aiAdjustments.temperature || 0)} K`} variant="outlined" />
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body1">Tint</Typography>
                                <Chip label={Math.round(result.metadata.aiAdjustments.tint || 0)} variant="outlined" />
                              </Box>
                            </Box>
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                              Exposure
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body1">Exposure</Typography>
                                <Chip label={(result.metadata.aiAdjustments.exposure || 0).toFixed(2)} variant="outlined" />
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body1">Contrast</Typography>
                                <Chip label={result.metadata.aiAdjustments.contrast ?? 0} variant="outlined" />
                              </Box>
                            </Box>
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                              Tone
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body1">Highlights</Typography>
                                <Chip label={result.metadata.aiAdjustments.highlights ?? 0} variant="outlined" />
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body1">Shadows</Typography>
                                <Chip label={result.metadata.aiAdjustments.shadows ?? 0} variant="outlined" />
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body1">Whites</Typography>
                                <Chip label={result.metadata.aiAdjustments.whites ?? 0} variant="outlined" />
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body1">Blacks</Typography>
                                <Chip label={result.metadata.aiAdjustments.blacks ?? 0} variant="outlined" />
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                      </AccordionDetails>
                    </Accordion>

                    {/* Presence & Color */}
                    <Accordion sx={{ mb: 2 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          Presence & Color
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
                          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body1">Clarity</Typography>
                            <Chip label={result.metadata.aiAdjustments.clarity ?? 0} variant="outlined" />
                          </Box>
                          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body1">Vibrance</Typography>
                            <Chip label={result.metadata.aiAdjustments.vibrance ?? 0} variant="outlined" />
                          </Box>
                          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body1">Saturation</Typography>
                            <Chip label={result.metadata.aiAdjustments.saturation ?? 0} variant="outlined" />
                          </Box>
                        </Box>
                      </AccordionDetails>
                    </Accordion>

                    {/* HSL Adjustments */}
                    <Accordion sx={{ mb: 2 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PaletteIcon color="action" />
                          HSL Color Adjustments
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                          {['Hue', 'Saturation', 'Luminance'].map((adjustmentType) => (
                            <Box key={adjustmentType} sx={{ flex: 1 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                                {adjustmentType}
                              </Typography>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'].map(color => {
                                  const key = `${adjustmentType.toLowerCase().slice(0, 3)}_${color}`;
                                  const value = (result.metadata!.aiAdjustments as any)[key] ?? 0;
                                  return (
                                    <Box key={color} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
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
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              AI Analysis Notes
                            </Typography>
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
                  </Box>
                )}

                {/* Tab Panel 3: Export Options */}
                {activeTab === 2 && (
                  <Box>
                    <Typography variant="h5" sx={{ mb: 4, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DownloadIcon color="primary" />
                      Export Options
                    </Typography>

                    <Paper elevation={1} sx={{ p: 4, background: 'linear-gradient(135deg, #fafbfc 0%, #f8f9fa 100%)' }}>
                      <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                        XMP Sidecar Export
                      </Typography>

                      <Box sx={{ mb: 3 }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={isAllSelected(index)}
                              onChange={e => setAllOptions(index, e.target.checked)}
                            />
                          }
                          label={<Typography variant="body1" sx={{ fontWeight: 600 }}>Select All Adjustment Types</Typography>}
                        />
                      </Box>

                      <Grid container spacing={2}>
                        {[
                          { key: 'exposure', label: 'Exposure', description: 'Basic exposure adjustments' },
                          { key: 'wbBasic', label: 'Basic Adjustments', description: 'White balance, contrast, highlights, shadows' },
                          { key: 'hsl', label: 'HSL Adjustments', description: 'Hue, saturation, and luminance per color' },
                          { key: 'colorGrading', label: 'Color Grading', description: 'Shadow, midtone, highlight color wheels' },
                          { key: 'curves', label: 'Tone Curves', description: 'RGB and luminance curve adjustments' },
                          { key: 'pointColor', label: 'Point Color', description: 'Targeted color adjustments' },
                          { key: 'sharpenNoise', label: 'Sharpen & Noise', description: 'Detail enhancement settings' },
                          { key: 'vignette', label: 'Vignette', description: 'Edge darkening effects' },
                          { key: 'grain', label: 'Film Grain', description: 'Analog film texture simulation' },
                          { key: 'masks', label: 'Masks (Local Adjustments)', description: 'Area-specific modifications' },
                        ].map(opt => (
                          <Grid item xs={12} sm={6} key={opt.key}>
                            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={
                                      getOptions(index)[
                                        opt.key as keyof ReturnType<typeof getOptions>
                                      ] as any
                                    }
                                    onChange={() => toggleOption(index, opt.key as any)}
                                  />
                                }
                                label={
                                  <Box>
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                      {opt.label}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                      {opt.description}
                                    </Typography>
                                  </Box>
                                }
                              />
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>

                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                        <Button
                          variant="contained"
                          size="large"
                          startIcon={<DownloadIcon />}
                          onClick={() => handleExportXMP(index, result)}
                          sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 4,
                            py: 1.5,
                          }}
                        >
                          Export XMP Sidecar
                        </Button>
                      </Box>
                    </Paper>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Failed Results */}
      {failedResults.length > 0 && (
        <Paper className="card" sx={{ mt: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#d73027', mb: 3 }}>
            Failed Processing ({failedResults.length} image{failedResults.length !== 1 ? 's' : ''})
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {failedResults.map((result, index) => (
              <Paper
                key={index}
                variant="outlined"
                sx={{
                  background: '#fff8f8',
                  p: 3,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                  <Box sx={{ fontSize: '28px', lineHeight: 1 }}>❌</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 600, color: '#d32f2f', mb: 0.5 }}>
                      Processing Failed
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                      Image {results.indexOf(result) + 1} of {results.length}
                    </Typography>

                    <Paper sx={{
                      p: 2,
                      mb: 2,
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      color: '#d32f2f',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '200px',
                      overflow: 'auto',
                      backgroundColor: '#ffffff'
                    }}>
                      {result.error || 'Unknown error occurred'}
                    </Paper>

                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      {onRestart && (
                        <Button variant="contained" color="primary" onClick={onRestart} sx={{ textTransform: 'none' }}>
                          Try Again
                        </Button>
                      )}
                      <Button variant="outlined" onClick={onReset} sx={{ textTransform: 'none' }}>
                        Start Over
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        </Paper>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmNewGeneration} onClose={() => setConfirmNewGeneration(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            Generate New Analysis?
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            This will create a new AI analysis using the same images but generate fresh results. The current analysis will be preserved as a separate version.
          </Typography>
          <Paper sx={{ backgroundColor: '#f8f9fa', p: 2, mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              ✨ What happens next:
            </Typography>
            <Typography variant="body2" component="div">
              • New AI analysis will be generated
              <br />
              • Fresh color adjustments and recommendations
              <br />
              • Results saved as a new project version
              <br />• Previous analysis remains accessible
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setConfirmNewGeneration(false)} variant="outlined" sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setConfirmNewGeneration(false);
              onNewProcessingSession?.();
            }}
            variant="contained"
            sx={{ textTransform: 'none' }}
          >
            Generate New Analysis
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ResultsView;