#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const OLD_RECIPES_FILE = './temp-old-recipes/all-recipes.json';
const NEW_RECIPES_DIR = './All-Recipes.frw';
const OUTPUT_FILE = './All-Recipes-Final.frw.zip';

// Load old recipes (with images)
const oldRecipesContent = fs.readFileSync(OLD_RECIPES_FILE, 'utf8');
const oldRecipes = JSON.parse(oldRecipesContent);

console.log(`Loaded ${oldRecipes.processes.length} old recipes`);

// Load new recipes (with fixed masks)
const newRecipeFiles = fs.readdirSync(NEW_RECIPES_DIR)
  .filter(f => f.endsWith('.frw.json'))
  .map(f => path.join(NEW_RECIPES_DIR, f));

console.log(`Found ${newRecipeFiles.length} new recipe files`);

// Create a map of new recipes by name
const newRecipesMap = {};
newRecipeFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const recipe = JSON.parse(content);
  newRecipesMap[recipe.name] = recipe;
});

// Merge: Update old recipes with new mask data where names match
const mergedProcesses = oldRecipes.processes.map(oldProcess => {
  const newRecipe = newRecipesMap[oldProcess.name];

  if (newRecipe && newRecipe.results && newRecipe.results.length > 0) {
    console.log(`✓ Merging: ${oldProcess.name}`);

    // Keep old recipe structure but update results with new mask data
    return {
      ...oldProcess,
      results: newRecipe.results.map((newResult, idx) => {
        const oldResult = oldProcess.results[idx] || {};
        return {
          ...oldResult,
          ...newResult,
          // Preserve base64 image data from old if exists
          base64DataUrl: oldResult.base64DataUrl,
        };
      }),
    };
  } else {
    console.log(`  Keeping old: ${oldProcess.name}`);
    return oldProcess;
  }
});

// Add any new recipes that don't exist in old
Object.keys(newRecipesMap).forEach(name => {
  const existsInOld = oldRecipes.processes.some(p => p.name === name);
  if (!existsInOld) {
    console.log(`+ Adding new: ${name}`);
    const newRecipe = newRecipesMap[name];
    mergedProcesses.push({
      id: newRecipe.id,
      name: newRecipe.name,
      description: newRecipe.description,
      timestamp: newRecipe.timestamp || Date.now(),
      createdAt: newRecipe.createdAt || new Date().toISOString(),
      prompt: newRecipe.prompt || '',
      userOptions: newRecipe.userOptions || {},
      results: newRecipe.results || [],
      recipeImageData: newRecipe.recipeImageData,
      author: newRecipe.author,
    });
  }
});

// Create final bulk export
const finalBulkData = {
  schema: 'film-recipe-wizard-bulk@1',
  processes: mergedProcesses,
};

// Create ZIP
const zip = new AdmZip();
zip.addFile('all-recipes.json', Buffer.from(JSON.stringify(finalBulkData, null, 2)));

// Copy recipe images from old ZIP
const oldZip = new AdmZip('./All-Recipes-2025-09-28.frw.zip');
const oldEntries = oldZip.getEntries();
oldEntries.forEach(entry => {
  if (entry.entryName.includes('/recipe.jpg') || entry.entryName.includes('/presets/')) {
    zip.addFile(entry.entryName, entry.getData());
  }
});

zip.writeZip(OUTPUT_FILE);

console.log(`\n✓ Created ${OUTPUT_FILE} with ${mergedProcesses.length} recipes`);
console.log('  - Fixed mask field names (removed local_* prefix)');
console.log('  - Preserved recipe images');
console.log('  - Ready to import into the app');
