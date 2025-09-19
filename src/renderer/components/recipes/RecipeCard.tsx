import MoreVertIcon from '@mui/icons-material/MoreVert';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import { Button, Card, CardActionArea, CardContent, Checkbox, IconButton, Typography } from '@mui/material';
import React from 'react';
import { Recipe } from '../../../shared/types';
import SingleImage from '../SingleImage';

interface RecipeCardProps {
  recipe: Recipe;
  index: number;
  basePreview?: string;
  isGenerating: boolean;
  selectionMode: boolean;
  selected: boolean;
  onOpenRecipe: (recipe: Recipe) => void;
  onToggleSelect: (recipeId: string) => void;
  onOpenMenu: (e: React.MouseEvent<HTMLElement>, recipeId: string) => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  index,
  basePreview,
  isGenerating,
  selectionMode,
  selected,
  onOpenRecipe,
  onToggleSelect,
  onOpenMenu,
}) => {
  const formatDate = (timestamp: string) => new Date(timestamp).toLocaleString();

  return (
    <Card
      elevation={2}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s ease-in-out',
        ...(selectionMode && selected && {
          border: '1px solid',
          borderColor: 'primary.main',
          '&:hover': { transform: 'scale(1.02)' },
        }),
      }}
    >
      {selectionMode && (
        <Checkbox
          checked={selected}
          onChange={() => onToggleSelect(recipe.id)}
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 3,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 1,
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
          }}
        />
      )}
      {!selectionMode && (
        <IconButton
          aria-label="Options"
          size="small"
          onClick={(e) => onOpenMenu(e, recipe.id)}
          title="Options"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: 'none',
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.08)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            },
          }}
        >
          <MoreVertIcon fontSize="small" sx={{ color: '#666' }} />
        </IconButton>
      )}
      <CardActionArea
        onClick={() => {
          if (selectionMode) {
            onToggleSelect(recipe.id);
          } else if (!isGenerating) {
            onOpenRecipe(recipe);
          }
        }}
        sx={{ ...(isGenerating && { pointerEvents: 'none', opacity: 0.7 }), ...(selectionMode && { cursor: 'pointer' }) }}
      >
        <div style={{ height: 240, borderRadius: 2, overflow: 'hidden' }}>
          <SingleImage source={basePreview || undefined} alt={`Recipe ${index + 1}`} fit="contain" isGenerating={isGenerating} />
        </div>
        <CardContent sx={{ pb: 1 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ mb: 1 }}>
            {(recipe.name && recipe.name.trim().length > 0) ? recipe.name : 'Untitled Recipe'}
          </Typography>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {formatDate(recipe.timestamp)}
            </Typography>
            {(recipe as any)?.author && ((recipe as any).author.firstName || (recipe as any).author.lastName) && (
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 400 }}
              >
                <PersonOutlineOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                {[(recipe as any).author.firstName, (recipe as any).author.lastName].filter(Boolean).join(' ')}
              </Typography>
            )}
          </div>
        </CardContent>
      </CardActionArea>
      <CardContent sx={{ pt: 0 }}>
        <Button
          variant="outlined"
          fullWidth
          disabled={isGenerating || selectionMode}
          onClick={(e) => {
            e.stopPropagation();
            if (!selectionMode) onOpenRecipe(recipe);
          }}
        >
          {isGenerating ? 'Generating...' : 'Open'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default RecipeCard;
