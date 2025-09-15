const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../assets/icons/icon.svg');
const iconsDir = path.join(__dirname, '../build/icons');

const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];

async function generateIcons() {
  try {
    // Ensure icons directory exists
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }

    const svgBuffer = fs.readFileSync(svgPath);

    // Generate PNG files for each size
    for (const size of sizes) {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(iconsDir, `${size}x${size}.png`));
      console.log(`Generated ${size}x${size}.png`);
    }

    // Copy 512x512 as the main icon.png (electron-builder requires at least 512x512)
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(iconsDir, 'icon.png'));
    console.log('Generated icon.png');

    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();

