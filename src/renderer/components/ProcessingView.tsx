import { Box, LinearProgress, Paper, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { ProcessingState } from '../../shared/types';

interface ProcessingViewProps {
  processingState: ProcessingState;
  baseImage: string | null;
  targetImages: string[];
  prompt?: string;
}

const ProcessingView: React.FC<ProcessingViewProps> = ({
  processingState,
  baseImage,
  targetImages,
  prompt,
}) => {
  const { status } = processingState;
  // Convert base image for display if unsupported
  const [baseDisplay, setBaseDisplay] = useState<string | null>(null);
  const [targetPreviews, setTargetPreviews] = useState<string[]>([]);
  const isSafeForImg = (p?: string | null) => {
    if (!p) return false;
    const ext = p.split('.').pop()?.toLowerCase();
    return !!ext && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
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

  // Generate previews for targets
  useEffect(() => {
    const gen = async () => {
      if (!targetImages || targetImages.length === 0) {
        setTargetPreviews([]);
        return;
      }
      try {
        const previews = await Promise.all(
          targetImages.map(async p => {
            try {
              const res = await window.electronAPI.generatePreview({ path: p });
              return res?.success ? res.previewPath : p;
            } catch {
              return p;
            }
          })
        );
        setTargetPreviews(previews);
      } catch {
        setTargetPreviews(targetImages);
      }
    };
    gen();
  }, [targetImages]);

  return (
    <div className="container" style={{ maxWidth: 900, margin: '0 auto' }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" sx={{ mb: 1 }}>
          ✨
        </Typography>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
          Processing Image
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {baseImage
            ? 'AI is analyzing your reference and generating color adjustments.'
            : 'AI is applying your prompt and generating color adjustments.'}
        </Typography>
        <Box sx={{ maxWidth: 400, mx: 'auto', width: '100%', mb: 1 }}>
          <LinearProgress variant="indeterminate" />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {status}
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <Box>
          <Paper sx={{ p: 2 }}>
            <Typography variant="overline" color="primary">
              {baseImage ? 'Reference Style' : 'Prompt'}
            </Typography>
            {baseImage ? (
              <Box
                sx={{
                  width: '100%',
                  height: 200,
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: '1px solid #e8eaff',
                  boxShadow: '0 2px 12px rgba(102,126,234,0.1)',
                }}
              >
                <img
                  src={(() => {
                    const src = baseDisplay || baseImage;
                    return src?.startsWith('file://') ? src : `file://${src}`;
                  })()}
                  alt="Base image"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
            ) : (
              <Box
                sx={{
                  width: '100%',
                  minHeight: 120,
                  borderRadius: 2,
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#ffffff',
                  p: 1.5,
                  fontSize: 14,
                  color: '#374151',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {prompt && prompt.trim().length > 0 ? prompt : 'No prompt provided'}
              </Box>
            )}
          </Paper>
        </Box>
        <Box>
          <Paper sx={{ p: 2 }}>
            <Typography variant="overline" color="secondary">
              Processing
            </Typography>
            {targetImages.length > 0 ? (
              <Box sx={{ width: '100%', maxHeight: 220, overflow: 'hidden' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1 }}>
                  {(() => {
                    const imgPath = targetImages[0];
                    const preview = targetPreviews[0] || imgPath;
                    return (
                      <Box
                        sx={{
                          position: 'relative',
                          height: 200,
                          borderRadius: 1.5,
                          overflow: 'hidden',
                          border: '1px solid #e5e7eb',
                        }}
                      >
                        <img
                          src={`file://${preview}`}
                          alt={`Target`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                      </Box>
                    );
                  })()}
                </Box>
              </Box>
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: 200,
                  borderRadius: 2,
                  border: '2px dashed #e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                }}
              >
                <Typography variant="body2" fontWeight={500}>
                  Waiting for target
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>

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
