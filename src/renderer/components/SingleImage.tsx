import { CircularProgress } from '@mui/material';
import React from 'react';
import NoImagePlaceholder from './NoImagePlaceholder';

const toImgSrc = (s?: string | null) => {
  if (!s) return '';
  if (s.startsWith('data:')) return s;
  if (s.startsWith('file://')) return s;
  if (s.startsWith('http')) return s;
  return `file://${s}`;
};

interface SingleImageProps {
  source?: string | null;
  alt?: string;
  fit?: 'cover' | 'contain';
  className?: string;
  style?: React.CSSProperties;
  showPlaceholder?: boolean;
  placeholderLabel?: string;
  placeholderIcon?: React.ReactNode;
  // Background enhancements using the same image
  backgroundBlur?: number; // px
  backgroundOpacity?: number; // 0..1
  // Generating state overlay
  isGenerating?: boolean;
}

const SingleImage: React.FC<SingleImageProps> = ({
  source,
  alt = '',
  fit = 'cover',
  className,
  style,
  showPlaceholder = true,
  placeholderLabel = 'No image',
  placeholderIcon,
  backgroundBlur = 8,
  backgroundOpacity = 0.35,
  isGenerating = false,
}) => {
  const src = toImgSrc(source || undefined);
  if (!src) {
    const baseDiv = showPlaceholder ? (
      <NoImagePlaceholder label={placeholderLabel} icon={placeholderIcon} style={{ width: '100%', height: '100%', ...style }} />
    ) : (
      <div className={className} style={{ width: '100%', height: '100%', ...style }} />
    );

    // If generating, wrap in container with overlay
    if (isGenerating) {
      return (
        <div
          className={className}
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            ...style,
          }}
        >
          {baseDiv}
          {/* Generating overlay for placeholder */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
              pointerEvents: 'none',
            }}
          >
            <CircularProgress
              size={48}
              sx={{
                color: 'white',
              }}
            />
          </div>
        </div>
      );
    }

    return baseDiv;
  }

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
    >
      {/* Blurred background using the same image */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: `blur(${backgroundBlur}px) saturate(1.03)`,
          transform: 'scale(1.04)',
          opacity: backgroundOpacity,
          pointerEvents: 'none',
        }}
      />
      {/* Soft vignette/fade to avoid hard edges */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 140% at 50% 50%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.28) 60%, rgba(255,255,255,0.45) 100%)',
          pointerEvents: 'none',
        }}
      />
      <img
        src={src}
        alt={alt}
        style={{
          display: 'block',
          maxWidth: '100%',
          maxHeight: '100%',
          width: fit === 'cover' ? '100%' : undefined,
          height: fit === 'cover' ? '100%' : undefined,
          objectFit: fit,
          objectPosition: 'center center',
          position: 'relative',
          zIndex: 1,
        }}
      />
      {/* Generating overlay */}
      {isGenerating && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          <CircularProgress
            size={48}
            sx={{
              color: 'white',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default SingleImage;
