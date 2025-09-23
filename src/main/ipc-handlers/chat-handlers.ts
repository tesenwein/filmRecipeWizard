import { openai } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { ipcMain } from 'electron';
import { z } from 'zod';
import { maskEditSchemaChat } from '../../services/ai-shared';
import { maskIdentifier } from '../../shared/mask-utils';
import { SettingsService } from '../settings-service';

export class ChatHandlers {
    private settingsService = new SettingsService();

    constructor() { }

    setupHandlers(): void {
        // Handle chat messages for recipe modification
        ipcMain.handle('chat-recipe', async (_event, data: {
            messages: Array<{ role: string; content: string }>;
            recipe: any;
        }) => {
            try {
                const { messages, recipe } = data;

                // Resolve OpenAI API key via app settings for consistency with AIStreamingService
                const settings = await this.settingsService.loadSettings();
                const apiKey = settings.openaiKey || process.env.OPENAI_API_KEY;
                if (!apiKey) throw new Error('OpenAI API key not configured');

                // Create tools for recipe modification
                // Reuse mask structure similar to AIStreamingService for consistency
                const maskEditSchema = maskEditSchemaChat;

                const tools = {
                    modify_recipe: tool({
                        description: 'Modify recipe parameters based on user request',
                        inputSchema: z.object({
                            message: z.string().describe('Explanation of the changes made'),
                            modifications: z.object({
                                userOptions: z.object({
                                    contrast: z.number().min(-100).max(100).optional(),
                                    vibrance: z.number().min(-100).max(100).optional(),
                                    saturationBias: z.number().min(-100).max(100).optional(),
                                    vibe: z.string().optional(),
                                    artistStyle: z.object({
                                        key: z.string(),
                                        name: z.string(),
                                        category: z.string(),
                                        blurb: z.string()
                                    }).optional(),
                                    filmStyle: z.object({
                                        key: z.string(),
                                        name: z.string(),
                                        category: z.string(),
                                        blurb: z.string()
                                    }).optional(),
                                }).optional(),
                                aiAdjustments: z.object({
                                    // Film grain adjustments
                                    grain_amount: z.number().min(0).max(100).optional(),
                                    grain_size: z.number().min(0).max(100).optional(),
                                    grain_frequency: z.number().min(0).max(100).optional(),
                                    // Vignette adjustments
                                    vignette_amount: z.number().min(-100).max(100).optional(),
                                    vignette_midpoint: z.number().min(0).max(100).optional(),
                                    vignette_feather: z.number().min(0).max(100).optional(),
                                    vignette_roundness: z.number().min(-100).max(100).optional(),
                                    vignette_style: z.number().min(0).max(2).optional(),
                                    vignette_highlight_contrast: z.number().min(0).max(100).optional(),
                                }).optional(),
                                prompt: z.string().optional(),
                                description: z.string().optional(),
                                // Mask edits allow adding/updating/removing masks to be applied in next generation
                                maskOverrides: z.array(maskEditSchema).optional(),
                            })
                        }),
                        execute: async (input) => input, // Placeholder - AI will call this
                    })
                };

                // Extract current masks from the latest result
                const currentMasks = (() => {
                    try {
                        const results = recipe.results?.filter((r: any) => r && r.success) || [];
                        const lastResult = results.length > 0 ? results[results.length - 1] : null;
                        const aiAdjustments = lastResult?.metadata?.aiAdjustments;
                        return aiAdjustments?.masks || [];
                    } catch {
                        return [];
                    }
                })();

                // Extract existing mask overrides
                const existingOverrides = (recipe as any).maskOverrides || [];

                // Create system message with recipe context
                const systemMessage = `You are a photo editing assistant. Help modify this recipe:

Recipe: ${recipe.name || 'Unnamed'} (ID: ${recipe.id})
Prompt: ${recipe.prompt || 'No prompt provided'}
Options: ${JSON.stringify(recipe.userOptions, null, 2)}

CURRENT MASKS:
${currentMasks.length > 0 ? currentMasks.map((mask: any, idx: number) => {
    const id = maskIdentifier(mask);
    return `- Mask ${idx + 1}: ${mask.name || 'Unnamed'} (Type: ${mask.type}, ID: ${id})`;
}).join('\n') : 'No masks currently applied'}

EXISTING MASK OVERRIDES:
${existingOverrides.length > 0 ? existingOverrides.map((override: any, idx: number) => {
    const id = maskIdentifier(override);
    return `- Override ${idx + 1}: ${override.op || 'add'} (ID: ${id})`;
}).join('\n') : 'No mask overrides'}

You can modify:
- User options: contrast, vibrance, saturationBias, artistStyle, filmStyle
- AI adjustments: grain_*, vignette_*
- Prompt text and description
- Masks: add, update, remove, or remove_all

RESPONSE FORMAT:
Call modify_recipe once with:
- message: summary of changes
- modifications: { userOptions?, aiAdjustments?, prompt?, description?, maskOverrides? }

MASK OPERATIONS:
- To delete a specific mask: { id: "mask_id", op: "remove" }
- To delete all masks: { op: "remove_all" }
- To add a new mask: { op: "add", type: "face_skin", name: "Skin", adjustments: {...} }
- To update a mask: { id: "mask_id", op: "update", adjustments: {...} }

Key parameters:
- contrast/vibrance/saturationBias: -100 to 100
- Soft params (0-100): moodiness, warmth, drama, softness, intensity, vintage, cinematic, faded
- Grain: amount/size/frequency (0-100)
- Vignette: amount (-100 to 100), midpoint/feather/roundness (0-100)`;

                // Prepare messages for OpenAI
                const openaiMessages = [
                    { role: 'system' as const, content: systemMessage },
                    ...messages.map(msg => ({
                        role: msg.role as 'user' | 'assistant',
                        content: msg.content
                    }))
                ];

                // Set API key and generate response using AI SDK v5 (consistent with AIStreamingService)
                process.env.OPENAI_API_KEY = apiKey;
                const result = await generateText({
                    model: openai('gpt-5'),
                    messages: openaiMessages,
                    tools,
                    temperature: 0.7,
                });

                // Extract structured result from tool calls and also prepare human-friendly chat text
                let contentText = result.text || '';
                let messageText: string | undefined;
                let modifications: any | undefined;

                if (result.toolResults && result.toolResults.length > 0) {
                    for (const toolResult of result.toolResults) {
                        if (toolResult.toolName === 'modify_recipe' && toolResult.output) {
                            const output: any = toolResult.output;
                            messageText = typeof output.message === 'string' ? output.message : undefined;
                            modifications = output.modifications;
                            break;
                        }
                    }
                }

                return {
                    success: true,
                    message: messageText || contentText,
                    modifications,
                };
            } catch (error) {
                console.error('[IPC] Error in chat-recipe:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        });
    }
}
