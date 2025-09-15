import { DeleteOutline, RestartAlt, Save as SaveIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  content: string;
  warningText?: string;
  confirmButtonText: string;
  confirmColor?: 'warning' | 'error' | 'primary';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  content,
  warningText,
  confirmButtonText,
  confirmColor = 'warning'
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: { sx: { WebkitAppRegion: 'no-drag' } },
        backdrop: { sx: { WebkitAppRegion: 'no-drag' } },
      }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {content}
        </DialogContentText>
        {warningText && (
          <DialogContentText sx={{ mt: 2, fontWeight: 600, color: 'warning.main' }}>
            {warningText}
          </DialogContentText>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={onConfirm} color={confirmColor} variant="contained">
          {confirmButtonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const Settings: React.FC = () => {
  const { resetApp } = useAppStore();
  const [openaiKey, setOpenaiKey] = useState('');
  const [masked, setMasked] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await window.electronAPI.getSettings();
        if (res.success && res.settings) {
          if (res.settings.openaiKey) {
            setOpenaiKey('');
            setMasked(true);
          }
        }
      } catch {
        setStatus({ type: 'error', msg: 'Failed to load settings' });
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setStatus(null);
    try {
      const res = await window.electronAPI.saveSettings({
        openaiKey: openaiKey.trim() || undefined,
      });
      if (res.success) {
        setMasked(!!openaiKey);
        setOpenaiKey('');
        setShowKey(false);
        setStatus({ type: 'success', msg: 'Settings saved' });
      } else {
        setStatus({ type: 'error', msg: res.error || 'Failed to save settings' });
      }
    } catch {
      setStatus({ type: 'error', msg: 'Failed to save settings' });
    }
  };

  const handleClear = async () => {
    setStatus(null);
    try {
      const res = await window.electronAPI.saveSettings({ openaiKey: '' });
      if (res.success) {
        setMasked(false);
        setOpenaiKey('');
        setShowKey(false);
        setStatus({ type: 'success', msg: 'OpenAI key cleared' });
      } else {
        setStatus({ type: 'error', msg: res.error || 'Failed to clear key' });
      }
    } catch {
      setStatus({ type: 'error', msg: 'Failed to clear key' });
    }
  };

  const handleResetSetup = async () => {
    setResetDialogOpen(false);
    setStatus(null);
    try {
      setStatus({ type: 'success', msg: 'Setup reset and all recipes deleted - refreshing app...' });
      // Close settings after a brief delay, before the app refreshes
      setTimeout(() => {
        window.dispatchEvent(new Event('close-settings'));
      }, 1000);
      await resetApp();
    } catch (error) {
      console.error('Reset setup error:', error);
      setStatus({ type: 'error', msg: 'Failed to reset setup' });
    }
  };


  return (
    <Container maxWidth="sm" sx={{ py: 2 }} className="no-drag">
      <Typography variant="h5" fontWeight={700} gutterBottom>
        LLM Settings
      </Typography>
      <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              OpenAI API Key
            </Typography>
            {masked && (
              <Typography variant="caption" color="text.secondary">
                A key is saved. Enter a new one to replace.
              </Typography>
            )}
            <TextField
              id="openai-key"
              type={showKey ? 'text' : 'password'}
              fullWidth
              size="small"
              placeholder={masked ? '••••••••••••••••' : 'sk-...'}
              value={openaiKey}
              onChange={e => setOpenaiKey(e.target.value)}
              className="no-drag"
              inputProps={{ className: 'no-drag', style: { WebkitAppRegion: 'no-drag' } }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showKey ? 'Hide key' : 'Show key'}
                      onClick={() => setShowKey(s => !s)}
                      edge="end"
                      size="small"
                      className="no-drag"
                      sx={{ WebkitAppRegion: 'no-drag' }}
                    >
                      {showKey ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mt: 0.5 }}
            />
          </Box>
          {status && (
            <Alert severity={status.type} variant="outlined">
              {status.msg}
            </Alert>
          )}
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              startIcon={<SaveIcon />}
            >
              Save
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={handleClear}
              startIcon={<DeleteOutline />}
            >
              Clear
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        Your key is stored locally on this device in app data and used for AI color analysis. You
        can remove it anytime.
      </Typography>

      <Paper elevation={1} sx={{ p: 2, borderRadius: 2, mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
          Reset Application
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Reset the application to its initial state. This will clear all recipes and show the setup wizard again.
        </Typography>
        <Button
          variant="outlined"
          color="warning"
          onClick={() => setResetDialogOpen(true)}
          startIcon={<RestartAlt />}
          sx={{ fontWeight: 600 }}
        >
          Reset Setup & Clear All Recipes
        </Button>
      </Paper>

      <ConfirmDialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        onConfirm={handleResetSetup}
        title="Reset Application?"
        content="This action will permanently delete all your recipes and reset the application to its initial state. The setup wizard will appear when you restart the application."
        warningText="This action cannot be undone."
        confirmButtonText="Reset Application"
        confirmColor="warning"
      />
    </Container>
  );
};

export default Settings;
