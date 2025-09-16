const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../assets/icons/icon.svg');
const iconsDir = path.join(__dirname, '../build/icons');

const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];

let sharp = null;
let pngToIco = null;

try {
  // Try to require sharp; it can fail on some CI/platform combinations
  sharp = require('sharp');
} catch (err) {
  console.warn('`sharp` could not be loaded — will copy existing icons as fallback.');
}

try {
  const pngToIcoModule = require('png-to-ico');
  pngToIco = pngToIcoModule.default || pngToIcoModule;
} catch (err) {
  console.warn('`png-to-ico` could not be loaded — ICO generation will be skipped.');
}

function ensureIconsDir() {
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
}

async function generateWithSharp(svgBuffer) {
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `${size}x${size}.png`));
    console.log(`Generated ${size}x${size}.png`);
  }

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon.png'));
  console.log('Generated icon.png');

  // Generate ICO file for Windows
  if (pngToIco) {
    try {
      const iconSizes = [16, 32, 48, 64, 128, 256];
      const pngBuffers = [];

      for (const size of iconSizes) {
        const buffer = await sharp(svgBuffer)
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
}

// jimp removed: we prefer sharp. If sharp isn't available we copy prebuilt icons.

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

    const svgBuffer = fs.readFileSync(svgPath);

    if (sharp) {
      await generateWithSharp(svgBuffer);
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