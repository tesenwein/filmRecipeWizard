const fs = require('fs');
const path = require('path');

function main() {
  const outDir = path.resolve(__dirname, '..', 'exampleXmp');
  const outPath = path.join(outDir, 'generated-person-mask.xmp');

  // Load compiled generator from dist
  // Ensure you've run `npm run build:main` before executing this script
  const { generateXMPContent } = require('../dist/main/xmp-generator.js');

  const ai = {
    camera_profile: 'Adobe Color',
    treatment: 'color',
    monochrome: false,
    temperature: 5900,
    tint: 6,
    exposure: 0.0,
    contrast: -10,
    highlights: -28,
    shadows: 32,
    whites: 6,
    blacks: -4,
    clarity: -8,
    vibrance: 14,
    saturation: -4,
    // Minimal masks sample including a person AI mask
    masks: [
      {
        type: 'person',
        name: 'Subject Pop',
        referenceX: 0.52,
        referenceY: 0.47,
        adjustments: { local_exposure: 0.2, local_clarity: -0.1, local_shadows: 0.1 },
      },
      {
        type: 'radial',
        name: 'Face Soft Pop',
        top: 0.086,
        left: 0.174,
        bottom: 0.736,
        right: 0.844,
        angle: 0,
        midpoint: 50,
        roundness: 30,
        feather: 85,
        inverted: false,
        flipped: true,
        adjustments: {
          local_saturation: 0.05,
          local_exposure: 0.2,
          local_contrast: 0.05,
          local_highlights: 0.1,
          local_shadows: 0.1,
          local_whites: 0.05,
          local_clarity: -0.1,
          local_temperature: 0.05,
          local_tint: 0.05,
          local_texture: -0.05,
        },
      },
      {
        type: 'linear',
        name: 'Background Cool Falloff',
        zeroX: 0.0,
        zeroY: 0.0,
        fullX: 0.7,
        fullY: 0.3,
        adjustments: {
          local_saturation: -0.05,
          local_exposure: -0.3,
          local_dehaze: 0.1,
          local_temperature: -0.25,
          local_tint: -0.1,
        },
      },
    ],
  };

  const include = {
    exposure: true,
    wbBasic: true,
    hsl: true,
    colorGrading: true,
    curves: true,
    pointColor: true,
    grain: true,
    masks: true,
  };

  const xmp = generateXMPContent(ai, include);
  fs.writeFileSync(outPath, xmp, 'utf8');
  console.log('Wrote sample XMP with person mask to:', outPath);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error('Failed to generate sample XMP:', err);
    process.exit(1);
  }
}

