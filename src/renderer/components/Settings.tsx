import {
  DeleteOutline,
  RestartAlt,
  Save as SaveIcon,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
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
import { useAppStore } from '../store/appStore';
import ConfirmDialog from './ConfirmDialog';
import ProfileEdit, { ProfileData } from './ProfileEdit';

const Settings: React.FC = () => {
  const { resetApp } = useAppStore();
  const [openaiKey, setOpenaiKey] = useState('');
  const [masked, setMasked] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState<boolean>(false);
  // Profile state
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    website: '',
    instagram: '',
  });
  const [isProfileValid, setIsProfileValid] = useState(true);
  const [storageLocation, setStorageLocation] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await window.electronAPI.getSettings();
        if (res.success && res.settings) {
          if (res.settings.openaiKey) {
            setOpenaiKey('');
            setMasked(true);
          }
          setSetupCompleted(!!res.settings.setupCompleted);
          setStorageLocation(res.settings.storageLocation || '');
          const u = (res.settings as any).userProfile || {};
          setProfileData({
            firstName: u.firstName || '',
            lastName: u.lastName || '',
            email: u.email || '',
            website: u.website || '',
            instagram: u.instagram || '',
          });
        }
      } catch {
        setStatus({ type: 'error', msg: 'Failed to load settings' });
      }
    };
    load();
  }, []);

  const testOpenAIKey = async (key: string): Promise<boolean> => {
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        setStatus({ type: 'error', msg: 'Invalid API key. Please check your key and try again.' });
        return false;
      } else if (response.status === 429) {
        setStatus({
          type: 'error',
          msg: 'Rate limit exceeded. Your key is valid but quota may be exhausted.',
        });
        return true; // Key is valid even if rate limited
      } else if (!response.ok) {
        setStatus({
          type: 'error',
          msg: 'Unable to verify API key. Please check your internet connection.',
        });
        return false;
      }

      return true;
    } catch {
      setStatus({ type: 'error', msg: 'Network error. Please check your internet connection.' });
      return false;
    }
  };

  const normalizeUrl = (value: string): string | null => {
    if (!value) return '';
    const v = value.trim();
    const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      return new URL(withScheme).toString();
    } catch {
      return null;
    }
  };
  
  const normalizeInstagram = (value: string): { ok: boolean; handle?: string; url?: string } => {
    const v = value.trim();
    if (!v) return { ok: true };
    try {
      const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
      if (/instagram\.com$/i.test(u.hostname)) {
        const h = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean)[0] || '';
        if (/^[A-Za-z0-9._]{1,30}$/.test(h))
          return { ok: true, handle: `@${h}`, url: `https://www.instagram.com/${h}` };
      }
    } catch {
      // Ignore URL parsing errors
    }
    if (!v.startsWith('@')) return { ok: false };
    const handle = v.replace(/^@/, '');
    if (/^[A-Za-z0-9._]{1,30}$/.test(handle))
      return { ok: true, handle: `@${handle}`, url: `https://www.instagram.com/${handle}` };
    return { ok: false };
  };

  const handleSelectStorageFolder = async () => {
    try {
      const result = await window.electronAPI.selectStorageFolder();
      if (result?.success && result.path) {
        setStorageLocation(result.path);
      }
    } catch (error) {
      console.error('Failed to select storage folder:', error);
      setStatus({ type: 'error', msg: 'Failed to select storage folder' });
    }
  };

  const handleSave = async () => {
    setStatus(null);
    setIsValidating(true);

    try {
      // If API key is provided, validate it first
      if (openaiKey.trim()) {
        const isValid = await testOpenAIKey(openaiKey.trim());
        if (!isValid) {
          return; // Error message already set by testOpenAIKey
        }
      }

      // Check profile validity
      if (!isProfileValid) {
        return;
      }
      
      const nWebsite = normalizeUrl(profileData.website);
      const ig = normalizeInstagram(profileData.instagram);

      const res = await window.electronAPI.saveSettings({
        openaiKey: openaiKey.trim() || undefined,
        storageLocation: storageLocation.trim() || undefined,
        userProfile: {
          firstName: profileData.firstName.trim(),
          lastName: profileData.lastName.trim(),
          email: profileData.email.trim() ? profileData.email.trim() : undefined,
          website: nWebsite || undefined,
          instagram: ig.handle || undefined,
        },
      } as any);
      if (res.success) {
        setMasked(!!openaiKey);
        setOpenaiKey('');
        setShowKey(false);
        setStatus({ type: 'success', msg: 'Settings saved successfully' });
      } else {
        setStatus({ type: 'error', msg: res.error || 'Failed to save settings' });
      }
    } catch {
      setStatus({ type: 'error', msg: 'Failed to save settings' });
    } finally {
      setIsValidating(false);
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
      setStatus({
        type: 'success',
        msg: 'Setup reset and all recipes deleted - refreshing app...',
      });
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
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              color="error"
              onClick={handleClear}
              startIcon={<DeleteOutline />}
            >
              Clear API Key
            </Button>
          </Stack>
          {!setupCompleted && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={async () => {
                  try {
                    await window.electronAPI.updateSettings({ setupCompleted: true });
                    setSetupCompleted(true);
                    // Navigate to create page after completing setup
                    setTimeout(() => (window.location.hash = '#/create'), 150);
                  } catch {
                    setStatus({ type: 'error', msg: 'Failed to complete setup' });
                  }
                }}
              >
                Complete Setup
              </Button>
            </Box>
          )}
        </Stack>
      </Paper>

      <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>
        Your Profile
      </Typography>
      <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
        <Stack spacing={1.5}>
          <ProfileEdit
            initialData={profileData}
            onChange={({ isValid, ...data }) => {
              setProfileData(data);
              setIsProfileValid(isValid);
            }}
            layout="stack"
          />
          <Typography variant="caption" color="text.secondary">
            These details are stored locally, attached to new recipes, and included in exports.
          </Typography>
        </Stack>
      </Paper>

      <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>
        Storage Location
      </Typography>
      <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
        <Stack spacing={1.5}>
          <TextField
            fullWidth
            label="Recipe Storage Folder"
            value={storageLocation}
            onChange={e => setStorageLocation(e.target.value)}
            helperText="Where your recipes and backups are stored"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Button variant="outlined" size="small" onClick={handleSelectStorageFolder}>
                    Browse...
                  </Button>
                </InputAdornment>
              ),
            }}
          />
          <Typography variant="caption" color="text.secondary">
            This folder stores all your recipes and automatic backups. Changes take effect after
            saving.
          </Typography>
        </Stack>
      </Paper>

      {/* Save Settings Section */}
      <Box sx={{ mt: 3, mb: 3 }}>
        {status && (
          <Alert severity={status.type} variant="outlined" sx={{ mb: 2 }}>
            {status.msg}
          </Alert>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={isValidating}
            startIcon={<SaveIcon />}
            size="large"
            sx={{
              fontWeight: 600,
              px: 4,
              py: 1.5,
              borderRadius: 2,
            }}
          >
            {isValidating ? 'Verifying & Saving...' : 'Save All Settings'}
          </Button>
        </Box>
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', textAlign: 'center' }}
      >
        Your API key and profile details are stored locally on this device and used for AI color
        analysis.
      </Typography>

      <Paper elevation={1} sx={{ p: 2, borderRadius: 2, mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
          Reset Application
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Reset the application to its initial state. This will clear all recipes and show the setup
          wizard again.
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
        confirmColor="error"
      />
    </Container>
  );
};

export default Settings;
