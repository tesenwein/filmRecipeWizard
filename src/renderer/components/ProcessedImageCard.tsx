import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  FormGroup,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import React from 'react';
import { ProcessingResult } from '../../shared/types';
import SingleImage from './SingleImage';

interface ProcessedImageCardProps {
  result: ProcessingResult;
  index: number;
  baseImageDataUrl?: string | null;
  targetImageDataUrl?: string;
  processPrompt?: string;
  processOptions?: any;
  processId?: string;
  exportOptions: Record<string, any>;
  onAttachBaseImage: () => void;
  onExportXMP: (index: number, result: ProcessingResult) => void;
  onToggleOption: (index: number, key: string) => void;
  onSetAllOptions: (index: number, value: boolean) => void;
  isAllSelected: (index: number) => boolean;
}

const ProcessedImageCard: React.FC<ProcessedImageCardProps> = ({
  result,
  index,
  baseImageDataUrl,
  targetImageDataUrl,
  processPrompt,
  processOptions,
  processId,
  exportOptions,
  onAttachBaseImage,
  onExportXMP,
  onToggleOption,
  onSetAllOptions,
  isAllSelected,
}) => {
  const getOptions = () =>
    exportOptions || {
      wbBasic: true,
      exposure: false,
      hsl: true,
      colorGrading: true,
      curves: true,
      sharpenNoise: true,
      vignette: true,
      pointColor: true,
      grain: true,
      masks: false,
    };

  return (
    <Paper
      className="card slide-in"
      elevation={0}
      sx={{
        borderRadius: 2,
        p: 2.5,
        animationDelay: `${index * 0.1}s`,
      }}
    >
      {/* Image Previews: Base vs Result */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2.5,
          mb: 2.5,
        }}
      >
        <Box>
          <Typography
            variant="caption"
            sx={{
              fontSize: 11,
              color: '#5f6b74',
              mb: 0.75,
              textTransform: 'uppercase',
              fontWeight: 600,
              display: 'block',
            }}
          >
            Base Reference
          </Typography>
          <Box
            sx={{
              width: '100%',
              height: 380,
              borderRadius: 2,
              overflow: 'hidden',
              border: 'none',
              position: 'relative',
            }}
          >
            <SingleImage source={baseImageDataUrl || undefined} alt="Base" fit="contain" />
            {!baseImageDataUrl && processId && (
              <Tooltip title="Add base image">
                <IconButton
                  size="small"
                  onClick={onAttachBaseImage}
                  className="no-drag"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 2,
                    backgroundColor: 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.9)' },
                  }}
                  aria-label="Add base image"
                >
                  <AddPhotoAlternateOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
        <Box>
          <Typography
            variant="caption"
            sx={{
              fontSize: 11,
              color: '#5f6b74',
              mb: 0.75,
              textTransform: 'uppercase',
              fontWeight: 600,
              display: 'block',
            }}
          >
            Processed Result
          </Typography>
          <Box
            sx={{
              width: '100%',
              height: 380,
              borderRadius: 2,
              overflow: 'hidden',
              border: 'none',
              position: 'relative',
            }}
          >
            {targetImageDataUrl ? (
              <SingleImage
                source={targetImageDataUrl}
                alt={`Processed image ${index + 1}`}
                fit="contain"
              />
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f8f9ff',
                  color: '#5f6b74',
                  fontSize: 14,
                }}
              >
                No image available
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Filename */}
      <Typography
        variant="h6"
        sx={{
          fontSize: 18,
          fontWeight: 600,
          color: '#2c3338',
          mb: 1,
          wordBreak: 'break-word',
        }}
      >
        {(() => {
          const aiName =
            result?.metadata?.aiAdjustments && (result.metadata.aiAdjustments as any).preset_name;
          const fallback = result.outputPath?.split('/').pop() || `Image ${index + 1}`;
          return typeof aiName === 'string' && aiName.trim().length > 0 ? aiName : fallback;
        })()}
      </Typography>

      {/* Project Details and Export (inline) */}
      {result.metadata?.aiAdjustments && (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2.5 }}>
          <Paper
            elevation={0}
            sx={{
              background: '#f8f9ff',
              borderRadius: 2,
              p: 2.5,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 1,
              }}
            >
              <Box sx={{ fontSize: 16 }}>🤖</Box>
              <Typography
                variant="body2"
                sx={{ fontSize: 14, fontWeight: 600, color: 'primary.main' }}
              >
                Analysis
              </Typography>
              <Box
                sx={{
                  background: 'primary.main',
                  color: 'white',
                  fontSize: 11,
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 2,
                  fontWeight: 600,
                }}
              >
                {Math.round((result.metadata.aiAdjustments.confidence || 0) * 100)}%
              </Box>
            </Box>

            {/* Prompt, if available */}
            {processPrompt && processPrompt.trim().length > 0 && (
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
                    borderRadius: 2,
                    p: 1.25,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {processPrompt}
                </Box>
              </>
            )}

            {/* User Options, if available */}
            {processOptions && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#444' }}>
                  Your Settings
                </Typography>
                <Box
                  sx={{
                    mt: 0.5,
                    fontSize: 12,
                    color: '#374151',
                    background: '#ffffff',
                    borderRadius: 2,
                    p: 1.25,
                  }}
                >
                  <div>Vibe: {processOptions.vibe || '—'}</div>
                  <div>Warmth: {processOptions.warmth ?? '—'}</div>
                  <div>Tint: {processOptions.tint ?? '—'}</div>
                  <div>Contrast: {processOptions.contrast ?? '—'}</div>
                  <div>Vibrance: {processOptions.vibrance ?? '—'}</div>
                  <div>Moodiness: {processOptions.moodiness ?? '—'}</div>
                  <div>Saturation Bias: {processOptions.saturationBias ?? '—'}</div>
                  <div>Film Grain: {processOptions.filmGrain ? 'On' : 'Off'}</div>
                </Box>
              </>
            )}

            {/* Basic adjustments in 2 columns */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1 }}>
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
                    <strong>{Math.round(result.metadata.aiAdjustments.temperature || 0)} K</strong>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tint</span>
                    <strong>{Math.round(result.metadata.aiAdjustments.tint || 0)}</strong>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Exposure</span>
                    <strong>{(result.metadata.aiAdjustments.exposure || 0).toFixed(2)}</strong>
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
                  ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'] as const
                ).map(k => (
                  <Box
                    key={`hue_${k}`}
                    sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}
                  >
                    <span style={{ color: '#666' }}>
                      {k[0].toUpperCase()}
                      {k.slice(1, 3)}
                    </span>
                    <strong>{(result.metadata!.aiAdjustments as any)[`hue_${k}`] ?? 0}</strong>
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
                  ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'] as const
                ).map(k => (
                  <Box
                    key={`sat_${k}`}
                    sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}
                  >
                    <span style={{ color: '#666' }}>
                      {k[0].toUpperCase()}
                      {k.slice(1, 3)}
                    </span>
                    <strong>{(result.metadata!.aiAdjustments as any)[`sat_${k}`] ?? 0}</strong>
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
                  ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'] as const
                ).map(k => (
                  <Box
                    key={`lum_${k}`}
                    sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}
                  >
                    <span style={{ color: '#666' }}>
                      {k[0].toUpperCase()}
                      {k.slice(1, 3)}
                    </span>
                    <strong>{(result.metadata!.aiAdjustments as any)[`lum_${k}`] ?? 0}</strong>
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
                    H{(result.metadata.aiAdjustments as any).color_grade_shadow_hue ?? 0}° S
                    {(result.metadata.aiAdjustments as any).color_grade_shadow_sat ?? 0} L
                    {(result.metadata.aiAdjustments as any).color_grade_shadow_lum ?? 0}
                  </strong>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <span style={{ color: '#666' }}>Midtones</span>
                  <strong>
                    H{(result.metadata.aiAdjustments as any).color_grade_midtone_hue ?? 0}° S
                    {(result.metadata.aiAdjustments as any).color_grade_midtone_sat ?? 0} L
                    {(result.metadata.aiAdjustments as any).color_grade_midtone_lum ?? 0}
                  </strong>
                </Box>
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <span style={{ color: '#666' }}>Highlights</span>
                  <strong>
                    H{(result.metadata.aiAdjustments as any).color_grade_highlight_hue ?? 0}° S
                    {(result.metadata.aiAdjustments as any).color_grade_highlight_sat ?? 0} L
                    {(result.metadata.aiAdjustments as any).color_grade_highlight_lum ?? 0}
                  </strong>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <span style={{ color: '#666' }}>Global</span>
                  <strong>
                    H{(result.metadata.aiAdjustments as any).color_grade_global_hue ?? 0}° S
                    {(result.metadata.aiAdjustments as any).color_grade_global_sat ?? 0} L
                    {(result.metadata.aiAdjustments as any).color_grade_global_lum ?? 0}
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
                      borderRadius: 2,
                      p: 1.25,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {result.metadata.aiAdjustments.reasoning}
                  </Box>
                </>
              )}
          </Paper>

          {/* Export options */}
          <Paper
            elevation={0}
            sx={{
              background: 'linear-gradient(135deg, #fafbfc 0%, #f8f9fa 100%)',
              borderRadius: 2,
              p: 2.5,
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
                    onChange={e => onSetAllOptions(index, e.target.checked)}
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
                  { key: 'masks', label: 'Masks (Local Adjustments)' },
                ] as const
              ).map(opt => (
                <FormControlLabel
                  key={opt.key}
                  control={
                    <Checkbox
                      size="small"
                      checked={getOptions()[opt.key as keyof ReturnType<typeof getOptions>] as any}
                      onChange={() => onToggleOption(index, opt.key as any)}
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
                onClick={() => onExportXMP(index, result)}
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
          </Paper>
        </Box>
      )}
    </Paper>
  );
};

export default ProcessedImageCard;
