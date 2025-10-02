import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { Box, IconButton, Tooltip } from '@mui/material';
import React from 'react';

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRatingChange,
  disabled = false,
  size = 'small',
  showTooltip = true,
}) => {
  const handleStarClick = (starRating: number) => {
    if (!disabled) {
      onRatingChange(starRating);
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'medium':
        return 20;
      case 'large':
        return 24;
      default:
        return 16;
    }
  };

  const iconSize = getIconSize();

  return (
    <Box display="flex" alignItems="center" gap={0.25}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= rating;
        const StarComponent = isFilled ? StarIcon : StarBorderIcon;
        
        return (
          <Tooltip
            key={star}
            title={showTooltip ? `${star} star${star > 1 ? 's' : ''}` : ''}
            placement="top"
            arrow
          >
            <IconButton
              size="small"
              onClick={() => handleStarClick(star)}
              disabled={disabled}
              sx={{
                padding: 0.25,
                color: isFilled ? '#ffc107' : '#e0e0e0',
                '&:hover': {
                  color: isFilled ? '#ffb300' : '#ffc107',
                  backgroundColor: 'transparent',
                },
                '&:disabled': {
                  color: isFilled ? '#ffc107' : '#e0e0e0',
                },
              }}
            >
              <StarComponent sx={{ fontSize: iconSize }} />
            </IconButton>
          </Tooltip>
        );
      })}
    </Box>
  );
};

export default StarRating;
