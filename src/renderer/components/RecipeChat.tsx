import React, { useState, useRef, useEffect } from 'react';
import { Box, Paper, TextField, Button, Typography, Avatar, IconButton, CircularProgress, Alert, Chip, Stack } from '@mui/material';
import {
    Send as SendIcon,
    SmartToy as BotIcon,
    Person as PersonIcon,
    Check as CheckIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { Recipe } from '../../shared/types';
import RecipeAdjustmentsPanel from './RecipeAdjustmentsPanel';

interface RecipeChatProps {
    recipe: Recipe;
    onRecipeModification: (modifiedRecipe: Partial<Recipe>) => void;
    onAcceptChanges: () => void;
    onRejectChanges: () => void;
}


const RecipeChat: React.FC<RecipeChatProps> = ({
    recipe,
    onRecipeModification,
    onAcceptChanges,
    onRejectChanges,
}) => {
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingModifications, setPendingModifications] = useState<Partial<Recipe> | null>(null);
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; id: string }>>([
        {
            id: 'welcome',
            role: 'assistant',
            content: `Hi! I'm your AI photo editing assistant. I can help you modify this recipe by adjusting color settings, changing the style, or updating the prompt. What would you like to change?`,
        },
    ]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e?: React.FormEvent | React.KeyboardEvent) => {
        try { (e as any)?.preventDefault?.(); } catch { }
        if (!input.trim() || isProcessing) return;

        const userMessage = input.trim();
        setInput('');
        setError(null);
        setIsProcessing(true);

        // Add user message
        const newUserMessage = {
            id: Date.now().toString(),
            role: 'user' as const,
            content: userMessage,
        };
        setMessages(prev => [...prev, newUserMessage]);

        try {
            // Call the chat API
            const response = await window.electronAPI.chatRecipe({
                messages: [...messages, newUserMessage],
                recipe,
            });

            if (response.success) {
                const displayText = response.message || response.content || '';
                const assistantMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant' as const,
                    content: displayText,
                };
                setMessages(prev => [...prev, assistantMessage]);

                // Try to parse modifications from the response
                if ((response as any).modifications) {
                    setPendingModifications((response as any).modifications as Partial<Recipe>);
                } else if (response.content) {
                    try {
                        const parsed = JSON.parse(response.content);
                        if (parsed.modifications) {
                            setPendingModifications(parsed.modifications);
                        }
                    } catch {
                        // Not a modification message, just continue
                    }
                }
            } else {
                setError(response.error || 'Failed to get response');
            }
        } catch {
            setError('Failed to send message');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAcceptModifications = () => {
        if (pendingModifications) {
            onRecipeModification(pendingModifications);
            onAcceptChanges();
            setPendingModifications(null);
        }
    };

    const handleRejectModifications = () => {
        setPendingModifications(null);
        onRejectChanges();
    };

    const formatRecipeForDisplay = (recipe: Recipe) => {
        const options = recipe.userOptions as any;
        return {
            name: recipe.name || 'Unnamed Recipe',
            prompt: recipe.prompt || 'No prompt',
            warmth: options?.warmth ?? '—',
            tint: options?.tint ?? '—',
            contrast: options?.contrast ?? '—',
            vibrance: options?.vibrance ?? '—',
            moodiness: options?.moodiness ?? '—',
            saturationBias: options?.saturationBias ?? '—',
            vibe: options?.vibe || '—',
            filmGrain: options?.filmGrain ? 'On' : 'Off',
            artistStyle: options?.artistStyle?.name || '—',
            filmStyle: options?.filmStyle?.name || '—',
        };
    };

    const recipeData = formatRecipeForDisplay(recipe);
    const latestAdjustments = (() => {
        try {
            const res = Array.isArray(recipe.results) ? recipe.results.filter(r => r && r.success) : [];
            const last = res.length > 0 ? res[res.length - 1] : undefined;
            return last?.metadata?.aiAdjustments as any | undefined;
        } catch {
            return undefined;
        }
    })();

    // Merge recipe.maskOverrides into latest adjustments for a single, effective masks view
    const effectiveAdjustments = (() => {
        const aiAdj = (latestAdjustments as any) || {};
        const overrides = (recipe as any)?.maskOverrides as any[] | undefined;
        const idOf = (m: any) =>
            m?.id ||
            (m?.name ? `name:${m.name}` : `${m?.type || 'mask'}:${m?.subCategoryId ?? ''}:${(m?.referenceX ?? '').toString().slice(0,4)}:${(m?.referenceY ?? '').toString().slice(0,4)}`);
        const indexOf = (list: any[], m: any) => list.findIndex(x => idOf(x) === idOf(m));
        let masks = Array.isArray(aiAdj.masks) ? [...aiAdj.masks] : [];
        const ops = Array.isArray(overrides) ? overrides : [];
        for (const op of ops) {
            const operation = op.op || 'add';
            if (operation === 'remove_all' || operation === 'clear') {
                masks = [];
                continue;
            }
            const idx = indexOf(masks, op);
            if (operation === 'remove') {
                if (idx >= 0) masks.splice(idx, 1);
                continue;
            }
            if (operation === 'update') {
                if (idx >= 0) {
                    const prev = masks[idx] || {};
                    masks[idx] = { ...prev, ...op, id: prev.id || op.id, adjustments: { ...(prev.adjustments || {}), ...(op.adjustments || {}) } };
                } else {
                    masks.push({ ...op, id: op.id || idOf(op) });
                }
                continue;
            }
            // default add
            if (idx >= 0) {
                const prev = masks[idx] || {};
                masks[idx] = { ...prev, ...op, id: prev.id || op.id || idOf(op), adjustments: { ...(prev.adjustments || {}), ...(op.adjustments || {}) } };
            } else {
                masks.push({ ...op, id: op.id || idOf(op) });
            }
        }
        return { ...aiAdj, masks } as any;
    })();

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>

            {/* Split View: Chat (left) + Adjustments (right) */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 1.5, minHeight: 0, flex: 1 }}>
                {/* Chat Column */}
                <Paper className="card slide-in" elevation={0} sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2, border: '1px solid #e9ecef' }}>
            <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', p: 2 }}>
                        {messages.map((message) => (
                            <Box key={message.id} sx={{ display: 'flex', mb: 2, justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, maxWidth: '80%', flexDirection: message.role === 'user' ? 'row-reverse' : 'row' }}>
                                    <Avatar sx={{ bgcolor: message.role === 'user' ? 'primary.main' : '#6c757d', width: 32, height: 32 }}>
                                        {message.role === 'user' ? <PersonIcon /> : <BotIcon />}
                                    </Avatar>
                                    <Paper sx={{ p: 2, backgroundColor: message.role === 'user' ? 'primary.main' : '#f8f9fa', color: message.role === 'user' ? 'white' : '#2c3338', borderRadius: 2, border: message.role === 'user' ? 'none' : '1px solid #e9ecef' }}>
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>
                                            {message.content}
                                        </Typography>
                                    </Paper>
                                </Box>
                            </Box>
                        ))}

                        {isProcessing && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <Avatar sx={{ bgcolor: '#6c757d', width: 32, height: 32 }}>
                                    <BotIcon />
                                </Avatar>
                                <Paper sx={{ p: 2, backgroundColor: '#f8f9fa', borderRadius: 2, border: '1px solid #e9ecef' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CircularProgress size={16} />
                                        <Typography variant="body2" sx={{ fontSize: 13, color: '#6c757d' }}>
                                            AI is thinking...
                                        </Typography>
                                    </Box>
                                </Paper>
                            </Box>
                        )}

                        <div ref={messagesEndRef} />
                    </Box>

                    {/* Footer: Actions + Input */}
                    {pendingModifications && (
                        <Box sx={{ p: 2.5, borderTop: 1, borderColor: '#e9ecef', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7' }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: '#856404' }}>
                                Suggested Changes Ready
                            </Typography>
                            <Stack direction="row" spacing={1}>
                                <Button size="small" variant="contained" color="success" startIcon={<CheckIcon />} onClick={handleAcceptModifications} sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}>
                                    Accept Changes
                                </Button>
                                <Button size="small" variant="outlined" color="error" startIcon={<CloseIcon />} onClick={handleRejectModifications} sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}>
                                    Reject Changes
                                </Button>
                            </Stack>
                        </Box>
                    )}

                    {error && (
                        <Alert severity="error" sx={{ m: 2, borderRadius: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <Box sx={{ p: 2, borderTop: 1, borderColor: '#e9ecef' }}>
                        <form onSubmit={handleSendMessage}>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <TextField
                                    fullWidth
                                    multiline
                                    maxRows={4}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            if (input.trim() && !isProcessing) {
                                                handleSendMessage(e);
                                            }
                                        }
                                    }}
                                    placeholder="Ask me to modify your recipe... (e.g., 'Make it warmer and more cinematic')"
                                    disabled={isProcessing}
                                    size="small"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: 13 } }}
                                />
                                <IconButton type="submit" disabled={!input.trim() || isProcessing} color="primary" sx={{ alignSelf: 'flex-end', backgroundColor: 'primary.main', color: 'white', '&:hover': { backgroundColor: 'primary.dark' }, '&:disabled': { backgroundColor: '#e9ecef', color: '#6c757d' } }}>
                                    {isProcessing ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                                </IconButton>
                            </Box>
                        </form>
                    </Box>
                </Paper>

                {/* Adjustments Column */}
          <Paper className="card slide-in" elevation={0} sx={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', borderRadius: 2, border: '1px solid #e9ecef', p: 2, gap: 2, minHeight: 0 }}>
                    <RecipeAdjustmentsPanel recipe={recipe} pendingModifications={pendingModifications as any} aiAdjustments={latestAdjustments as any} />
                </Paper>
            </Box>
        </Box>
    );
};

export default RecipeChat;
