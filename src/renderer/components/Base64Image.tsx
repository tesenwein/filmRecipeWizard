import React from 'react';
import NoImagePlaceholder from './NoImagePlaceholder';

interface Base64ImageProps {
  dataUrl?: string | null; // Must be a data URL like data:image/jpeg;base64,....
  alt?: string;
  style?: React.CSSProperties;
  className?: string;
}

const Base64Image: React.FC<Base64ImageProps> = ({ dataUrl, alt = '', style, className }) => {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return <NoImagePlaceholder label="No image" height="100%" style={{ width: '100%', height: '100%', ...style }} />;
  }

  return (
    <img
      src={dataUrl}
      alt={alt}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center', ...style }}
      onError={() => {
        // Intentionally no fallback: render placeholder if data URL is invalid
      }}
    />
  );
};

export default Base64Image;
