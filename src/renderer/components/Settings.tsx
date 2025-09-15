import { DeleteOutline, Save as SaveIcon, Visibility, VisibilityOff, Upload, FolderOpen } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';

const Settings: React.FC = () => {
  const [openaiKey, setOpenaiKey] = useState('');
  const [masked, setMasked] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [profileExport, setProfileExport] = useState<{ ok: boolean; msg: string; path?: string } | null>(null);

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

  const handleExportProfile = async () => {
    setProfileExport(null);
    try {
      const files = await window.electronAPI.selectFiles({
        title: 'Select Lightroom Profile (.xmp)',
        filters: [{ name: 'XMP Profiles', extensions: ['xmp'] }],
        properties: ['openFile'],
      });
      if (!files || files.length === 0) return;
      const source = files[0];
      const res = await window.electronAPI.exportProfile({ sourceXmpPath: source });
      if (res?.success) {
        setProfileExport({ ok: true, msg: 'Profile exported', path: res.outputPath });
      } else {
        setProfileExport({ ok: false, msg: res?.error || 'Profile export failed' });
      }
    } catch (e) {
      setProfileExport({ ok: false, msg: e instanceof Error ? e.message : 'Profile export failed' });
    }
  };

  const handleOpenExport = async () => {
    if (profileExport?.path) {
      await window.electronAPI.openPath(profileExport.path);
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

      <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mt: 3 }}>
        Profiles
      </Typography>
      <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Export an existing Lightroom/Camera Raw Profile (.xmp) into the app’s profiles folder for easy access.
          </Typography>
          {profileExport && (
            <Alert severity={profileExport.ok ? 'success' : 'error'} variant="outlined">
              {profileExport.msg}
            </Alert>
          )}
          <Stack direction="row" spacing={1}>
            <Button variant="contained" startIcon={<Upload />} onClick={handleExportProfile}>
              Export Profile (.xmp)
            </Button>
            {profileExport?.ok && profileExport.path && (
              <Button variant="outlined" startIcon={<FolderOpen />} onClick={handleOpenExport}>
                Show in Finder
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
};

export default Settings;
