import { openai } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { ipcMain } from 'electron';
import { z } from 'zod';
import { getDefaultAIFunctionToggles, maskEditSchemaChat } from '../../services/ai-shared';
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
                                    // Kelvin selection (2000..50000). Use this instead of warmth.
                                    temperatureK: z.number().min(2000).max(50000).optional(),
                                    tint: z.number().min(-100).max(100).optional(),
                                    contrast: z.number().min(-100).max(100).optional(),
                                    vibrance: z.number().min(-100).max(100).optional(),
                                    saturationBias: z.number().min(-100).max(100).optional(),
                                    filmGrain: z.boolean().optional(),
                                    vibe: z.string().optional(),
                                    aiFunctions: z.object(Object.fromEntries(Object.keys(getDefaultAIFunctionToggles()).map(k => [k, z.boolean().optional()]))).optional(),
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
                                prompt: z.string().optional(),
                                name: z.string().optional(),
                                description: z.string().optional(),
                                // Mask edits allow adding/updating/removing masks to be applied in next generation
                                masks: z.array(maskEditSchema).optional(),
                            })
                        }),
                        execute: async (input) => input, // Placeholder - AI will call this
                    })
                };

                // Create system message with recipe context
                const systemMessage = `You are a professional photo editing assistant specializing in color grading and film recipe creation. 

The user has a recipe with the following details:
- Recipe ID: ${recipe.id}
- Name: ${recipe.name || 'Unnamed Recipe'}
- Prompt: ${recipe.prompt || 'No prompt provided'}
- User Options: ${JSON.stringify(recipe.userOptions, null, 2)}
- Results: ${JSON.stringify(recipe.results, null, 2)}

 You can help modify this recipe by suggesting changes to:
 1. User options (temperatureK, tint, contrast, vibrance, saturationBias, filmGrain, vibe, artistStyle, filmStyle, aiFunctions, masks, colorGrading, hsl, curves, grain, pointColor)
 2. The prompt text
 3. Recipe name
 4. Recipe description (short human-friendly summary)

CRITICAL RESPONSE FORMAT:
 - When suggesting changes, CALL modify_recipe exactly once with fields:
  - message: a concise summary of the changes and why
  - modifications: { userOptions?, prompt?, name?, description?, masks? }
  This function result will be used by the UI to apply changes.
  Do not emit raw JSON outside of the tool; keep your chat explanation separate.
\n+Mask editing guidance:\n+- Prefer including a stable id for any mask you add; reuse that id when updating or removing.\n+- If id is omitted, removal/update will match by name when present, otherwise by type + subCategoryId + referenceX/referenceY.\n+- To clear all pending mask overrides, use op: 'remove_all' or 'clear' with no other fields.

Available user options:
- temperatureK: 2000 to 50000 (Kelvin). Use this when the user specifies a value like "7500K". Prefer temperatureK and do not use 'warmth'.
- tint: -100 to 100 (tint adjustment) 
- contrast: -100 to 100 (contrast adjustment)
- vibrance: -100 to 100 (vibrance adjustment)
- saturationBias: -100 to 100 (saturation bias)
 - filmGrain: true/false (enable film grain)
- vibe: string (vibe description)
- artistStyle: object with key, name, category, blurb
- filmStyle: object with key, name, category, blurb`;

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
                    model: openai('gpt-4o'),
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
