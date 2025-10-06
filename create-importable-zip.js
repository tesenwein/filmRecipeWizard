#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const RECIPES_DIR = './All-Recipes.frw';
const OUTPUT_FILE = './All-Recipes-Import.frw.zip';

// Read all .frw.json files
const files = fs.readdirSync(RECIPES_DIR)
  .filter(f => f.endsWith('.frw.json'))
  .map(f => path.join(RECIPES_DIR, f));

console.log(`Found ${files.length} recipe files`);

const processes = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const recipe = JSON.parse(content);

  // Add the recipe process to the array
  processes.push({
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    timestamp: recipe.timestamp || Date.now(),
    createdAt: recipe.createdAt || new Date().toISOString(),
    prompt: recipe.prompt || '',
    userOptions: recipe.userOptions || {},
    results: recipe.results || [],
    recipeImageData: recipe.recipeImageData,
    author: recipe.author,
  });
});

// Create bulk export format
const bulkData = {
  schema: 'film-recipe-wizard-bulk@1',
  processes: processes,
};

// Create ZIP
const zip = new AdmZip();
zip.addFile('all-recipes.json', Buffer.from(JSON.stringify(bulkData, null, 2)));
zip.writeZip(OUTPUT_FILE);

console.log(`Created ${OUTPUT_FILE} with ${processes.length} recipes`);
console.log('You can now import this ZIP file into the app');
