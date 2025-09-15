import React from 'react';
import SingleImage from './SingleImage';

interface ImageGridProps {
  sources: string[]; // file paths or data URLs
  columns?: number; // default responsive
  gap?: number; // px
  tileHeight?: number; // px height per tile
  style?: React.CSSProperties;
  onRemove?: (index: number) => void;
  onClick?: (index: number) => void;
}

const ImageGrid: React.FC<ImageGridProps> = ({ sources, columns, gap = 6, tileHeight = 100, style, onRemove, onClick }) => {
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
            position: 'relative',
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
            cursor: onClick ? 'pointer' : 'default',
          }}
          onClick={() => onClick?.(i)}
        >
          <SingleImage source={s} alt={`thumb-${i}`} fit="contain" style={{ width: '100%', height: '100%' }} />
          {onRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(i); }}
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                zIndex: 2,
                border: '1px solid rgba(255,255,255,0.4)',
                background: 'rgba(255,255,255,0.6)',
                WebkitBackdropFilter: 'blur(10px)',
                backdropFilter: 'blur(10px)',
                color: '#111',
                borderRadius: 8,
                padding: '2px 6px',
                fontSize: 12,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
              title="Remove"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default ImageGrid;
