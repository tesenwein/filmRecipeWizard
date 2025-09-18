import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
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
  const theme = useTheme();
  const aspectPadding = variant === 'square' ? '100%' : undefined;

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: aspectPadding ? undefined : height,
        paddingBottom: aspectPadding,
        background: theme.custom.gradients.placeholder,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme.custom.colors.placeholderText,
        boxShadow: 'none',
        ...style,
      }}
    >
      <Box sx={{ textAlign: 'center', padding: 1.5 }}>
        <Box sx={{ lineHeight: 1, marginBottom: 1 }}>
          {icon ?? (
            <ImageOutlinedIcon 
              sx={{ 
                fontSize: 28, 
                color: theme.custom.colors.placeholderText, 
                opacity: 0.9 
              }} 
            />
          )}
        </Box>
        <Typography 
          variant="body2" 
          sx={{ 
            fontSize: 13, 
            fontWeight: 600,
            color: theme.custom.colors.placeholderText
          }}
        >
          {label}
        </Typography>
      </Box>
    </Box>
  );
};

export default NoImagePlaceholder;
