import {
    SmartToy as BotIcon,
    Check as CheckIcon,
    Close as CloseIcon,
    Person as PersonIcon,
    Send as SendIcon,
} from '@mui/icons-material';
import { Alert, Avatar, Box, Button, CircularProgress, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import { applyMaskOverrides } from '../../shared/mask-utils';
import { Recipe } from '../../shared/types';
import { useChatModifications } from '../hooks/useChatModifications';
import { RecipeAdjustmentsPanel } from './RecipeAdjustmentsPanel';

interface RecipeChatProps {
    recipe: Recipe;
    isReprocessing?: boolean;
    onRecipeModification: (modifiedRecipe: Partial<Recipe>) => Promise<void>;
    onAcceptChanges: () => Promise<void>;
    onRejectChanges: () => void;
    onPendingModifications?: (modifications: any) => void;
}


const RecipeChat: React.FC<RecipeChatProps> = ({
    recipe,
    isReprocessing,
    onRecipeModification,
    onAcceptChanges,
    onRejectChanges,
    onPendingModifications,
}) => {
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; id: string }>>([
        {
            id: 'welcome',
            role: 'assistant',
            content: `Hi! I'm your AI photo editing assistant. I can help you modify this recipe by adjusting color settings, changing the style, or updating the prompt. What would you like to change?`,
        },
    ]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Use the new chat modifications hook
    const {
        pendingModifications,
        isApplying,
        error: modificationError,
        setPendingModifications,
        handleAcceptModifications,
        handleRejectModifications,
        handleProcessUpdate,
    } = useChatModifications({
        processId: recipe.id,
        onRecipeModification,
        onAcceptChanges,
        onRejectChanges,
    });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Initialize pending mods from recipe if provided (from storage)
    useEffect(() => {
        const pend: any = (recipe as any)?.pendingModifications;
        if (pend && typeof pend === 'object') {
            setPendingModifications(pend);
        }
    }, [recipe, setPendingModifications]);

    // Listen to process updates for pending modifications
    useEffect(() => {
        try { 
            window.electronAPI.onProcessUpdated?.(handleProcessUpdate); 
        } catch { /* ignore */ }
        return () => {
            window.electronAPI.removeAllListeners('process-updated'); 
        };
    }, [handleProcessUpdate]);

    const handleSendMessage = async (e?: React.FormEvent | React.KeyboardEvent) => {
        (e as any)?.preventDefault?.();
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
            // Chat functionality removed - this component is no longer used
            const response = { success: false, error: 'Chat functionality has been removed' };

            if (response.success) {
                const displayText = (response as any).message || '';
                const assistantMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant' as const,
                    content: displayText,
                };
                setMessages(prev => [...prev, assistantMessage]);

                // Try to parse modifications from the response
                if ((response as any).modifications) {
                    setPendingModifications((response as any).modifications as Partial<Recipe>);
                    
                    // Notify parent component about pending modifications
                    if (onPendingModifications) {
                        onPendingModifications((response as any).modifications);
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



    const latestAdjustments = (() => {
        try {
            const res = recipe.results?.filter(r => r && r.success) || [];
            const last = res.length > 0 ? res[res.length - 1] : undefined;
            return last?.metadata?.aiAdjustments as any | undefined;
        } catch {
            return undefined;
        }
    })();

    // Merge recipe.maskOverrides into latest adjustments for a single, effective masks view
    const effectiveAdjustments = (() => {
        const aiAdj = (latestAdjustments as any) || {};
        const acceptedOverrides = (recipe as any)?.maskOverrides as any[] | undefined;
        const pendingOverrides = (pendingModifications as any)?.maskOverrides as any[] | undefined;
        // Apply accepted overrides, then pending overrides on top for preview
        const afterAccepted = applyMaskOverrides(aiAdj.masks as any[], acceptedOverrides as any[]);
        const masks = applyMaskOverrides(afterAccepted as any[], pendingOverrides as any[]);
        const out = { ...aiAdj, masks } as any;
        // Apply any global adjustment overrides (e.g. grain, vignette) stored on recipe
        const globalOverrides = (recipe as any)?.aiAdjustmentOverrides;
        if (globalOverrides && typeof globalOverrides === 'object') {
            Object.assign(out, globalOverrides);
        }
        return out;
    })();

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>

            {/* Split View: Chat (left) + Adjustments (right) */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 1.5, minHeight: 0, flex: 1 }}>
                {/* Chat Column */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>

                    <Paper className="card slide-in" elevation={0} sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2, border: '1px solid #e9ecef', backgroundColor: 'white' }}>
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

                            {(isProcessing || isReprocessing || isApplying) && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                    <Avatar sx={{ bgcolor: '#6c757d', width: 32, height: 32 }}>
                                        <BotIcon />
                                    </Avatar>
                                    <Paper sx={{ p: 2, backgroundColor: '#f8f9fa', borderRadius: 2, border: '1px solid #e9ecef' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <CircularProgress size={16} />
                                            <Typography variant="body2" sx={{ fontSize: 13, color: '#6c757d' }}>
                                                {isReprocessing ? 'Applying changes with AI…' : isApplying ? 'Applying changes...' : 'AI is thinking...'}
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

                        {(error || modificationError) && (
                            <Alert severity="error" sx={{ m: 2, borderRadius: 2 }}>
                                {error || modificationError}
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
                                                if (input.trim() && !isProcessing && !isReprocessing) {
                                                    handleSendMessage(e);
                                                }
                                            }
                                        }}
                                        placeholder="Ask me to modify your recipe... (e.g., 'Make it warmer and more cinematic')"
                                        disabled={isProcessing || !!isReprocessing || isApplying}
                                        size="small"
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: 13 } }}
                                    />
                                    <IconButton type="submit" disabled={!input.trim() || isProcessing || !!isReprocessing || isApplying} color="primary" sx={{ alignSelf: 'flex-end', backgroundColor: 'primary.main', color: 'white', '&:hover': { backgroundColor: 'primary.dark' }, '&:disabled': { backgroundColor: '#e9ecef', color: '#6c757d' } }}>
                                        {isProcessing ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                                    </IconButton>
                                </Box>
                            </form>
                        </Box>
                    </Paper>
                </Box>

                {/* Adjustments Column */}
                <Paper className="card slide-in" elevation={0} sx={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', borderRadius: 2, border: '1px solid #e9ecef', p: 2, gap: 2, minHeight: 0 }}>
                    {(() => {
                        const cleanRecipe = { ...recipe } as any;
                        // Avoid duplicate mask sections by not passing overrides to the panel (we already merged them)
                        if ('maskOverrides' in cleanRecipe) delete cleanRecipe.maskOverrides;
                        return (
                            <RecipeAdjustmentsPanel
                                recipe={cleanRecipe}
                                pendingModifications={pendingModifications as any}
                                aiAdjustments={effectiveAdjustments as any}
                            />
                        );
                    })()}
                </Paper>
            </Box>
        </Box>
    );
};

export default RecipeChat;
