import type { AIColorAdjustments } from './types';
export type { AIColorAdjustments } from './types';
export declare function getExampleBWMixer(): Pick<AIColorAdjustments, 'gray_red' | 'gray_orange' | 'gray_yellow' | 'gray_green' | 'gray_aqua' | 'gray_blue' | 'gray_purple' | 'gray_magenta'>;
export declare class OpenAIColorAnalyzer {
    private openai;
    private initialized;
    private model;
    constructor(apiKey?: string);
    analyzeColorMatch(baseImagePath: string | undefined, targetImagePath?: string, hint?: string, baseImageBase64?: string | string[], targetImageBase64?: string, options?: {
        preserveSkinTones?: boolean;
        lightroomProfile?: string;
        aiFunctions?: {
            temperatureTint?: boolean;
            masks?: boolean;
            colorGrading?: boolean;
            hsl?: boolean;
            curves?: boolean;
            grain?: boolean;
            pointColor?: boolean;
        };
    }): Promise<AIColorAdjustments>;
    getModel(): string;
    isAvailable(): boolean;
    private buildToolsArray;
}
