import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { imageProcessingService } from '../services/image-processing-service';
import { logError } from '../shared/error-utils';

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
    if (args.path) {
      await imageProcessingService.generatePreview(args.path, outPath, {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 92
      });
    } else if (args.dataUrl) {
      await imageProcessingService.generatePreviewFromDataUrl(args.dataUrl, outPath, {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 92
      });
    } else {
      throw new Error('No input provided for preview');
    }

    return outPath;
  } catch (error) {
    logError('PREVIEW', 'Error generating preview', error);
    throw new Error(`Failed to generate preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}