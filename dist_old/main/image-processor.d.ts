import type { AIColorAdjustments } from '../services/types';
import { ProcessingResult, StyleOptions } from '../shared/types';
export interface StyleMatchOptions {
    baseImagePath?: string;
    targetImagePath: string;
    outputPath?: string;
    matchBrightness?: boolean;
    matchSaturation?: boolean;
    matchColorGrading?: boolean;
    aiAdjustments?: AIColorAdjustments;
    baseImageBase64?: string | string[];
    targetImageBase64?: string;
    prompt?: string;
    styleOptions?: StyleOptions;
    onStreamUpdate?: (update: {
        type: string;
        content: string;
        step?: string;
        progress?: number;
        toolName?: string;
        toolArgs?: any;
    }) => void;
}
export declare class ImageProcessor {
    private aiStreamingService;
    private settingsService;
    constructor();
    private ensureAIStreamingService;
    matchStyle(data: StyleMatchOptions): Promise<ProcessingResult>;
    generatePreview(args: {
        path?: string;
        dataUrl?: string;
        processId?: string;
        subdir?: string;
    }): Promise<string>;
    setOpenAIKey(key: string): Promise<void>;
    generateLightroomPreset(data: any): Promise<ProcessingResult>;
    generateLightroomProfile(data: {
        sourceXmpPath: string;
        outputDir?: string;
    }): Promise<ProcessingResult>;
    generateCameraProfile(data: any): Promise<{
        success: boolean;
        xmpContent?: string;
        error?: string;
    }>;
    generateXMPContent(aiAdjustments: AIColorAdjustments, include: any, aiFunctions?: any): string;
    generateLUTContent(aiAdjustments: AIColorAdjustments, size?: number, format?: string): string;
}
