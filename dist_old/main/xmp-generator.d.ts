import type { AIColorAdjustments } from '../services/types';
export declare function getExampleBWMixer(): Pick<AIColorAdjustments, 'gray_red' | 'gray_orange' | 'gray_yellow' | 'gray_green' | 'gray_aqua' | 'gray_blue' | 'gray_purple' | 'gray_magenta'>;
export declare function generateXMPContent(aiAdjustments: AIColorAdjustments, include: any, preserveSkinTones?: boolean): string;
