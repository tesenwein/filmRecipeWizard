import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PaletteIcon from '@mui/icons-material/Palette';
import PhotoFilterIcon from '@mui/icons-material/PhotoFilter';
import SettingsIcon from '@mui/icons-material/Settings';
import TuneIcon from '@mui/icons-material/Tune';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
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

  // LUT export state
  const [lutSize, setLutSize] = useState<'17' | '33' | '65'>('33');
  const [lutFormat, setLutFormat] = useState<'cube' | '3dl' | 'lut'>('cube');

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
        title: 'Select Recipe Image (Style Reference)',
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

  const handleExportLUT = async (result: ProcessingResult) => {
    const adjustments = result.metadata?.aiAdjustments;
    if (!adjustments) return;

    try {
      const res = await (window.electronAPI as any).generateLUT({
        adjustments,
        size: parseInt(lutSize),
        format: lutFormat,
      });
      if (!res.success) {
        alert(`LUT export failed: ${res.error}`);
      }
    } catch (e) {
      console.error('LUT export error:', e);
      alert('LUT export failed.');
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
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
            }}
          >
            <Tab icon={<CompareArrowsIcon />} label="Overview" iconPosition="start" />
            <Tab icon={<TuneIcon />} label="Adjustments Details" iconPosition="start" />
            <Tab icon={<DownloadIcon />} label="Lightroom Export" iconPosition="start" />
            <Tab icon={<PaletteIcon />} label="LUT Export" iconPosition="start" />
          </Tabs>

          {/* Image Selection */}
          {successfulResults.length > 1 && (
            <Box sx={{ p: 3, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Select Image:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {successfulResults.map((result, index) => {
                  const aiName =
                    result?.metadata?.aiAdjustments &&
                    (result.metadata.aiAdjustments as any).preset_name;
                  let name: string;
                  if (typeof aiName === 'string' && aiName.trim().length > 0) {
                    const extras: string[] = [];
                    const artist = (processOptions as any)?.artistStyle?.name as string | undefined;
                    const film = (processOptions as any)?.filmStyle?.name as string | undefined;
                    if (artist && artist.trim().length > 0) extras.push(artist.trim());
                    if (film && film.trim().length > 0) extras.push(film.trim());
                    name = extras.length > 0 ? `${aiName} — ${extras.join(' · ')}` : aiName;
                  } else {
                    name = `Image ${index + 1}`;
                  }
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
                        gap: 3,
                        gridTemplateColumns: {
                          xs: '1fr',
                          md: baseImageDataUrl ? '1fr 1fr' : '1fr',
                        },
                      }}
                    >
                      {/* Basic Information */}
                      <Paper elevation={1} sx={{ p: 3 }}>
                        <Typography
                          variant="h6"
                          sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}
                        >
                          Processing Information
                        </Typography>

                        {/* AI Analysis */}
                        {result.metadata?.aiAdjustments?.reasoning && (
                          <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                              AI Analysis
                            </Typography>
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

                        {/* Processing Stats */}
                        <Box
                          sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}
                        >
                          <Box>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              Confidence
                            </Typography>
                            <Typography
                              variant="h6"
                              sx={{ fontWeight: 600, color: 'primary.main' }}
                            >
                              {Math.round((result.metadata?.aiAdjustments?.confidence || 0) * 100)}%
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              Preset Name
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {(result.metadata?.aiAdjustments &&
                                (result.metadata.aiAdjustments as any).preset_name) ||
                                'Custom'}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Style Information */}
                        {processOptions &&
                          (processOptions.artistStyle || processOptions.filmStyle) && (
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

                        {/* Fine-tune Settings */}
                        {processOptions &&
                         (processOptions.warmth !== undefined ||
                          processOptions.tint !== undefined ||
                          processOptions.contrast !== undefined ||
                          processOptions.vibrance !== undefined ||
                          processOptions.moodiness !== undefined ||
                          processOptions.saturationBias !== undefined ||
                          processOptions.filmGrain !== undefined) && (
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                              Fine-tune Settings
                            </Typography>
                            <Box
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                gap: 2,
                              }}
                            >
                              {[
                                {
                                  key: 'warmth',
                                  label: 'Warmth',
                                  value: processOptions.warmth,
                                  icon: '🌡️',
                                },
                                {
                                  key: 'tint',
                                  label: 'Tint',
                                  value: processOptions.tint,
                                  icon: '🎨',
                                },
                                {
                                  key: 'contrast',
                                  label: 'Contrast',
                                  value: processOptions.contrast,
                                  icon: '⚡',
                                },
                                {
                                  key: 'vibrance',
                                  label: 'Vibrance',
                                  value: processOptions.vibrance,
                                  icon: '🌈',
                                },
                                {
                                  key: 'moodiness',
                                  label: 'Moodiness',
                                  value: processOptions.moodiness,
                                  icon: '🎭',
                                },
                                {
                                  key: 'saturationBias',
                                  label: 'Saturation Bias',
                                  value: processOptions.saturationBias,
                                  icon: '🎪',
                                },
                              ].map(
                                setting =>
                                  setting.value !== undefined && (
                                    <Paper
                                      key={setting.key}
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
                                        <Typography variant="body2" sx={{ fontSize: '16px' }}>
                                          {setting.icon}
                                        </Typography>
                                        <Typography
                                          variant="body2"
                                          sx={{ color: 'text.secondary', fontWeight: 600 }}
                                        >
                                          {setting.label}
                                        </Typography>
                                      </Box>
                                      <Typography
                                        variant="h6"
                                        sx={{
                                          fontWeight: 700,
                                          color: 'primary.main',
                                          fontSize: '18px',
                                        }}
                                      >
                                        {setting.key === 'tint'
                                          ? (setting.value + 50)
                                          : setting.key === 'warmth'
                                          ? ((setting.value ?? 50) - 50)
                                          : setting.value}
                                      </Typography>
                                    </Paper>
                                  )
                              )}
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
                                    <Typography variant="body2" sx={{ fontSize: '16px' }}>
                                      🎞️
                                    </Typography>
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
                            </Box>
                          </Box>
                        )}
                      </Paper>

                      {/* Recipe Image */}
                      {baseImageDataUrl ? (
                        <Paper elevation={1} sx={{ p: 3 }}>
                          <Typography
                            variant="h6"
                            sx={{
                              mb: 2,
                              fontWeight: 600,
                              color: 'primary.main',
                              textAlign: 'center',
                            }}
                          >
                            Recipe Image
                          </Typography>
                          <Box
                            sx={{
                              width: '100%',
                              height: 300,
                              borderRadius: 2,
                              overflow: 'hidden',
                              position: 'relative',
                              backgroundColor: 'grey.100',
                            }}
                          >
                            <Base64Image dataUrl={baseImageDataUrl} alt="Recipe" />
                          </Box>
                        </Paper>
                      ) : (
                        <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
                          {processId && (
                            <Button
                              variant="contained"
                              size="small"
                              onClick={handleAttachBaseImage}
                              startIcon={<AddPhotoAlternateOutlinedIcon />}
                            >
                              Add Recipe Image
                            </Button>
                          )}
                        </Paper>
                      )}
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
                      <Accordion sx={{ mb: 2 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
                          >
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
                    <Accordion defaultExpanded sx={{ mb: 2 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <PhotoFilterIcon color="action" />
                          Basic Adjustments
                        </Typography>
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
                    <Accordion sx={{ mb: 2 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          Presence & Color
                        </Typography>
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
                    <Accordion sx={{ mb: 2 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          HSL Color Adjustments
                        </Typography>
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

                {/* Tab Panel 3: Lightroom Export */}
                {activeTab === 2 && (
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{ mb: 4, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
                    >
                      <DownloadIcon color="primary" />
                      Lightroom Export
                    </Typography>

                    <Paper
                      elevation={1}
                      sx={{ p: 4, background: 'linear-gradient(135deg, #fafbfc 0%, #f8f9fa 100%)' }}
                    >
                      <Box sx={{ mb: 3 }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={isAllSelected(index)}
                              onChange={e => setAllOptions(index, e.target.checked)}
                            />
                          }
                          label={
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              Select All Adjustment Types
                            </Typography>
                          }
                        />
                      </Box>

                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                          gap: 2,
                        }}
                      >
                        {[
                          {
                            key: 'exposure',
                            label: 'Exposure',
                            description: 'Basic exposure adjustments',
                          },
                          {
                            key: 'wbBasic',
                            label: 'Basic Adjustments',
                            description: 'White balance, contrast, highlights, shadows',
                          },
                          {
                            key: 'hsl',
                            label: 'HSL Adjustments',
                            description: 'Hue, saturation, and luminance per color',
                          },
                          {
                            key: 'colorGrading',
                            label: 'Color Grading',
                            description: 'Shadow, midtone, highlight color wheels',
                          },
                          {
                            key: 'curves',
                            label: 'Tone Curves',
                            description: 'RGB and luminance curve adjustments',
                          },
                          {
                            key: 'pointColor',
                            label: 'Point Color',
                            description: 'Targeted color adjustments',
                          },
                          {
                            key: 'sharpenNoise',
                            label: 'Sharpen & Noise',
                            description: 'Detail enhancement settings',
                          },
                          {
                            key: 'vignette',
                            label: 'Vignette',
                            description: 'Edge darkening effects',
                          },
                          {
                            key: 'grain',
                            label: 'Film Grain',
                            description: 'Analog film texture simulation',
                          },
                          {
                            key: 'masks',
                            label: 'Masks (Local Adjustments)',
                            description: 'Area-specific modifications',
                          },
                        ].map(opt => (
                          <Paper key={opt.key} variant="outlined" sx={{ p: 2 }}>
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
                        ))}
                      </Box>

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
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            💡 Pro Tip
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
                    <Typography
                      variant="h6"
                      sx={{ fontSize: '18px', fontWeight: 600, color: '#d32f2f', mb: 0.5 }}
                    >
                      Processing Failed
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                      Image {results.indexOf(result) + 1} of {results.length}
                    </Typography>

                    <Paper
                      sx={{
                        p: 2,
                        mb: 2,
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        color: '#d32f2f',
                        whiteSpace: 'pre-wrap',
                        maxHeight: '200px',
                        overflow: 'auto',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      {result.error || 'Unknown error occurred'}
                    </Paper>

                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      {onRestart && (
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={onRestart}
                          sx={{ textTransform: 'none' }}
                        >
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
      <Dialog
        open={confirmNewGeneration}
        onClose={() => setConfirmNewGeneration(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            Generate New Analysis?
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            This will create a new AI analysis using the same images but generate fresh results. The
            current analysis will be preserved as a separate version.
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
          <Button
            onClick={() => setConfirmNewGeneration(false)}
            variant="outlined"
            sx={{ textTransform: 'none' }}
          >
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
