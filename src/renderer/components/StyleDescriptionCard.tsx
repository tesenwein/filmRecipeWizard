import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import { Button, Chip, Box, Paper, TextField } from '@mui/material';
import React from 'react';

interface StyleDescriptionCardProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  selectedVibe?: string;
  onVibeChange?: (vibe: string) => void;
}

const StyleDescriptionCard: React.FC<StyleDescriptionCardProps> = ({
  prompt,
  onPromptChange,
  selectedVibe,
  onVibeChange,
}) => {
  const vibeOptions = [
    '🎬 Cinematic',
    '🌸 Soft Pastel',
    '🌊 Moody Ocean',
    '📽️ Vintage'
  ];

  return (
    <Paper className="card slide-in" sx={{ p: 2.5, animationDelay: '0.05s' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <TipsAndUpdatesIcon sx={{ color: 'primary.main', fontSize: 20 }} />
        <Box sx={{ flex: 1 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2c3338', margin: 0 }}>
            Style Description
          </h3>
          <p style={{ fontSize: 12, color: '#5f6b74', margin: 0 }}>
            Describe your desired look
          </p>
        </Box>
        <Chip label="AI Powered" size="small" color="primary" variant="outlined" />
      </Box>

      <TextField
        id="prompt-input"
        value={prompt}
        onChange={e => onPromptChange(e.target.value)}
        placeholder="e.g., Warm golden hour tones, soft contrast, teal shadows, gentle film grain"
        fullWidth
        multiline
        minRows={2}
        size="small"
      />

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
        {vibeOptions.map(v => {
          const value = v.split(' ').slice(1).join(' ');
          const selected = (selectedVibe || '') === value;
          return (
            <Button
              key={v}
              size="small"
              variant={selected ? 'contained' : 'outlined'}
              onClick={() => onVibeChange?.(value)}
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                borderRadius: 2,
                fontSize: 12,
                py: 0.5,
                px: 1.5
              }}
            >
              {v}
            </Button>
          );
        })}
      </Box>
    </Paper>
  );
};

export default StyleDescriptionCard;
