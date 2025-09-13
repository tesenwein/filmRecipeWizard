import React, { useState, useEffect } from 'react';
import { ProcessingState } from '../../shared/types';
import { LinearProgress, Paper, Typography, Grid, Box } from '@mui/material';

interface ProcessingViewProps {
  processingState: ProcessingState;
  baseImage: string | null;
  targetImages: string[];
}

const ProcessingView: React.FC<ProcessingViewProps> = ({
  processingState,
  baseImage,
  targetImages
}) => {
  const { progress, status } = processingState;
  // Convert base image for display if unsupported
  const [baseDisplay, setBaseDisplay] = useState<string | null>(null);
  const isSafeForImg = (p?: string | null) => {
    if (!p) return false;
    const ext = p.split('.').pop()?.toLowerCase();
    return !!ext && ['jpg','jpeg','png','webp','gif'].includes(ext);
  };
  useEffect(() => {
    const run = async () => {
      if (baseImage && !isSafeForImg(baseImage)) {
        try {
          const res = await window.electronAPI.generatePreview({ path: baseImage });
          setBaseDisplay(res?.success ? res.previewPath : baseImage);
        } catch {
          setBaseDisplay(baseImage);
        }
      } else {
        setBaseDisplay(baseImage);
      }
    };
    run();
  }, [baseImage]);

  return (
    <div className="container" style={{ maxWidth: 900, margin: '0 auto' }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" sx={{ mb: 1 }}>✨</Typography>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>Processing Your Images</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          AI is analyzing your reference image and generating color adjustments for {targetImages.length} target image{targetImages.length !== 1 ? 's' : ''}
        </Typography>
        <Box sx={{ maxWidth: 400, mx: 'auto', width: '100%', mb: 1 }}>
          <LinearProgress variant="determinate" value={progress} />
        </Box>
        <Typography variant="body2" color="primary" fontWeight={600}>{Math.round(progress)}%</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{status}</Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="overline" color="primary">Reference Style</Typography>
            {baseImage && (
              <Box sx={{ width: '100%', height: 200, borderRadius: 2, overflow: 'hidden', border: '1px solid #e8eaff', boxShadow: '0 2px 12px rgba(102,126,234,0.1)' }}>
                <img src={(() => { const src = baseDisplay || baseImage; return src?.startsWith('file://') ? src : `file://${src}`; })()} alt="Base image" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Box>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>{baseImage?.split('/').pop()}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="overline" color="secondary">Processing {targetImages.length} Image{targetImages.length !== 1 ? 's' : ''}</Typography>
            <Box sx={{ width: '100%', height: 200, borderRadius: 2, border: '2px dashed #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)', color: '#999' }}>
              <Typography variant="h4" sx={{ mr: 1 }}>⚡</Typography>
              <Typography variant="body2" fontWeight={500}>Analyzing colors...</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>{targetImages.length} file{targetImages.length !== 1 ? 's' : ''} queued</Typography>
          </Paper>
        </Grid>
      </Grid>

      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.7;
            }
          }
        `}
      </style>
    </div>
  );
};

export default ProcessingView;
