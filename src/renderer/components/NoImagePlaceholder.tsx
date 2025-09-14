import React from 'react';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';

interface NoImagePlaceholderProps {
  label?: string;
  height?: number | string;
  variant?: 'landscape' | 'square';
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

const NoImagePlaceholder: React.FC<NoImagePlaceholderProps> = ({
  label = 'No image',
  height = 220,
  variant = 'landscape',
  icon,
  style,
}) => {
  const aspectPadding = variant === 'square' ? '100%' : undefined;
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: aspectPadding ? undefined : height,
    paddingBottom: aspectPadding,
    // Let the parent control rounding/borders; keep it clean here
    background:
      'radial-gradient(800px 400px at 80% -10%, rgba(102,126,234,0.10), transparent 60%), ' +
      'radial-gradient(600px 300px at -10% -20%, rgba(118,75,162,0.08), transparent 60%), ' +
      '#fafbff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#7c8aa0',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
    ...style,
  };

  return (
    <div style={containerStyle}>
      <div style={{ textAlign: 'center', padding: 12 }}>
        <div style={{ lineHeight: 1, marginBottom: 8 }}>
          {icon ?? <ImageOutlinedIcon style={{ fontSize: 28, color: '#7c8aa0', opacity: 0.9 }} />}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  );
};

export default NoImagePlaceholder;
