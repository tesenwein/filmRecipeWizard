import { Button, Card, CardContent, LinearProgress, TextField, Typography } from '@mui/material';
import React, { useState } from 'react';
import IconSvg from '../../../assets/icons/icon.svg';
import { DEFAULT_STORAGE_FOLDER } from '../../shared/types';
import { useAppStore } from '../store/appStore';
import ErrorDialog from './ErrorDialog';
import ProfileEdit, { ProfileData } from './ProfileEdit';

interface SetupWizardProps {
  onComplete: () => void;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const { saveSettings, setSetupCompleted, setSetupWizardOpen, importRecipes } =
    useAppStore() as any;
  const [currentStep, setCurrentStep] = useState(1);
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [keyError, setKeyError] = useState<string>('');
  // User profile fields
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    website: '',
    instagram: '',
  });
  const [isProfileValid, setIsProfileValid] = useState(true);
  const [storageLocation, setStorageLocation] = useState(`~/${DEFAULT_STORAGE_FOLDER}`);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState('');

  // Prefill from existing settings if present
  React.useEffect(() => {
    (async () => {
      try {
        const res = await window.electronAPI.getSettings();
        if (res?.success) {
          if (res.settings?.userProfile) {
            const u = res.settings.userProfile as any;
            setProfileData({
              firstName: u.firstName || '',
              lastName: u.lastName || '',
              email: u.email || '',
              website: u.website || '',
              instagram: u.instagram || '',
            });
          }
          // Storage location will have a default from backend or user's setting
          if (res.settings?.storageLocation) {
            setStorageLocation(res.settings.storageLocation);
          }
          // If no storageLocation from backend, keep the initial default
        }
      } catch {
        // Ignore settings load errors
      }
    })();
  }, []);

  const handleApiKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(event.target.value);
    setKeyError(''); // Clear error when user types
  };

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
        setKeyError('Invalid API key. Please check your key and try again.');
        return false;
      } else if (response.status === 429) {
        setKeyError('Rate limit exceeded. Your key is valid but quota may be exhausted.');
        return true; // Key is valid even if rate limited
      } else if (!response.ok) {
        setKeyError('Unable to verify API key. Please check your internet connection.');
        return false;
      }

      return true;
    } catch {
      setKeyError('Network error. Please check your internet connection.');
      return false;
    }
  };

  const handleApiKeySubmit = async () => {
    if (!apiKey.trim()) return;

    setIsLoading(true);
    setKeyError('');

    try {
      // Test the API key first
      const isValid = await testOpenAIKey(apiKey.trim());
      if (!isValid) {
        return; // Error message already set by testOpenAIKey
      }

      // If key is valid, save it and advance to storage step
      await saveSettings({ openaiKey: apiKey.trim() });
      setCurrentStep(3);
    } catch (error) {
      console.error('Failed to save API key:', error);
      setKeyError('Failed to save API key. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const normalizeUrl = (value: string): string | null => {
    if (!value) return '';
    const v = value.trim();
    const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      const u = new URL(withScheme);
      return u.toString();
    } catch {
      return null;
    }
  };

  const normalizeInstagram = (value: string): { ok: boolean; handle?: string; url?: string } => {
    const v = value.trim();
    if (!v) return { ok: true, handle: undefined, url: undefined };
    try {
      const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
      if (/instagram\.com$/i.test(u.hostname)) {
        const parts = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
        const h = parts[0] || '';
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

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await saveSettings({ setupCompleted: true });
      // Defensively mark done and close to avoid any flicker
      try {
        setSetupCompleted(true);
        setSetupWizardOpen(false);
      } catch (error) {
        console.warn('Failed to update setup state:', error);
      }
      onComplete();
    } catch (error) {
      console.error('Failed to complete setup:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectStorageFolder = async () => {
    try {
      const result = await (window.electronAPI as any).selectStorageFolder();
      if (result?.success && result.path) {
        setStorageLocation(result.path);
      }
    } catch (error) {
      console.error('Failed to select storage folder:', error);
    }
  };

  const handleStorageLocationSubmit = async () => {
    if (!storageLocation.trim()) return;

    setIsLoading(true);
    try {
      await saveSettings({ storageLocation: storageLocation.trim() });
      setCurrentStep(4);
    } catch (error) {
      console.error('Failed to save storage location:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const progress = (currentStep / 5) * 100;

  return (
    <div
      className="fade-in"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: 16,
      }}
    >
      <div style={{ maxWidth: 720, width: '100%' }}>
        <Card
          elevation={1}
          sx={{
            minHeight: 500,
            backgroundColor: '#ffffff',
            borderRadius: 3,
          }}
        >
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 4,
              backgroundColor: 'rgba(91, 102, 112, 0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#5b6670',
              },
            }}
          />
          <CardContent sx={{ p: 5, textAlign: 'center' }}>
            {currentStep === 1 && (
              <div>
                <img
                  src={IconSvg}
                  alt="Film Recipe Wizard"
                  style={{ width: 64, height: 64, marginBottom: 24 }}
                />
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>
                  Welcome to Film Recipe Wizard!
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ mb: 3, color: 'text.secondary', lineHeight: 1.6 }}
                >
                  Thank you for choosing Film Recipe Wizard. This powerful AI-driven tool helps you
                  create stunning photo recipes with advanced color grading and style transfer
                  capabilities.
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ mb: 4, color: 'text.secondary', lineHeight: 1.6 }}
                >
                  We appreciate your support and welcome any contributions to make this tool even
                  better. Visit our GitHub repository to contribute, report issues, or suggest new
                  features.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => setCurrentStep(2)}
                  sx={{ minWidth: 200 }}
                >
                  Get Started
                </Button>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                  Configure OpenAI API
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ mb: 3, color: 'text.secondary', lineHeight: 1.6, textAlign: 'left' }}
                >
                  To unlock the full power of AI-driven color analysis and style transfer, you'll
                  need an OpenAI API key. This enables:
                </Typography>
                <ul style={{ textAlign: 'left', marginBottom: 24, color: '#5f6b74' }}>
                  <li>Advanced color matching and analysis</li>
                  <li>Intelligent style recommendations</li>
                  <li>Natural language style descriptions</li>
                  <li>Contextual recipe generation</li>
                </ul>
                <div style={{ WebkitAppRegion: 'no-drag', marginBottom: 24 }}>
                  <TextField
                    fullWidth
                    label="OpenAI API Key"
                    type="password"
                    value={apiKey}
                    onChange={handleApiKeyChange}
                    placeholder="sk-..."
                    sx={{ WebkitAppRegion: 'no-drag' }}
                    error={!!keyError}
                    helperText={keyError || 'Your API key is stored securely on your local machine'}
                    InputProps={{
                      style: { WebkitAppRegion: 'no-drag' },
                      onPointerDown: e => e.stopPropagation(),
                      onClick: e => e.stopPropagation(),
                    }}
                  />
                </div>
                {/* Profile moved to Step 3 */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <Button variant="outlined" onClick={() => setCurrentStep(1)} disabled={isLoading}>
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleApiKeySubmit}
                    disabled={!apiKey.trim() || isLoading}
                    sx={{ minWidth: 120 }}
                  >
                    {isLoading ? 'Verifying...' : 'Continue'}
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                  Choose Storage Location
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ mb: 3, color: 'text.secondary', lineHeight: 1.6, textAlign: 'left' }}
                >
                  Select where your recipes and backups will be stored. This folder will be created
                  if it doesn't exist.
                </Typography>
                <div style={{ marginBottom: 24 }}>
                  <TextField
                    fullWidth
                    label="Storage Location"
                    value={storageLocation}
                    onChange={e => setStorageLocation(e.target.value)}
                    placeholder="e.g., /Users/yourname/.film-recipes-wizard"
                    helperText="This folder will store all your recipes and backups"
                  />
                  <Button
                    variant="outlined"
                    onClick={handleSelectStorageFolder}
                    sx={{ mt: 2, display: 'block' }}
                  >
                    Browse Folder...
                  </Button>
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <Button variant="outlined" onClick={() => setCurrentStep(2)} disabled={isLoading}>
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleStorageLocationSubmit}
                    disabled={!storageLocation.trim() || isLoading}
                    sx={{ minWidth: 120 }}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                  Your Profile (optional)
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ mb: 3, color: 'text.secondary', lineHeight: 1.6, textAlign: 'left' }}
                >
                  These details are attached to your recipes and included in exports.
                </Typography>
                <ProfileEdit
                  initialData={profileData}
                  onChange={({ isValid, ...data }) => {
                    setProfileData(data);
                    setIsProfileValid(isValid);
                  }}
                  layout="grid"
                />
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <Button variant="outlined" onClick={() => setCurrentStep(3)} disabled={isLoading}>
                    Back
                  </Button>
                  <Button variant="text" onClick={() => setCurrentStep(5)} disabled={isLoading}>
                    Skip
                  </Button>
                  <Button
                    variant="contained"
                    onClick={async () => {
                      if (!isProfileValid) {
                        return;
                      }
                      
                      setIsLoading(true);
                      try {
                        const nWebsite = normalizeUrl(profileData.website);
                        const ig = normalizeInstagram(profileData.instagram);
                        
                        await saveSettings({
                          userProfile: {
                            firstName: profileData.firstName.trim(),
                            lastName: profileData.lastName.trim(),
                            email: profileData.email.trim() ? profileData.email.trim() : undefined,
                            website: nWebsite || undefined,
                            instagram: ig.handle || undefined,
                          },
                        });
                        setCurrentStep(5);
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading}
                    sx={{ minWidth: 120 }}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                  Setup Complete!
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ mb: 4, color: 'text.secondary', lineHeight: 1.6 }}
                >
                  You're all set! Film Recipe Wizard is now ready to transform your photos with
                  AI-powered style recipes.
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ mb: 4, color: 'text.secondary', lineHeight: 1.6 }}
                >
                  Want to get started with some sample recipes? Import our curated collection to
                  explore different styles and techniques.
                </Typography>
                <div
                  style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}
                >
                  <Button
                    variant="outlined"
                    onClick={async () => {
                      try {
                        const res = await importRecipes();
                        if (!res.success) {
                          // Show detailed error dialog
                          setErrorMessage('Failed to import recipes');
                          setErrorDetails(res.error || 'Unknown error occurred during import');
                          setErrorDialogOpen(true);
                        }
                      } catch (error) {
                        // Show detailed error dialog for unexpected errors
                        setErrorMessage('Import failed unexpectedly');
                        setErrorDetails(
                          error instanceof Error ? error.message : 'An unexpected error occurred'
                        );
                        setErrorDialogOpen(true);
                      }
                    }}
                    sx={{ minWidth: 160 }}
                  >
                    Import Sample Recipes
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleComplete}
                    disabled={isLoading}
                    sx={{ minWidth: 160 }}
                  >
                    {isLoading ? 'Finishing...' : 'Start Creating'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <ErrorDialog
          open={errorDialogOpen}
          title="Import Error"
          message={errorMessage}
          details={errorDetails}
          onClose={() => {
            setErrorDialogOpen(false);
            setErrorMessage('');
            setErrorDetails('');
          }}
        />
      </div>
    </div>
  );
};

export default SetupWizard;
