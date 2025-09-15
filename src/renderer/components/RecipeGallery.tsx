import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import {
  Button,
  Card,
  CardActionArea,
  CardContent,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import React, { useState, useMemo } from 'react';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
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
    deleteRecipe,
    importRecipes,
    exportRecipe,
    exportAllRecipes
  } = useAppStore();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('name');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { showSuccess, showError } = useAlert();

  // Recipes are loaded during splash screen, no need to load here

  // Helper function to get recipe name for sorting and searching
  const getRecipeName = (recipe: Recipe) => {
    const aiName = (recipe as any)?.results?.[0]?.metadata?.aiAdjustments?.preset_name as string | undefined;
    return recipe.name ||
           (typeof aiName === 'string' && aiName.trim().length > 0 ? aiName : '') ||
           new Date(recipe.timestamp).toLocaleString();
  };

  // Build a searchable haystack of all relevant fields (excluding image blobs)
  const buildSearchHaystack = (recipe: Recipe) => {
    const parts: string[] = [];

    // Basic fields
    parts.push(recipe.id);
    parts.push(getRecipeName(recipe));
    if (recipe.prompt) parts.push(recipe.prompt);
    try { parts.push(new Date(recipe.timestamp).toLocaleString()); } catch {}

    // Author
    const author = (recipe as any).author as any;
    if (author) {
      if (author.firstName) parts.push(author.firstName);
      if (author.lastName) parts.push(author.lastName);
      if (author.email) parts.push(author.email);
      if (author.website) parts.push(author.website);
      if (author.instagram) parts.push(author.instagram);
    }

    // User options
    const uo = recipe.userOptions as any;
    if (uo) {
      const numKeys = ['warmth','tint','contrast','vibrance','moodiness','saturationBias'] as const;
      for (const k of numKeys) if (uo[k] !== undefined) parts.push(String(uo[k]));
      if (uo.vibe) parts.push(uo.vibe);
      if (uo.lightroomProfile) parts.push(uo.lightroomProfile);
      if (uo.filmGrain !== undefined) parts.push(uo.filmGrain ? 'film grain' : 'no film grain');
      if (uo.preserveSkinTones !== undefined) parts.push(uo.preserveSkinTones ? 'preserve skin tones' : 'no skin tone preserve');
      if (uo.artistStyle) parts.push(uo.artistStyle.name, uo.artistStyle.category, uo.artistStyle.blurb, uo.artistStyle.key);
      if (uo.filmStyle) parts.push(uo.filmStyle.name, uo.filmStyle.category, uo.filmStyle.blurb, uo.filmStyle.key);
    }

    // Results metadata
    if (Array.isArray(recipe.results)) {
      for (const r of recipe.results) {
        if (!r) continue;
        if (r.error) parts.push(r.error);
        if (r.metadata) {
          const m: any = r.metadata;
          if (m.presetName) parts.push(m.presetName);
          if (m.groupFolder) parts.push(m.groupFolder);
          if (m.reasoning) parts.push(m.reasoning);
          if (m.aiAdjustments) parts.push(JSON.stringify(m.aiAdjustments));
        }
      }
    }

    return parts
      .filter(v => typeof v === 'string' && v.trim().length > 0)
      .join(' ')
      .toLowerCase();
  };

  // Memoize filtered and sorted recipes to prevent endless recalculations
  const { sortedRecipes, basePreviews } = useMemo(() => {
    console.log('[GALLERY] useMemo recalculating with:', recipes.length, 'recipes, searchQuery:', searchQuery, 'sortBy:', sortBy);

    // Filter recipes based on search query
    const filteredRecipes = recipes.filter(recipe => {
      if (!searchQuery.trim()) return true;
      const searchTerm = searchQuery.toLowerCase();
      const haystack = buildSearchHaystack(recipe);
      return haystack.includes(searchTerm);
    });

    console.log('[GALLERY] filtered to:', filteredRecipes.length, 'recipes');

    // Sort filtered recipes based on selected criteria
    const sortedRecipes = [...filteredRecipes].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'oldest':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'name':
          return getRecipeName(a).localeCompare(getRecipeName(b));
        default:
          return 0;
      }
    });

    const basePreviews = sortedRecipes.map((recipe: Recipe) =>
      recipe?.recipeImageData &&
      typeof recipe.recipeImageData === 'string' &&
      recipe.recipeImageData.length > 0
        ? `data:image/jpeg;base64,${recipe.recipeImageData}`
        : ''
    );

    console.log('[GALLERY] useMemo completed');
    return { sortedRecipes, basePreviews };
  }, [recipes, searchQuery, sortBy]);

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
            {sortedRecipes.length === recipes.length
              ? `${recipes.length} recipes`
              : `${sortedRecipes.length} of ${recipes.length} recipes`}
          </Typography>
        </Grid>
        <Grid style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Sort by</InputLabel>
            <Select
              value={sortBy}
              label="Sort by"
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'name')}
            >
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="newest">Newest</MenuItem>
              <MenuItem value="oldest">Oldest</MenuItem>
            </Select>
          </FormControl>
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
            disabled={sortedRecipes.length === 0 || generatingRecipes.size > 0}
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
      ) : sortedRecipes.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h3" sx={{ opacity: 0.5, mb: 2 }}>
            🔍
          </Typography>
          <Typography variant="h6" sx={{ mb: 1 }}>
            No recipes found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Try adjusting your search query or sort criteria
          </Typography>
          <Button variant="outlined" onClick={() => setSearchQuery('')}>
            Clear Search
          </Button>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {sortedRecipes.map((recipe, index) => (
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
                  <CardContent sx={{ pb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ mb: 1 }}>
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

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(recipe.timestamp)}
                      </Typography>
                      {(recipe as any)?.author && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            fontWeight: 400,
                          }}
                        >
                          <PersonOutlineOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                          {[(recipe as any).author.firstName, (recipe as any).author.lastName]
                            .filter(Boolean)
                            .join(' ')}
                        </Typography>
                      )}
                    </div>
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
