import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';

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

  let img = sharp();
  if (args.path) {
    img = sharp(args.path);
  } else if (args.dataUrl) {
    const base64 = args.dataUrl.split(',')[1] || '';
    const buf = Buffer.from(base64, 'base64');
    img = sharp(buf);
  } else {
    throw new Error('No input provided for preview');
  }

  await img
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 92 })
    .toFile(outPath);

  return outPath;
}
