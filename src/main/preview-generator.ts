import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import Jimp from 'jimp';

export async function generatePreviewFile(args: {
  path?: string;
  dataUrl?: string;
  processId?: string;
  subdir?: string;
}): Promise<string> {
  let outDir: string;
  if (args.processId) {
    const userData = app.getPath('userData');
    const baseDir = path.join(userData, 'recipes', args.processId, 'previews');
    outDir = args.subdir ? path.join(baseDir, args.subdir) : baseDir;
  } else {
    const os = await import('os');
    outDir = path.join(os.tmpdir(), 'film-recipe-wizard-previews');
  }
  await fs.mkdir(outDir, { recursive: true });

  const srcName = (() => {
    const p = args.path || '';
    const name = p ? path.basename(p) : 'preview';
    return name.replace(/\s+/g, '-').replace(/[^A-Za-z0-9._-]/g, '') || 'preview';
  })();
  const outPath = path.join(
    outDir,
    `${Date.now()}-${Math.floor(Math.random() * 1e6)}-${srcName}.jpg`
  );

  try {
    let img: any;

    if (args.path) {
      img = await Jimp.read(args.path);
    } else if (args.dataUrl) {
      const base64 = args.dataUrl.split(',')[1] || '';
      const buf = Buffer.from(base64, 'base64');
      img = await Jimp.read(buf);
    } else {
      throw new Error('No input provided for preview');
    }

    // Resize with aspect ratio preservation
    img.scaleToFit(1024, 1024);

    // Set JPEG quality
    img.quality(92);

    // Write to file
    await img.writeAsync(outPath);

    return outPath;
  } catch (error) {
    console.error('[PREVIEW] Error generating preview:', error);
    throw new Error(`Failed to generate preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}