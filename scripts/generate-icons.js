const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../assets/icons/icon.svg');
const iconsDir = path.join(__dirname, '../build/icons');

const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];

let sharp = null;
let pngToIco = null;

try {
  sharp = require('sharp');
} catch (err) {
  console.warn('`sharp` could not be loaded — will copy existing icons as fallback.');
}

try {
  pngToIco = require('png-to-ico');
  console.log('png-to-ico loaded successfully');
} catch (err) {
  console.warn('`png-to-ico` could not be loaded — ICO generation will be skipped.');
}

function ensureIconsDir() {
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
}

async function generateWithSharp() {
  console.log('Using sharp for icon generation...');

  // Check if we have existing PNG files to work with
  const assetsIconsDir = path.join(__dirname, '../assets/icons');
  const existingPng = path.join(assetsIconsDir, 'icon.png');

  if (!fs.existsSync(existingPng)) {
    console.log('No existing PNG found, creating basic colored icon with sharp...');
    await createBasicIconWithSharp();
    return;
  }

  try {
    // Read the existing PNG and generate different sizes
    for (const size of sizes) {
      await sharp(existingPng)
        .resize(size, size)
        .png()
        .toFile(path.join(iconsDir, `${size}x${size}.png`));
      console.log(`Generated ${size}x${size}.png`);
    }

    // Generate main icon.png
    await sharp(existingPng)
      .resize(512, 512)
      .png()
      .toFile(path.join(iconsDir, 'icon.png'));
    console.log('Generated icon.png');

    // Generate ICO file for Windows
    if (pngToIco) {
      await generateIcoWithSharp(existingPng);
    }

  } catch (error) {
    console.warn('Error generating with sharp:', error.message);
    console.log('Falling back to creating basic icon...');
    await createBasicIconWithSharp();
  }
}

async function createBasicIconWithSharp() {
  try {
    console.log('Creating basic icon with sharp...');

    // Create a simple colored square icon as fallback
    const baseBuffer = await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 59, g: 130, b: 246, alpha: 1 } // Blue background
      }
    })
    .composite([{
      input: await sharp({
        create: {
          width: 360,
          height: 360,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 } // White circle
        }
      })
      .png()
      .toBuffer(),
      left: 76,
      top: 76
    }])
    .png()
    .toBuffer();

    // Generate all the required sizes
    for (const size of sizes) {
      await sharp(baseBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(iconsDir, `${size}x${size}.png`));
      console.log(`Generated ${size}x${size}.png`);
    }

    // Generate main icon.png
    await sharp(baseBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(iconsDir, 'icon.png'));
    console.log('Generated icon.png');

    // Generate ICO file for Windows
    if (pngToIco) {
      await generateIcoWithSharp(baseBuffer);
    }

    // Copy the SVG as well
    copyExistingIcons();

  } catch (error) {
    console.warn('Error creating basic icon with sharp:', error.message);
    console.log('Falling back to copying existing files...');
    copyExistingIcons();
  }
}

async function generateIcoWithSharp(input) {
  try {
    const iconSizes = [16, 32, 48, 64, 128, 256];
    const pngBuffers = [];

    for (const size of iconSizes) {
      const buffer = await sharp(input)
        .resize(size, size)
        .png()
        .toBuffer();
      pngBuffers.push(buffer);
    }

    const icoBuffer = await pngToIco(pngBuffers);
    fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoBuffer);
    console.log('Generated icon.ico');
  } catch (error) {
    console.warn('Failed to generate ICO file:', error.message);
  }
}

function copyExistingIcons() {
  // Copy prebuilt icons from assets/icons to build/icons
  const assetsIconsDir = path.join(__dirname, '../assets/icons');
  if (!fs.existsSync(assetsIconsDir)) {
    console.warn('No existing assets icons found to copy. Nothing to do.');
    return;
  }

  ensureIconsDir();
  const files = fs.readdirSync(assetsIconsDir).filter(file => file.endsWith('.png') || file.endsWith('.svg'));
  for (const file of files) {
    const src = path.join(assetsIconsDir, file);
    const dest = path.join(iconsDir, file);
    try {
      fs.copyFileSync(src, dest);
      console.log(`Copied existing icon: ${file}`);
    } catch (err) {
      console.warn(`Failed to copy ${file}:`, err.message);
    }
  }
}

async function generateIcons() {
  try {
    ensureIconsDir();

    if (!fs.existsSync(svgPath)) {
      console.warn('SVG source icon not found:', svgPath);
      // fallback to copying existing icons from assets
      copyExistingIcons();
      return;
    }

    if (sharp) {
      await generateWithSharp();
      console.log('All icons generated successfully with sharp!');
      return;
    }

    // sharp not available — copy prebuilt icons from assets
    console.warn('`sharp` not available; copying prebuilt icons from assets instead.');
    copyExistingIcons();
  } catch (error) {
    console.error('Error generating icons:', error && error.message ? error.message : error);
    console.log('Falling back to copying prebuilt icons from assets...');
    copyExistingIcons();
  }
}

generateIcons();