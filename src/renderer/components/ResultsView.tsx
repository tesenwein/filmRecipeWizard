import DownloadIcon from '@mui/icons-material/Download';
import {
  Box,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormGroup,
  Typography,
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
  targetImages,
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
        } else {
          setProcessPrompt(prompt);
        }
      } catch (error) {
        console.error('[RESULTS] Error loading base64 images:', error);
        setBaseImageDataUrl(null);
        setTargetImageDataUrls([]);
        setProcessPrompt(prompt);
      }
    };

    loadBase64Images();
  }, [processId, prompt]);

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

  // Single-image flow: no bulk apply needed

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

  // No preview generation effects

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#222', marginBottom: '6px' }}>
          Processing complete
        </h2>
        {results.length > 1 ? (
          <p style={{ fontSize: '14px', color: '#555', marginBottom: '16px' }}>
            {successfulResults.length} of {results.length} images processed successfully
          </p>
        ) : results.length === 1 ? (
          <p style={{ fontSize: '14px', color: '#555', marginBottom: '16px' }}>
            {successfulResults.length === 1 ? 'Image processed successfully' : 'Processing failed'}
          </p>
        ) : null}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {onNewProcessingSession ? (
            <button className="button" onClick={() => setConfirmNewGeneration(true)}>
              New processing session
            </button>
          ) : (
            <button className="button" onClick={onReset}>
              New processing session
            </button>
          )}
        </div>
      </div>

      {/* No Results Message */}
      {results.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px', opacity: 0.5 }}>📭</div>
          <h3
            style={{ fontSize: '24px', fontWeight: '600', color: '#666666', marginBottom: '16px' }}
          >
            No Results Available
          </h3>
          <p style={{ fontSize: '16px', color: '#999999', marginBottom: '30px' }}>
            This project doesn't have any processing results yet, or they failed to load.
          </p>
          <button className="button" onClick={onReset}>
            🔄 Start New Process
          </button>
        </div>
      )}

      {/* Successful Results */}
      {successfulResults.length > 0 && (
        <div>
          <h3
            style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#333333',
              marginBottom: '20px',
            }}
          >
            Successfully Processed Images
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {successfulResults.map((result, index) => (
              <div
                key={index}
                className="card slide-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Image Previews: Base vs Result */}
                <div
                  className="grid"
                  style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#888',
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                      }}
                    >
                      Base
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '380px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '3px solid #f0f0f0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                    >
                      <Base64Image dataUrl={baseImageDataUrl || undefined} alt="Base" />
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#888',
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                      }}
                    >
                      Original
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '380px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '3px solid #f0f0f0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        position: 'relative',
                      }}
                    >
                      {(() => {
                        const targetUrl = successfulTargetUrls[index];
                        return targetUrl ? (
                          <Base64Image dataUrl={targetUrl} alt={`Processed image ${index + 1}`} />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: '#f5f5f5',
                              color: '#999',
                              fontSize: '14px',
                            }}
                          >
                            No image available
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Filename */}
                <h4
                  style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#333333',
                    marginBottom: '8px',
                    wordBreak: 'break-word',
                  }}
                >
                  {(() => {
                    const aiName =
                      result?.metadata?.aiAdjustments &&
                      (result.metadata.aiAdjustments as any).preset_name;
                    const fallback = result.outputPath?.split('/').pop() || `Image ${index + 1}`;
                    return typeof aiName === 'string' && aiName.trim().length > 0
                      ? aiName
                      : fallback;
                  })()}
                </h4>

                {/* Project Details and Export (inline) */}
                {result.metadata?.aiAdjustments && (
                  <div
                    className="grid"
                    style={{ gridTemplateColumns: '1fr', gap: '12px', marginTop: '8px' }}
                  >
                    <div
                      style={{
                        background: '#f8f9ff',
                        border: '1px solid #e8eaff',
                        borderRadius: '8px',
                        padding: '12px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '8px',
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>🤖</span>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#667eea' }}>
                          AI Analysis
                        </span>
                        <span
                          style={{
                            background: '#667eea',
                            color: 'white',
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            fontWeight: '600',
                          }}
                        >
                          {Math.round((result.metadata.aiAdjustments.confidence || 0) * 100)}%
                        </span>
                      </div>

                      {/* Prompt, if available */}
                      {(processPrompt && processPrompt.trim().length > 0) && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#444' }}>
                            Prompt
                          </Typography>
                          <Box
                            sx={{
                              mt: 0.5,
                              fontSize: 12,
                              color: '#374151',
                              background: '#ffffff',
                              border: '1px solid #e5e7eb',
                              borderRadius: 1,
                              p: 1.25,
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {processPrompt}
                          </Box>
                        </>
                      )}

                      {/* Basic adjustments in 2 columns */}
                      <Box
                        sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1 }}
                      >
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 700, color: '#666', display: 'block', mb: 0.5 }}
                          >
                            Basic
                          </Typography>
                          <Box sx={{ display: 'grid', gap: 0.5, fontSize: '12px' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Temperature</span>
                              <strong>
                                {Math.round(result.metadata.aiAdjustments.temperature || 0)} K
                              </strong>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Tint</span>
                              <strong>{Math.round(result.metadata.aiAdjustments.tint || 0)}</strong>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Exposure</span>
                              <strong>
                                {(result.metadata.aiAdjustments.exposure || 0).toFixed(2)}
                              </strong>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Contrast</span>
                              <strong>{result.metadata.aiAdjustments.contrast ?? 0}</strong>
                            </Box>
                          </Box>
                        </Box>
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 700, color: '#666', display: 'block', mb: 0.5 }}
                          >
                            Tone
                          </Typography>
                          <Box sx={{ display: 'grid', gap: 0.5, fontSize: '12px' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Highlights</span>
                              <strong>{result.metadata.aiAdjustments.highlights ?? 0}</strong>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Shadows</span>
                              <strong>{result.metadata.aiAdjustments.shadows ?? 0}</strong>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Whites</span>
                              <strong>{result.metadata.aiAdjustments.whites ?? 0}</strong>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Blacks</span>
                              <strong>{result.metadata.aiAdjustments.blacks ?? 0}</strong>
                            </Box>
                          </Box>
                        </Box>
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 700, color: '#666', display: 'block', mb: 0.5 }}
                          >
                            Presence
                          </Typography>
                          <Box sx={{ display: 'grid', gap: 0.5, fontSize: '12px' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Clarity</span>
                              <strong>{result.metadata.aiAdjustments.clarity ?? 0}</strong>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Vibrance</span>
                              <strong>{result.metadata.aiAdjustments.vibrance ?? 0}</strong>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Saturation</span>
                              <strong>{result.metadata.aiAdjustments.saturation ?? 0}</strong>
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      {/* HSL Adjustments in compact grid */}
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#444' }}>
                        HSL Adjustments
                      </Typography>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: 1,
                          mt: 0.5,
                          fontSize: '11px',
                        }}
                      >
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 600, color: '#888', display: 'block', mb: 0.5 }}
                          >
                            Hue
                          </Typography>
                          {(
                            [
                              'red',
                              'orange',
                              'yellow',
                              'green',
                              'aqua',
                              'blue',
                              'purple',
                              'magenta',
                            ] as const
                          ).map(k => (
                            <Box
                              key={`hue_${k}`}
                              sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}
                            >
                              <span style={{ color: '#666' }}>
                                {k[0].toUpperCase()}
                                {k.slice(1, 3)}
                              </span>
                              <strong>
                                {(result.metadata!.aiAdjustments as any)[`hue_${k}`] ?? 0}
                              </strong>
                            </Box>
                          ))}
                        </Box>
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 600, color: '#888', display: 'block', mb: 0.5 }}
                          >
                            Saturation
                          </Typography>
                          {(
                            [
                              'red',
                              'orange',
                              'yellow',
                              'green',
                              'aqua',
                              'blue',
                              'purple',
                              'magenta',
                            ] as const
                          ).map(k => (
                            <Box
                              key={`sat_${k}`}
                              sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}
                            >
                              <span style={{ color: '#666' }}>
                                {k[0].toUpperCase()}
                                {k.slice(1, 3)}
                              </span>
                              <strong>
                                {(result.metadata!.aiAdjustments as any)[`sat_${k}`] ?? 0}
                              </strong>
                            </Box>
                          ))}
                        </Box>
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 600, color: '#888', display: 'block', mb: 0.5 }}
                          >
                            Luminance
                          </Typography>
                          {(
                            [
                              'red',
                              'orange',
                              'yellow',
                              'green',
                              'aqua',
                              'blue',
                              'purple',
                              'magenta',
                            ] as const
                          ).map(k => (
                            <Box
                              key={`lum_${k}`}
                              sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}
                            >
                              <span style={{ color: '#666' }}>
                                {k[0].toUpperCase()}
                                {k.slice(1, 3)}
                              </span>
                              <strong>
                                {(result.metadata!.aiAdjustments as any)[`lum_${k}`] ?? 0}
                              </strong>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#444' }}>
                        Color Grading
                      </Typography>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 1,
                          mt: 0.5,
                          fontSize: '11px',
                        }}
                      >
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                            <span style={{ color: '#666' }}>Shadows</span>
                            <strong>
                              H{(result.metadata.aiAdjustments as any).color_grade_shadow_hue ?? 0}°
                              S{(result.metadata.aiAdjustments as any).color_grade_shadow_sat ?? 0}{' '}
                              L{(result.metadata.aiAdjustments as any).color_grade_shadow_lum ?? 0}
                            </strong>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                            <span style={{ color: '#666' }}>Midtones</span>
                            <strong>
                              H{(result.metadata.aiAdjustments as any).color_grade_midtone_hue ?? 0}
                              ° S
                              {(result.metadata.aiAdjustments as any).color_grade_midtone_sat ?? 0}{' '}
                              L{(result.metadata.aiAdjustments as any).color_grade_midtone_lum ?? 0}
                            </strong>
                          </Box>
                        </Box>
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                            <span style={{ color: '#666' }}>Highlights</span>
                            <strong>
                              H
                              {(result.metadata.aiAdjustments as any).color_grade_highlight_hue ??
                                0}
                              ° S
                              {(result.metadata.aiAdjustments as any).color_grade_highlight_sat ??
                                0}{' '}
                              L
                              {(result.metadata.aiAdjustments as any).color_grade_highlight_lum ??
                                0}
                            </strong>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                            <span style={{ color: '#666' }}>Global</span>
                            <strong>
                              H{(result.metadata.aiAdjustments as any).color_grade_global_hue ?? 0}°
                              S{(result.metadata.aiAdjustments as any).color_grade_global_sat ?? 0}{' '}
                              L{(result.metadata.aiAdjustments as any).color_grade_global_lum ?? 0}
                            </strong>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                            <span style={{ color: '#666' }}>Blending</span>
                            <strong>
                              {(result.metadata.aiAdjustments as any).color_grade_blending ?? 50}
                            </strong>
                          </Box>
                        </Box>
                      </Box>
                      {typeof result.metadata.aiAdjustments.reasoning === 'string' &&
                        result.metadata.aiAdjustments.reasoning.trim().length > 0 && (
                          <>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#444' }}>
                              AI Notes
                            </Typography>
                            <Box
                              sx={{
                                mt: 0.5,
                                fontSize: 12,
                                color: '#374151',
                                background: '#ffffff',
                                border: '1px solid #e5e7eb',
                                borderRadius: 1,
                                p: 1.25,
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              {result.metadata.aiAdjustments.reasoning}
                            </Box>
                          </>
                        )}
                    </div>

                    {/* Export options */}
                    <Card
                      variant="outlined"
                      sx={{
                        background: 'linear-gradient(135deg, #fafbfc 0%, #f8f9fa 100%)',
                        border: '1px solid #e9ecef',
                        borderRadius: 2,
                        p: 2,
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                        Export Settings
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          mb: 1,
                        }}
                      >
                        <FormControlLabel
                          control={
                            <Checkbox
                              size="small"
                              checked={isAllSelected(index)}
                              onChange={e => setAllOptions(index, e.target.checked)}
                              sx={{ py: 0.5 }}
                            />
                          }
                          label={<Typography variant="body2">All types & groups</Typography>}
                        />
                      </Box>
                      <FormGroup
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: 0.5,
                        }}
                      >
                        {(
                          [
                            { key: 'exposure', label: 'Exposure' },
                            { key: 'wbBasic', label: 'Basic Adjustments' },
                            { key: 'hsl', label: 'HSL Adjustments' },
                            { key: 'colorGrading', label: 'Color Grading' },
                            { key: 'curves', label: 'Tone Curves' },
                            { key: 'pointColor', label: 'Point Color' },
                            { key: 'sharpenNoise', label: 'Sharpen & Noise' },
                            { key: 'vignette', label: 'Vignette' },
                            { key: 'grain', label: 'Film Grain' },
                          ] as const
                        ).map(opt => (
                          <FormControlLabel
                            key={opt.key}
                            control={
                              <Checkbox
                                size="small"
                                checked={
                                  getOptions(index)[
                                    opt.key as keyof ReturnType<typeof getOptions>
                                  ] as any
                                }
                                onChange={() => toggleOption(index, opt.key as any)}
                                sx={{ py: 0.5 }}
                              />
                            }
                            label={<Typography variant="body2">{opt.label}</Typography>}
                          />
                        ))}
                      </FormGroup>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                        <Button
                          variant="contained"
                          startIcon={<DownloadIcon />}
                          onClick={() => handleExportXMP(index, result)}
                          sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 3,
                            py: 1.25,
                          }}
                        >
                          Export XMP
                        </Button>
                      </Box>
                    </Card>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Failed Results */}
      {failedResults.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h3
            style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#d73027',
              marginBottom: '20px',
            }}
          >
            Failed Processing ({failedResults.length} image{failedResults.length !== 1 ? 's' : ''})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {failedResults.map((result, index) => (
              <Card
                key={index}
                variant="outlined"
                sx={{
                  border: '2px solid #ffcdd2',
                  background: '#fff8f8',
                  p: 3,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                  <Box sx={{ fontSize: '28px', lineHeight: 1 }}>❌</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontSize: '18px',
                        fontWeight: 600,
                        color: '#d32f2f',
                        mb: 0.5,
                      }}
                    >
                      Processing Failed
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                      Image {results.indexOf(result) + 1} of {results.length}
                    </Typography>

                    <Box
                      sx={{
                        background: '#ffffff',
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                        p: 2,
                        mb: 2,
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        color: '#d32f2f',
                        whiteSpace: 'pre-wrap',
                        maxHeight: '200px',
                        overflow: 'auto',
                      }}
                    >
                      {result.error || 'Unknown error occurred'}
                    </Box>

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
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Dialog for New Generation */}
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
          <Box
            sx={{
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: 1,
              p: 2,
              mb: 1,
            }}
          >
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
          </Box>
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

      {/* No modal; export is inline per result */}
    </div>
  );
};

export default ResultsView;
