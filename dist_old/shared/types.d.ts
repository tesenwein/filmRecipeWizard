import type { AIColorAdjustments } from '../services/types';
export declare const DEFAULT_STORAGE_FOLDER = ".film-recipes-wizard";
export declare enum LightroomProfile {
    ADOBE_COLOR = "adobe-color",
    ADOBE_MONOCHROME = "adobe-monochrome",
    FLAT = "flat"
}
export declare const getLightroomProfileDisplayName: (profile: LightroomProfile | string) => string;
export interface ProcessingResult {
    inputPath?: string;
    outputPath?: string;
    success: boolean;
    error?: string;
    metadata?: {
        aiAdjustments?: AIColorAdjustments;
        processingTime?: number;
        reasoning?: string;
        confidence?: number;
        presetName?: string;
        groupFolder?: string;
        usedSettings?: {
            preserveSkinTones?: boolean;
        };
    };
}
export interface StyleOptions {
    warmth?: number;
    tint?: number;
    contrast?: number;
    vibrance?: number;
    moodiness?: number;
    saturationBias?: number;
    filmGrain?: boolean;
    preserveSkinTones?: boolean;
    vibe?: string;
    aiFunctions?: {
        temperatureTint?: boolean;
        masks?: boolean;
        colorGrading?: boolean;
        hsl?: boolean;
        curves?: boolean;
        grain?: boolean;
        pointColor?: boolean;
    };
    artistStyle?: {
        key: string;
        name: string;
        category: string;
        blurb: string;
    };
    filmStyle?: {
        key: string;
        name: string;
        category: string;
        blurb: string;
    };
    lightroomProfile?: LightroomProfile;
}
export interface Recipe {
    id: string;
    timestamp: string;
    name?: string;
    prompt?: string;
    results: ProcessingResult[];
    recipeImageData?: string;
    userOptions?: StyleOptions;
    status?: 'generating' | 'completed' | 'failed';
    author?: UserProfile;
}
export type ProcessHistory = Recipe;
export interface ProcessingState {
    isProcessing: boolean;
    progress: number;
    status: string;
}
export interface ProfileExportResult {
    success: boolean;
    outputPath?: string;
    error?: string;
    metadata?: {
        profileName?: string;
    };
}
export interface AppSettings {
    openaiKey?: string;
    setupCompleted?: boolean;
    userProfile?: UserProfile;
    storageLocation?: string;
}
export interface ExportResult {
    success: boolean;
    filePath?: string;
    count?: number;
    error?: string;
}
export interface ImportResult {
    success: boolean;
    count?: number;
    replaced?: number;
    error?: string;
}
export interface UserProfile {
    firstName: string;
    lastName: string;
    email?: string;
    website?: string;
    instagram?: string;
}
