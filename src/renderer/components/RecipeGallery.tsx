import AddBoxIcon from '@mui/icons-material/AddBox';
import BoltIcon from '@mui/icons-material/Bolt';
import SearchIcon from '@mui/icons-material/Search';
import { Box, Card, Typography, Button } from '@mui/material';
import React, { useMemo, useState } from 'react';
import { Recipe } from '../../shared/types';
import { useAlert } from '../context/AlertContext';
import { useAppStore } from '../store/appStore';
import ConfirmDialog from './ConfirmDialog';
import ErrorDialog from './ErrorDialog';
import XMPImportDialog from './XMPImportDialog';
import GalleryHeader from './recipes/GalleryHeader';
import BulkActionsToolbar from './recipes/BulkActionsToolbar';
import RecipeGrid from './recipes/RecipeGrid';
import RecipeContextMenu from './recipes/RecipeContextMenu';

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
    deleteMultipleRecipes,
    importRecipes,
    importXMP,
    exportRecipe,
    exportAllRecipes
  } = useAppStore();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [multiDeleteDialogOpen, setMultiDeleteDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const [xmpImportDialogOpen, setXmpImportDialogOpen] = useState(false);
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
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
    try {
      parts.push(new Date(recipe.timestamp).toLocaleString());
    } catch {
      // Ignore date parsing errors
    }

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
      const numKeys = ['warmth', 'tint', 'contrast', 'vibrance', 'moodiness', 'saturationBias'] as const;
      for (const k of numKeys) if (uo[k] !== undefined) parts.push(String(uo[k]));
      if (uo.vibe) parts.push(uo.vibe);
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
    // Filter recipes based on search query
    const filteredRecipes = recipes.filter(recipe => {
      if (!searchQuery.trim()) return true;
      const searchTerm = searchQuery.toLowerCase();
      const haystack = buildSearchHaystack(recipe);
      return haystack.includes(searchTerm);
    });

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

    return { sortedRecipes, basePreviews };
  }, [recipes, searchQuery, sortBy]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, recipeId: string) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedRecipeId(recipeId);
  };

  const handleMenuClose = () => {
    // Only close the menu; keep selectedRecipeId for confirm dialogs
    setAnchorEl(null);
  };

  const handleDeleteRecipe = () => {
    if (!selectedRecipeId) return;
    handleMenuClose();
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRecipeId) return;
    setDeleteDialogOpen(false);
    try {
      await deleteRecipe(selectedRecipeId);
      setSelectedRecipeId(null);
      // Intentionally no success toast on delete
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      showError('Failed to delete recipe');
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setSelectedRecipeId(null);
  };

  // Multi-selection handlers
  const handleToggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedRecipes(new Set());
    }
  };

  const handleSelectRecipe = (recipeId: string) => {
    const newSelected = new Set(selectedRecipes);
    if (newSelected.has(recipeId)) {
      newSelected.delete(recipeId);
    } else {
      newSelected.add(recipeId);
    }
    setSelectedRecipes(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRecipes.size === sortedRecipes.length) {
      setSelectedRecipes(new Set());
    } else {
      setSelectedRecipes(new Set(sortedRecipes.map(r => r.id)));
    }
  };

  const handleMultiDelete = () => {
    if (selectedRecipes.size === 0) return;
    setMultiDeleteDialogOpen(true);
  };

  const handleConfirmMultiDelete = async () => {
    if (selectedRecipes.size === 0) return;
    const count = selectedRecipes.size;
    setMultiDeleteDialogOpen(false);
    try {
      await deleteMultipleRecipes(Array.from(selectedRecipes));
      setSelectedRecipes(new Set());
      setSelectionMode(false);
      showSuccess(`Deleted ${count} recipes`);
    } catch (error) {
      console.error('Failed to delete recipes:', error);
      showError('Failed to delete recipes');
    }
  };

  const handleCancelMultiDelete = () => {
    setMultiDeleteDialogOpen(false);
  };

  // Actions menu handlers
  const handleExportRecipe = async () => {
    if (!selectedRecipeId) return;
    handleMenuClose();
    try {
      const res = await exportRecipe(selectedRecipeId);
      if (!res.success && res.error && res.error !== 'Export canceled' && res.error !== 'Save cancelled') {
        showError(`Export failed: ${res.error}`);
      } else if (res.success) {
        showSuccess('Recipe exported');
      }
    } catch {
      showError('Export failed');
    }
  };

  // Drag and drop handlers for XMP files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const xmpFiles = files.filter(file => file.name.toLowerCase().endsWith('.xmp'));

    if (xmpFiles.length > 0) {
      try {
        for (const file of xmpFiles) {
          const fileContent = await file.text();
          const res = await importXMP({ fileContent, title: file.name.replace('.xmp', '') });
          if (res.success) {
            showSuccess(`Successfully imported XMP preset: ${file.name}`);
          } else {
            setErrorMessage(`Failed to import XMP preset: ${file.name}`);
            setErrorDetails(res.error || 'Unknown error occurred during import');
            setErrorDialogOpen(true);
          }
        }
      } catch (error) {
        setErrorMessage('XMP import failed unexpectedly');
        setErrorDetails(error instanceof Error ? error.message : 'An unexpected error occurred');
        setErrorDialogOpen(true);
      }
    }
  };

  const handleXMPImport = async (data: { filePath?: string; fileContent?: string; title?: string; description?: string }) => {
    try {
      const res = await importXMP(data);
      if (res.success) {
        showSuccess('Successfully imported XMP preset');
      } else {
        setErrorMessage('Failed to import XMP preset');
        setErrorDetails(res.error || 'Unknown error occurred during import');
        setErrorDialogOpen(true);
      }
    } catch (error) {
      setErrorMessage('XMP import failed unexpectedly');
      setErrorDetails(error instanceof Error ? error.message : 'An unexpected error occurred');
      setErrorDialogOpen(true);
    }
  };

  if (recipesLoading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '50px' }}>
        <BoltIcon sx={{ fontSize: '48px', marginBottom: '20px', color: 'primary.main' }} />
        <h2>Loading Recipes...</h2>
      </div>
    );
  }

  return (
    <div
      className="container"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ minHeight: '100vh' }}
    >
      <Box sx={{ mb: 3 }}>
        <GalleryHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={(v) => setSortBy(v)}
          selectionMode={selectionMode}
          onToggleSelectionMode={handleToggleSelectionMode}
          onNewProcess={onNewProcess}
          onImportRecipes={async () => {
            try {
              const res = await importRecipes();
              if (res.success) {
                if (res.count && res.count > 1) {
                  showSuccess(`Successfully imported ${res.count} recipes`);
                } else if (res.count === 1) {
                  showSuccess('Successfully imported 1 recipe');
                } else {
                  showSuccess('Import completed');
                }
              } else {
                setErrorMessage('Failed to import recipes');
                setErrorDetails(res.error || 'Unknown error occurred during import');
                setErrorDialogOpen(true);
              }
            } catch (error) {
              setErrorMessage('Import failed unexpectedly');
              setErrorDetails(error instanceof Error ? error.message : 'An unexpected error occurred');
              setErrorDialogOpen(true);
            }
          }}
          onOpenXMPImport={() => setXmpImportDialogOpen(true)}
          onExportAll={async () => {
            try {
              const res = await exportAllRecipes();
              if (res.success && res.count) {
                showSuccess(`Successfully exported ${res.count} recipes`);
              }
            } catch {
              showError('Export failed');
            }
          }}
          exportAllDisabled={sortedRecipes.length === 0 || generatingRecipes.size > 0}
        />
      </Box>

      {selectionMode && selectedRecipes.size > 0 && (
        <BulkActionsToolbar
          selectedCount={selectedRecipes.size}
          totalCount={sortedRecipes.length}
          onSelectAll={handleSelectAll}
          onDeleteSelected={handleMultiDelete}
        />
      )}

      {recipes.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <AddBoxIcon sx={{ fontSize: 64, opacity: 0.5, mb: 2, color: 'primary.main' }} />
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
          <SearchIcon sx={{ fontSize: '48px', opacity: 0.5, mb: 2, color: 'text.secondary' }} />
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
        <RecipeGrid
          recipes={sortedRecipes}
          basePreviews={basePreviews}
          generatingRecipes={generatingRecipes}
          selectionMode={selectionMode}
          selectedRecipes={selectedRecipes}
          onOpenRecipe={onOpenRecipe}
          onToggleSelect={handleSelectRecipe}
          onOpenMenu={handleMenuOpen}
        />
      )}

      <RecipeContextMenu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onExport={handleExportRecipe}
        onDelete={handleDeleteRecipe}
      />
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Recipe"
        content="Are you sure you want to delete this recipe? This action cannot be undone."
        confirmButtonText="Delete"
        confirmColor="error"
      />
      <ConfirmDialog
        open={multiDeleteDialogOpen}
        onClose={handleCancelMultiDelete}
        onConfirm={handleConfirmMultiDelete}
        title="Delete Multiple Recipes"
        content={`Are you sure you want to delete ${selectedRecipes.size} recipe${selectedRecipes.size !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmButtonText="Delete All"
        confirmColor="error"
      />

      <ErrorDialog
        open={errorDialogOpen}
        title="Import Error"
        message={errorMessage}
        details={errorDetails}
        onClose={() => {
          setErrorDialogOpen(false);
          setErrorMessage('');
          setErrorDetails('');
        }}
      />
      <XMPImportDialog
        open={xmpImportDialogOpen}
        onClose={() => setXmpImportDialogOpen(false)}
        onImport={handleXMPImport}
      />
    </div>
  );
};

export default RecipeGallery;
