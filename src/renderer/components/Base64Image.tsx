import React from 'react';

interface Base64ImageProps {
  dataUrl?: string | null; // Must be a data URL like data:image/jpeg;base64,....
  alt?: string;
  style?: React.CSSProperties;
  className?: string;
}

const Base64Image: React.FC<Base64ImageProps> = ({ dataUrl, alt = '', style, className }) => {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return (
      <div
        className={className}
        style={{
          backgroundColor: '#f5f5f7',
          color: '#9ca3af',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          ...style,
        }}
      >
        No image
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={alt}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', ...style }}
      onError={() => {
        // Intentionally no fallback: render placeholder if data URL is invalid
      }}
    />
  );
};

export default Base64Image;

