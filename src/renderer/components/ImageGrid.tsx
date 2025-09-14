import React from 'react';
import SingleImage from './SingleImage';

interface ImageGridProps {
  sources: string[]; // file paths or data URLs
  columns?: number; // default responsive
  gap?: number; // px
  tileHeight?: number; // px height per tile
  style?: React.CSSProperties;
}


const ImageGrid: React.FC<ImageGridProps> = ({ sources, columns, gap = 6, tileHeight = 100, style }) => {
  const gridTemplateColumns = columns ? `repeat(${columns}, 1fr)` : 'repeat(auto-fit, minmax(100px, 1fr))';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns,
        gap,
        width: '100%',
        ...style,
      }}
    >
      {sources.map((s, i) => (
        <div
          key={`${s}-${i}`}
          style={{
            height: tileHeight,
            background:
              'radial-gradient(400px 200px at 80% -10%, rgba(102,126,234,0.08), transparent 60%), ' +
              'radial-gradient(300px 150px at -10% -20%, rgba(118,75,162,0.06), transparent 60%), ' +
              '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            border: 'none',
            borderRadius: 2,
          }}
        >
          <SingleImage source={s} alt={`thumb-${i}`} fit="contain" style={{ width: '100%', height: '100%' }} />
        </div>
      ))}
    </div>
  );
};

export default ImageGrid;
