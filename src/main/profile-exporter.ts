import * as fs from 'fs/promises';
import * as path from 'path';
import { ProfileExportResult } from '../shared/types';

/**
 * Exports a Lightroom/Camera Raw Profile (.xmp) by copying an existing profile XMP
 * into the project output folder. Validates that the XMP appears to be a Look/Profile
 * by checking for crs:PresetType="Look" or presence of RGBTable/Table_ entries.
 */
export async function exportLightroomProfile(sourceXmpPath: string, outDir?: string): Promise<ProfileExportResult> {
  try {
    const resolved = path.resolve(sourceXmpPath);
    const contents = await fs.readFile(resolved, 'utf8');

    // Simple validation: ensure it's an XMP Look/Profile
    const isLook = /crs:PresetType\s*=\s*"Look"/.test(contents) || /crs:RGBTable=/.test(contents);
    if (!isLook) {
      return { success: false, error: 'Provided XMP is not a Lightroom Profile (Look) XMP' };
    }

    const nameMatch = contents.match(/<crs:Name>\s*<rdf:Alt>\s*<rdf:li [^>]*>([^<]*)<\/rdf:li>/);
    const profileName = nameMatch?.[1] || path.basename(resolved, '.xmp');

    const targetDir = outDir || path.join(process.cwd(), 'profiles');
    await fs.mkdir(targetDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${profileName.replace(/\s+/g, '-')}-${timestamp}.xmp`;
    const dest = path.join(targetDir, fileName);
    await fs.writeFile(dest, contents, 'utf8');

    return { success: true, outputPath: dest, metadata: { profileName } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

