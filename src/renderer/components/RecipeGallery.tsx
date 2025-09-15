import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  Button,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Recipe } from '../../shared/types';
import { useAlert } from '../context/AlertContext';
import { useAppStore } from '../store/appStore';
import SingleImage from './SingleImage';

interface RecipeGalleryProps {
  onOpenRecipe: (recipe: Recipe) => void;
  onNewProcess: () => void;
}

const RecipeGallery: React.FC<RecipeGalleryProps> = ({ onOpenRecipe, onNewProcess }) => {
  const {
    recipes,
    recipesLoading,
    generatingRecipes,
    loadRecipes,
    deleteRecipe,
    importRecipes,
    exportRecipe,
    exportAllRecipes
  } = useAppStore();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const { showSuccess, showError } = useAlert();

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const basePreviews = recipes.map((recipe: Recipe) =>
    recipe?.recipeImageData &&
    typeof recipe.recipeImageData === 'string' &&
    recipe.recipeImageData.length > 0
      ? `data:image/jpeg;base64,${recipe.recipeImageData}`
      : ''
  );

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, recipeId: string) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedRecipeId(recipeId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRecipeId(null);
  };

  const handleDeleteRecipe = async () => {
    if (!selectedRecipeId) return;
    handleMenuClose();
    if (confirm('Are you sure you want to delete this recipe?')) {
      try {
        await deleteRecipe(selectedRecipeId);
      } catch (error) {
        console.error('Failed to delete recipe:', error);
        showError('Failed to delete recipe');
      }
    }
  };

  const handleExportRecipe = async () => {
    if (!selectedRecipeId) return;
    handleMenuClose();
    try {
      const res = await exportRecipe(selectedRecipeId);
      if (!res.success && res.error && res.error !== 'Export canceled') {
        showError(`Export failed: ${res.error}`);
      }
    } catch {
      showError('Export failed');
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (recipesLoading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '60px' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚡</div>
        <h2>Loading Recipes...</h2>
      </div>
    );
  }

  return (
    <div className="container">
      <Grid container alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Grid>
          <Typography variant="h5" fontWeight={700}>
            Your Recipes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Past color matching sessions
          </Typography>
        </Grid>
        <Grid style={{ display: 'flex', gap: 8 }}>
          <Button
            variant="outlined"
            onClick={async () => {
              try {
                const res = await importRecipes();
                if (res.success && res.count && res.count > 1) {
                  showSuccess(`Successfully imported ${res.count} recipes`);
                }
              } catch {
                showError('Import failed');
              }
            }}
          >
            Import Recipe
          </Button>
          <Button
            variant="outlined"
            onClick={async () => {
              try {
                const res = await exportAllRecipes();
                if (res.success && res.count) {
                  showSuccess(`Successfully exported ${res.count} recipes`);
                }
              } catch {
                showError('Export failed');
              }
            }}
            disabled={recipes.length === 0 || generatingRecipes.size > 0}
          >
            Export All
          </Button>
          <Button variant="contained" onClick={onNewProcess}>
            New Recipe
          </Button>
        </Grid>
      </Grid>

      {recipes.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h3" sx={{ opacity: 0.5, mb: 2 }}>
            📥
          </Typography>
          <Typography variant="h6" sx={{ mb: 1 }}>
            No recipes yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first color recipe to get started
          </Typography>
          <Button variant="contained" onClick={onNewProcess}>
            Create First Recipe
          </Button>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {recipes.map((recipe, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={recipe.id}>
              <Card elevation={2} sx={{ position: 'relative', overflow: 'hidden' }}>
                {/* Menu button (top-right) */}
                <IconButton
                  aria-label="Options"
                  size="small"
                  onClick={e => handleMenuOpen(e, recipe.id)}
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
                <CardActionArea
                  onClick={() => {
                    if (!generatingRecipes.has(recipe.id)) {
                      onOpenRecipe(recipe);
                    }
                  }}
                  sx={{
                    ...(generatingRecipes.has(recipe.id) && {
                      pointerEvents: 'none',
                      opacity: 0.7,
                    }),
                  }}
                >
                  <div style={{ height: 240, borderRadius: 2, overflow: 'hidden' }}>
                    <SingleImage
                      source={basePreviews[index] || undefined}
                      alt={`Recipe ${index + 1}`}
                      fit="contain"
                      isGenerating={generatingRecipes.has(recipe.id)}
                    />
                  </div>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={700} noWrap>
                      {(() => {
                        const aiName = (recipe as any)?.results?.[0]?.metadata?.aiAdjustments
                          ?.preset_name as string | undefined;
                        const name =
                          recipe.name ||
                          (typeof aiName === 'string' && aiName.trim().length > 0
                            ? aiName
                            : undefined);
                        if (name && name.trim().length > 0) return name;
                        // Fallback: human-friendly timestamp label
                        try {
                          return new Date(recipe.timestamp).toLocaleString();
                        } catch {
                          return `Recipe ${recipe.id}`;
                        }
                      })()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(recipe.timestamp)}
                    </Typography>
                  </CardContent>
                </CardActionArea>
                <CardContent sx={{ pt: 0 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    disabled={generatingRecipes.has(recipe.id)}
                    onClick={e => {
                      e.stopPropagation();
                      onOpenRecipe(recipe);
                    }}
                  >
                    {generatingRecipes.has(recipe.id) ? 'Generating...' : 'Open'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleExportRecipe}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export Zip</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteRecipe} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </div>
  );
};

export default RecipeGallery;
