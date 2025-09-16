const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../assets/icons/icon.svg');
const iconsDir = path.join(__dirname, '../build/icons');

const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];

let jimp = null;
let pngToIco = null;

try {
  jimp = require('jimp');
} catch (err) {
  console.warn('`jimp` could not be loaded — will copy existing icons as fallback.');
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

async function generateWithJimp() {
  console.log('Using jimp for icon generation...');

  // Check if we have existing PNG files to work with
  const assetsIconsDir = path.join(__dirname, '../assets/icons');
  const existingPng = path.join(assetsIconsDir, 'icon.png');

  if (!fs.existsSync(existingPng)) {
    console.log('No existing PNG found, creating basic colored icon with jimp...');
    await createBasicIconWithJimp();
    return;
  }

  try {
    // Read the existing PNG and generate different sizes
    const img = await jimp.read(existingPng);

    // Generate all the required sizes
    for (const size of sizes) {
      const resized = img.clone().resize(size, size);
      await resized.writeAsync(path.join(iconsDir, `${size}x${size}.png`));
      console.log(`Generated ${size}x${size}.png`);
    }

    // Generate main icon.png
    const mainIcon = img.clone().resize(512, 512);
    await mainIcon.writeAsync(path.join(iconsDir, 'icon.png'));
    console.log('Generated icon.png');

    // Generate ICO file for Windows
    if (pngToIco) {
      await generateIcoWithJimp(img);
    }

  } catch (error) {
    console.warn('Error generating with jimp:', error.message);
    console.log('Falling back to creating basic icon...');
    await createBasicIconWithJimp();
  }
}

async function createBasicIconWithJimp() {
  try {
    console.log('Creating basic icon with jimp...');

    // Create a simple colored square icon as fallback
    const baseImage = new jimp(512, 512, '#3b82f6'); // Blue background

    // Add a simple white circle in the center
    const centerX = 256;
    const centerY = 256;
    const radius = 180;

    baseImage.scan(0, 0, 512, 512, function (x, y, idx) {
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      if (distance <= radius) {
        this.bitmap.data[idx] = 255;     // Red
        this.bitmap.data[idx + 1] = 255; // Green
        this.bitmap.data[idx + 2] = 255; // Blue
        this.bitmap.data[idx + 3] = 255; // Alpha
      }
    });

    // Generate all the required sizes
    for (const size of sizes) {
      const resized = baseImage.clone().resize(size, size);
      await resized.writeAsync(path.join(iconsDir, `${size}x${size}.png`));
      console.log(`Generated ${size}x${size}.png`);
    }

    // Generate main icon.png
    const mainIcon = baseImage.clone().resize(512, 512);
    await mainIcon.writeAsync(path.join(iconsDir, 'icon.png'));
    console.log('Generated icon.png');

    // Generate ICO file for Windows
    if (pngToIco) {
      await generateIcoWithJimp(baseImage);
    }

    // Copy the SVG as well
    copyExistingIcons();

  } catch (error) {
    console.warn('Error creating basic icon with jimp:', error.message);
    console.log('Falling back to copying existing files...');
    copyExistingIcons();
  }
}

async function generateIcoWithJimp(baseImage) {
  try {
    const iconSizes = [16, 32, 48, 64, 128, 256];
    const pngBuffers = [];

    for (const size of iconSizes) {
      const resized = baseImage.clone().resize(size, size);
      const buffer = await resized.getBufferAsync(jimp.MIME_PNG);
      pngBuffers.push(buffer);
    }

    const icoBuffer = await pngToIco(pngBuffers);
    fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoBuffer);
    console.log('Generated icon.ico');
  } catch (error) {
    console.warn('Failed to generate ICO file:', error.message);
  }
}

// We use jimp for image processing. If jimp isn't available we copy prebuilt icons.

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

    if (jimp) {
      await generateWithJimp();
      console.log('All icons generated successfully with jimp!');
      return;
    }

    // jimp not available — copy prebuilt icons from assets
    console.warn('`jimp` not available; copying prebuilt icons from assets instead.');
    copyExistingIcons();
  } catch (error) {
    console.error('Error generating icons:', error && error.message ? error.message : error);
    console.log('Falling back to copying prebuilt icons from assets...');
    copyExistingIcons();
  }
}

generateIcons();

