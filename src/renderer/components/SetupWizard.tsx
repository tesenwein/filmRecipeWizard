import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  LinearProgress,
  TextField,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import IconSvg from '../../../assets/icons/icon.svg';

interface SetupWizardProps {
  open: boolean;
  onComplete: () => void;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ open, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleApiKeySubmit = async () => {
    if (!apiKey.trim()) return;

    setIsLoading(true);
    try {
      const result = await window.electronAPI.updateSettings({ openaiKey: apiKey.trim() });
      if (result.success) {
        setCurrentStep(3);
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await window.electronAPI.updateSettings({ setupCompleted: true });
      onComplete();
    } catch (error) {
      console.error('Failed to complete setup:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const progress = (currentStep / 3) * 100;

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      PersistentBackdropProps={{ style: { backgroundColor: 'rgba(0,0,0,0.8)' } }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Card elevation={0} sx={{ minHeight: 500 }}>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 3 }} />
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            {currentStep === 1 && (
              <div>
                <img src={IconSvg} alt="Foto Recipe Wizard" style={{ width: 64, height: 64, marginBottom: 24 }} />
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>
                  Welcome to Foto Recipe Wizard!
                </Typography>
                <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary', lineHeight: 1.6 }}>
                  Thank you for choosing Foto Recipe Wizard. This powerful AI-driven tool helps you create stunning photo recipes with advanced color grading and style transfer capabilities.
                </Typography>
                <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary', lineHeight: 1.6 }}>
                  We appreciate your support and welcome any contributions to make this tool even better. Visit our GitHub repository to contribute, report issues, or suggest new features.
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
                <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary', lineHeight: 1.6, textAlign: 'left' }}>
                  To unlock the full power of AI-driven color analysis and style transfer, you'll need an OpenAI API key. This enables:
                </Typography>
                <ul style={{ textAlign: 'left', marginBottom: 24, color: '#5f6b74' }}>
                  <li>Advanced color matching and analysis</li>
                  <li>Intelligent style recommendations</li>
                  <li>Natural language style descriptions</li>
                  <li>Contextual recipe generation</li>
                </ul>
                <TextField
                  fullWidth
                  label="OpenAI API Key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  sx={{ mb: 3 }}
                  helperText="Your API key is stored securely on your local machine"
                />
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <Button
                    variant="outlined"
                    onClick={() => setCurrentStep(1)}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleApiKeySubmit}
                    disabled={!apiKey.trim() || isLoading}
                    sx={{ minWidth: 120 }}
                  >
                    {isLoading ? 'Saving...' : 'Continue'}
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                  Setup Complete!
                </Typography>
                <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary', lineHeight: 1.6 }}>
                  You're all set! Foto Recipe Wizard is now ready to transform your photos with AI-powered style recipes.
                </Typography>
                <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary', lineHeight: 1.6 }}>
                  Want to get started with some sample recipes? Import our curated collection to explore different styles and techniques.
                </Typography>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      window.electronAPI.importAllRecipes?.();
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
      </DialogContent>
    </Dialog>
  );
};

export default SetupWizard;