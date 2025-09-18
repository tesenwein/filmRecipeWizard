import { ProfileExportResult } from '../shared/types';
/**
 * Exports a Lightroom/Camera Raw Profile (.xmp) by copying an existing profile XMP
 * into the project output folder. Validates that the XMP appears to be a Look/Profile
 * by checking for crs:PresetType="Look" or presence of RGBTable/Table_ entries.
 */
export declare function exportLightroomProfile(sourceXmpPath: string, outDir?: string): Promise<ProfileExportResult>;
