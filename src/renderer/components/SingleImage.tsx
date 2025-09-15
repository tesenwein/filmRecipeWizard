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
  backgroundOpacity = 0.22,
}) => {
  const src = toImgSrc(source || undefined);
  if (!src) {
    return showPlaceholder ? (
      <NoImagePlaceholder label={placeholderLabel} icon={placeholderIcon} style={{ width: '100%', height: '100%', ...style }} />
    ) : (
      <div className={className} style={{ width: '100%', height: '100%', ...style }} />
    );
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
    </div>
  );
};

export default SingleImage;
