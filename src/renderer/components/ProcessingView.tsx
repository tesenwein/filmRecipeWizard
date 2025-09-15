import { Box, LinearProgress, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { ProcessingState } from '../../shared/types';
import NoImagePlaceholder from './NoImagePlaceholder';
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
    if (!targetPreviews.length || targetPreviews.length < 2) return;
    const intervalMs = 2800;
    const t = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % targetPreviews.length);
    }, intervalMs);
    return () => clearInterval(t);
  }, [targetPreviews.length]);

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

      {targetImages.length > 0 ? (
        // Prepare slides array for rendering/width calculations
        (() => {
          const slides = targetPreviews.length ? targetPreviews : targetImages;
          const slideCount = slides.length || 1;
          const trackWidth = `${slideCount * 100}%`;
          const offsetPct = `${(activeIdx * 100) / slideCount}%`;
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
          {/* Horizontal slider track */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              height: '100%',
              width: trackWidth,
              transform: `translateX(-${offsetPct})`,
              transition: 'transform 600ms ease',
            }}
          >
            {slides.map((src, i) => (
              <Box key={i} sx={{ minWidth: '100%', height: '100%' }}>
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

          {/* Horizontal shimmer overlay to match slide direction */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.24) 15%, transparent 30%)',
              transform: 'translateX(-100%)',
              animation: 'shine 2.8s linear infinite',
            }}
          />
        </Box>
          );
        })()
      ) : (
        <NoImagePlaceholder label="Waiting for target" height={420} />
      )}

      <style>
        {`
          @keyframes shine {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
    </div>
  );
};

export default ProcessingView;
