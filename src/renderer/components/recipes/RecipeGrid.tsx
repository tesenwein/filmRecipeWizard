import { Grid } from '@mui/material';
import React from 'react';
import { Recipe } from '../../../shared/types';
import RecipeCard from './RecipeCard';

interface RecipeGridProps {
  recipes: Recipe[];
  basePreviews: string[];
  generatingRecipes: Set<string>;
  selectionMode: boolean;
  selectedRecipes: Set<string>;
  onOpenRecipe: (recipe: Recipe) => void;
  onToggleSelect: (recipeId: string) => void;
  onOpenMenu: (e: React.MouseEvent<HTMLElement>, recipeId: string) => void;
}

const RecipeGrid: React.FC<RecipeGridProps> = ({
  recipes,
  basePreviews,
  generatingRecipes,
  selectionMode,
  selectedRecipes,
  onOpenRecipe,
  onToggleSelect,
  onOpenMenu,
}) => {
  return (
    <Grid container spacing={2}>
      {recipes.map((recipe, index) => (
        <Grid key={recipe.id} size={{ xs: 12, sm: 6, md: 4 }}>
          <RecipeCard
            recipe={recipe}
            index={index}
            basePreview={basePreviews[index] || ''}
            isGenerating={generatingRecipes.has(recipe.id)}
            selectionMode={selectionMode}
            selected={selectedRecipes.has(recipe.id)}
            onOpenRecipe={onOpenRecipe}
            onToggleSelect={onToggleSelect}
            onOpenMenu={onOpenMenu}
          />
        </Grid>
      ))}
    </Grid>
  );
};

export default RecipeGrid;

