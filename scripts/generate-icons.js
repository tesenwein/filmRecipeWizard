const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');

const svgPath = path.join(__dirname, '../assets/icons/icon.svg');
const iconsDir = path.join(__dirname, '../build/icons');

const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];

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
  }

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon.png'));

  // Generate ICO file for Windows
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
}

async function generateIcons() {
  ensureIconsDir();

  if (!fs.existsSync(svgPath)) {
    throw new Error(`SVG source icon not found: ${svgPath}`);
  }

  const svgBuffer = fs.readFileSync(svgPath);
  await generateWithSharp(svgBuffer);
}

generateIcons();
