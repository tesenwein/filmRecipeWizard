import { AIColorAdjustments } from '../services/types';
export interface XMPParseResult {
    success: boolean;
    presetName?: string;
    description?: string;
    adjustments?: AIColorAdjustments;
    error?: string;
}
/**
 * Parses XMP files to extract Lightroom preset data and convert it to AIColorAdjustments format
 */
export declare function parseXMPContent(xmpContent: string): XMPParseResult;
