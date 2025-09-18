import { AIColorAdjustments } from './types';
export interface StreamingUpdate {
    type: 'thinking' | 'analysis' | 'tool_call' | 'progress' | 'complete' | 'step_progress' | 'step_transition';
    content: string;
    step?: string;
    progress?: number;
    toolName?: string;
    toolArgs?: any;
}
export interface StreamingOptions {
    onUpdate?: (update: StreamingUpdate) => void;
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
}
export declare class AIStreamingService {
    private apiKey;
    private model;
    constructor(apiKey: string, model?: string);
    analyzeColorMatchWithStreaming(baseImageBase64?: string | string[], targetImageBase64?: string, hint?: string, options?: StreamingOptions): Promise<AIColorAdjustments>;
    private buildUserContent;
    private getSystemPrompt;
    private createTools;
    private parseResultFromText;
    private createDefaultAdjustments;
    private getToolDescription;
}
