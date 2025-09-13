import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import './styles/index.css';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

const container = document.getElementById('root');
const root = createRoot(container!);

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#667eea' },
    secondary: { main: '#764ba2' },
  },
  shape: { borderRadius: 12 },
});

root.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <App />
  </ThemeProvider>
);
