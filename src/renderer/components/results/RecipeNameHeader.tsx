import React, { useEffect, useMemo, useState } from 'react';
import { Box, IconButton, TextField, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { ProcessingResult } from '../../../shared/types';
import { useAppStore } from '../../store/appStore';
import { useAlert } from '../../context/AlertContext';

interface RecipeNameHeaderProps {
  processId?: string;
  successfulResults: ProcessingResult[];
  selectedResult: number;
  processOptions?: any;
  displayNameOverride?: string;
}

const RecipeNameHeader: React.FC<RecipeNameHeaderProps> = ({
  processId,
  successfulResults,
  selectedResult,
  processOptions,
  displayNameOverride,
}) => {
  const { showError } = useAlert();
  const [savedName, setSavedName] = useState<string | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Load saved name directly from storage when processId changes
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!processId) {
        if (mounted) setSavedName(undefined);
        return;
      }
      try {
        const res = await window.electronAPI.getProcess(processId);
        if (mounted) {
          const name = (res?.success && res.process && (res.process as any).name) || '';
          setSavedName(typeof name === 'string' && name.trim().length > 0 ? name : undefined);
        }
      } catch {
        if (mounted) setSavedName(undefined);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [processId]);

  // (Name updates are driven via displayNameOverride to avoid global listener conflicts.)

  const computedDefaultName = useMemo(() => {
    // Do not use AI preset_name for display; fallback to generic title
    return 'Untitled Recipe';
  }, []);

  const displayedName = displayNameOverride || savedName || computedDefaultName;

  const startEditing = () => {
    setInput(displayedName || '');
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setInput('');
  };

  const save = async () => {
    if (!processId) return;
    const newName = (input || '').trim();
    if (!newName) {
      showError('Recipe name cannot be empty');
      return;
    }
    try {
      setSaving(true);
      await useAppStore.getState().updateRecipeInStorage(processId, { name: newName } as any);
      setSavedName(newName);
      setEditing(false);
    } catch (e) {
      console.error('Failed to save recipe name:', e);
      showError('Failed to save name');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ px: 3, pt: 3, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
      {editing ? (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, width: '100%' }}>
          <TextField
            size="small"
            fullWidth
            value={input}
            autoFocus
            error={!input.trim()}
            helperText={!input.trim() ? 'Recipe name is required' : ''}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (input.trim()) {
                  save();
                }
              } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEditing();
              }
            }}
            inputProps={{ maxLength: 120 }}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <IconButton
              size="small"
              aria-label="Save name"
              onClick={save}
              disabled={saving || !input.trim()}
              title="Save name"
            >
              <CheckIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              aria-label="Cancel editing"
              onClick={cancelEditing}
              disabled={saving}
              title="Cancel editing"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: 'primary.main',
              textAlign: 'left',
              mb: 1,
              fontSize: { xs: '1.5rem', sm: '2rem' },
              flex: 1,
            }}
          >
            {displayedName}
          </Typography>
          <IconButton aria-label="Edit name" title="Edit name" onClick={startEditing}>
            <EditOutlinedIcon />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

export default RecipeNameHeader;
