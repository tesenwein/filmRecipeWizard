import { Box, LinearProgress, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import Placeholder1 from '../../../assets/placeholder-1.svg';
import Placeholder2 from '../../../assets/placeholder-2.svg';
import Placeholder3 from '../../../assets/placeholder-3.svg';
import { ProcessingState } from '../../shared/types';
import SingleImage from './SingleImage';

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
}) => {
  const { status } = processingState;
  // Convert base image for display if unsupported
  const [, setBaseDisplay] = useState<string | null>(null);
  const [targetPreviews, setTargetPreviews] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
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
        setActiveIdx(0);
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
        setActiveIdx(0);
      } catch {
        setTargetPreviews(targetImages);
        setActiveIdx(0);
      }
    };
    gen();
  }, [targetImages]);

  // Auto-advance through targets during processing for a subtle slideshow effect
  useEffect(() => {
    const slides = targetImages.length > 0 ? targetPreviews : [1, 2, 3]; // Use placeholder slides when no targets
    if (!slides.length || slides.length < 2) return;
    const intervalMs = 3200;
    const t = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(t);
  }, [targetPreviews.length, targetImages.length]);

  return (
    <div className="container" style={{ maxWidth: 980, margin: '0 auto' }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
          Applying Recipe
        </Typography>
        <Box sx={{ maxWidth: 420, mx: 'auto', width: '100%', mb: 1 }}>
          <LinearProgress variant="indeterminate" />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {status}
        </Typography>
      </Box>

      {targetImages.length > 0
        ? (() => {
            const slides = targetPreviews.length ? targetPreviews : targetImages;
            const intervalMs = 3200;
            return (
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: { xs: 320, sm: 420, md: 520 },
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: 'none',
                  boxShadow: 'none',
                  background:
                    'radial-gradient(400px 200px at 80% -10%, rgba(102,126,234,0.08), transparent 60%), ' +
                    'radial-gradient(300px 150px at -10% -20%, rgba(118,75,162,0.06), transparent 60%), ' +
                    '#f8fafc',
                }}
              >
                {/* Crossfade stack */}
                <Box sx={{ position: 'absolute', inset: 0 }}>
                  {slides.map((src, i) => (
                    <Box
                      key={i}
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        opacity: i === activeIdx ? 1 : 0,
                        transform: i === activeIdx ? 'scale(1.01)' : 'scale(1.00)',
                        transition: 'opacity 900ms ease-in-out, transform 900ms ease',
                      }}
                    >
                      <SingleImage
                        source={src}
                        alt={`Processing ${i + 1}`}
                        fit="contain"
                        backgroundBlur={0}
                        backgroundOpacity={0}
                      />
                    </Box>
                  ))}
                </Box>

                {/* Vertical shimmer overlay synced with fade interval */}
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    background:
                      'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.22) 14%, transparent 28%)',
                    transform: 'translateY(-100%)',
                    animationName: 'vshine',
                    animationDuration: `${intervalMs}ms`,
                    animationTimingFunction: 'linear',
                    animationIterationCount: 'infinite',
                  }}
                />
              </Box>
            );
          })()
        : (() => {
            // Create placeholder animation when no target images
            const placeholderSlides = [Placeholder1, Placeholder2, Placeholder3];
            const intervalMs = 3200;
            return (
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: { xs: 320, sm: 420, md: 520 },
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: 'none',
                  boxShadow: 'none',
                  background:
                    'radial-gradient(400px 200px at 80% -10%, rgba(102,126,234,0.08), transparent 60%), ' +
                    'radial-gradient(300px 150px at -10% -20%, rgba(118,75,162,0.06), transparent 60%), ' +
                    '#f8fafc',
                }}
              >
                {/* Crossfade stack for placeholder images */}
                <Box sx={{ position: 'absolute', inset: 0 }}>
                  {placeholderSlides.map((src, i) => (
                    <Box
                      key={i}
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        opacity: i === activeIdx ? 1 : 0,
                        transform: i === activeIdx ? 'scale(1.01)' : 'scale(1.00)',
                        transition: 'opacity 900ms ease-in-out, transform 900ms ease',
                      }}
                    >
                      <SingleImage
                        source={src}
                        alt={`Processing placeholder ${i + 1}`}
                        fit="contain"
                        backgroundBlur={0}
                        backgroundOpacity={0}
                      />
                    </Box>
                  ))}
                </Box>

                {/* Vertical shimmer overlay synced with fade interval */}
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    background:
                      'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.22) 14%, transparent 28%)',
                    transform: 'translateY(-100%)',
                    animationName: 'vshine',
                    animationDuration: `${intervalMs}ms`,
                    animationTimingFunction: 'linear',
                    animationIterationCount: 'infinite',
                  }}
                />
              </Box>
            );
          })()}

      <style>
        {`
          @keyframes vshine {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
          }
        `}
      </style>
    </div>
  );
};

export default ProcessingView;
