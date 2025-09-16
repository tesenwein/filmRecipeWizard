const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');
const buildDir = path.join(__dirname, '../build');

console.log('🔍 Validating build outputs...');

// Check if dist directory exists and has required files
const requiredDistFiles = [
  'main/main.js',
  'main/preload.js',
  'renderer/index.html',
  'renderer/renderer.js'
];

let validationPassed = true;

// Check dist directory
if (!fs.existsSync(distDir)) {
  console.error('❌ dist/ directory not found');
  validationPassed = false;
} else {
  console.log('✅ dist/ directory exists');
  
  for (const file of requiredDistFiles) {
    const filePath = path.join(distDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Required file missing: dist/${file}`);
      validationPassed = false;
    } else {
      console.log(`✅ Found: dist/${file}`);
    }
  }
}

// Check build directory (icons)
if (!fs.existsSync(buildDir)) {
  console.error('❌ build/ directory not found');
  validationPassed = false;
} else {
  console.log('✅ build/ directory exists');
  
  const iconsDir = path.join(buildDir, 'icons');
  if (!fs.existsSync(iconsDir)) {
    console.error('❌ build/icons/ directory not found');
    validationPassed = false;
  } else {
    console.log('✅ build/icons/ directory exists');
    
    const iconFiles = fs.readdirSync(iconsDir);
    const requiredIcons = ['icon.png', '16x16.png', '32x32.png', '128x128.png', '256x256.png', '512x512.png'];
    
    for (const icon of requiredIcons) {
      if (!iconFiles.includes(icon)) {
        console.error(`❌ Required icon missing: ${icon}`);
        validationPassed = false;
      } else {
        console.log(`✅ Found icon: ${icon}`);
      }
    }
  }
}

if (validationPassed) {
  console.log('\n🎉 Build validation passed! All required files are present.');
  process.exit(0);
} else {
  console.log('\n💥 Build validation failed! Some required files are missing.');
  process.exit(1);
}