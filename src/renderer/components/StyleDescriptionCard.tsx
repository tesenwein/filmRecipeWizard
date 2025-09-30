import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import { Box, Paper, TextField } from '@mui/material';
import React from 'react';

interface StyleDescriptionCardProps {
  prompt: string;
  onPromptChange: (value: string) => void;
}

const StyleDescriptionCard: React.FC<StyleDescriptionCardProps> = ({ 
  prompt, 
  onPromptChange
}) => {

  return (
    <Paper className="card slide-in" sx={{ p: 2.5, animationDelay: '0.05s' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <TipsAndUpdatesIcon sx={{ color: 'primary.main', fontSize: 20 }} />
        <Box sx={{ flex: 1 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2c3338', margin: 0 }}>Style Description</h3>
          <p style={{ fontSize: 12, color: '#5f6b74', margin: 0 }}>Describe your desired look</p>
        </Box>
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
    </Paper>
  );
};

export default StyleDescriptionCard;
