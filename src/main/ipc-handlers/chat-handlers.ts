import { openai } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { BrowserWindow, ipcMain } from 'electron';
import { z } from 'zod';
import { getCoreSystemPrompt, getMaskOperationInstructions, getParameterInstructions } from '../../services/ai-prompt-shared';
import { maskEditSchema } from '../../services/ai-shared';
import { logError } from '../../shared/error-utils';
import { maskIdentifier } from '../../shared/mask-utils';
import { SettingsService } from '../settings-service';
import { StorageService } from '../storage-service';

export class ChatHandlers {
    private settingsService = new SettingsService();
    private storageService = new StorageService();

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

                // Re-introduce separate tools and keep legacy combined tool; we'll aggregate and persist
                const tools = {
                    set_user_options: tool({
                        description: 'Update only user-facing options (contrast, vibrance, vibe, styles).',
                        inputSchema: z.object({
                            message: z.string().optional(),
                            userOptions: z.object({
                                contrast: z.number().min(-100).max(100).optional(),
                                vibrance: z.number().min(-100).max(100).optional(),
                                saturationBias: z.number().min(-100).max(100).optional(),
                                vibe: z.string().optional(),
                                styleCategories: z.array(z.string()).optional(),
                                artistStyle: z.object({ key: z.string(), name: z.string(), category: z.string(), blurb: z.string() }).optional(),
                                filmStyle: z.object({ key: z.string(), name: z.string(), category: z.string(), blurb: z.string() }).optional(),
                            })
                        }),
                        execute: async (input) => input,
                    }),
                    set_ai_adjustments: tool({
                        description: 'Update only AI adjustment overrides like grain_* and vignette_*.',
                        inputSchema: z.object({
                            message: z.string().optional(),
                            aiAdjustments: z.object({
                                grain_amount: z.number().min(0).max(100).optional(),
                                grain_size: z.number().min(0).max(100).optional(),
                                grain_frequency: z.number().min(0).max(100).optional(),
                                vignette_amount: z.number().min(-100).max(100).optional(),
                                vignette_midpoint: z.number().min(0).max(100).optional(),
                                vignette_feather: z.number().min(0).max(100).optional(),
                                vignette_roundness: z.number().min(-100).max(100).optional(),
                                vignette_style: z.number().min(0).max(2).optional(),
                                vignette_highlight_contrast: z.number().min(0).max(100).optional(),
                            })
                        }),
                        execute: async (input) => input,
                    }),
                    update_prompt_and_description: tool({
                        description: 'Update the prompt and/or description text.',
                        inputSchema: z.object({
                            message: z.string().optional(),
                            prompt: z.string().optional(),
                            description: z.string().optional(),
                        }),
                        execute: async (input) => input,
                    }),
                    edit_masks: tool({
                        description: 'Edit mask overrides: add, update, remove, or clear.',
                        inputSchema: z.object({
                            message: z.string().optional(),
                            maskOverrides: z.array(maskEditSchema),
                        }),
                        execute: async (input) => input,
                    }),
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

                // Create system message with recipe context using shared prompt
                const basePrompt = getCoreSystemPrompt({
                    includeMaskTypes: false,
                    includeTechniques: false,
                    includeRequirements: false
                });

                const systemMessage = `${basePrompt}

RECIPE CONTEXT:
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

TOOL USAGE (STRICT):
- Always call at least one tool; prefer specific tools for targeted changes.
- You may call multiple tools in one response. If you use modify_recipe, call it once.
- Do not answer with plain text only.

${getMaskOperationInstructions()}

${getParameterInstructions()}`;

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
                    toolChoice: 'required',
                    temperature: 0.7,
                });
                // try {
                // } catch { /* ignore */ }

                // Extract structured result from tool calls and also prepare human-friendly chat text
                let contentText = result.text || '';
                let messageText: string | undefined;
                let modifications: any = {};

                if (result.toolResults && result.toolResults.length > 0) {
                    let masks: any[] | undefined;
                    for (const toolResult of result.toolResults) {
                        const name = toolResult.toolName;
                        const output: any = toolResult.output;
                        if (!name || !output) continue;
                        if (typeof output.message === 'string') messageText = output.message;

                        if (name === 'set_user_options' && output.userOptions) {
                            modifications.userOptions = { ...(modifications.userOptions || {}), ...output.userOptions };
                        } else if (name === 'set_ai_adjustments' && output.aiAdjustments) {
                            modifications.aiAdjustments = { ...(modifications.aiAdjustments || {}), ...output.aiAdjustments };
                        } else if (name === 'update_prompt_and_description') {
                            if (typeof output.prompt === 'string') modifications.prompt = output.prompt;
                            if (typeof output.description === 'string') modifications.description = output.description;
                        } else if (name === 'edit_masks' && Array.isArray(output.maskOverrides)) {
                            masks = output.maskOverrides;
                        } else if (name === 'modify_recipe' && output.modifications) {
                            const mod = output.modifications || {};
                            if (mod.userOptions) modifications.userOptions = { ...(modifications.userOptions || {}), ...mod.userOptions };
                            if (mod.aiAdjustments) modifications.aiAdjustments = { ...(modifications.aiAdjustments || {}), ...mod.aiAdjustments };
                            if (mod.prompt) modifications.prompt = mod.prompt;
                            if (mod.description) modifications.description = mod.description;
                            if (Array.isArray(mod.maskOverrides)) masks = mod.maskOverrides;
                        }
                    }
                    if (masks) modifications.maskOverrides = masks;
                }


                // Persist pending modifications to storage so UI can display and approve
                try {
                    if (modifications && recipe?.id) {
                        const stamp = new Date().toISOString();
                        await this.storageService.updateProcess(recipe.id, { pendingModifications: modifications, pendingModificationsUpdatedAt: stamp } as any);
                        // Broadcast update so any open views can refresh
                        try {
                            const payload = { processId: recipe.id, updates: { pendingModifications: modifications, pendingModificationsUpdatedAt: stamp } };
                            for (const win of BrowserWindow.getAllWindows()) {
                                win.webContents.send('process-updated', payload);
                            }
                        } catch { /* ignore */ }
                    }
                } catch (e) {
                    console.warn('[IPC] chat-recipe: failed to persist pending modifications', e);
                }

                return {
                    success: true,
                    message: messageText || contentText,
                    modifications,
                };
            } catch (error) {
                logError('IPC', 'Error in chat-recipe', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        });
    }
}
