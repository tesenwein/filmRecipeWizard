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
    primary: { main: '#5B6EE1' },
    secondary: { main: '#7A57C2' },
    background: { default: '#FAFBFF', paper: '#FFFFFF' },
    text: { primary: '#1F2937', secondary: '#6B7280' },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Oxygen',
      'Ubuntu',
      'Cantarell',
      'sans-serif',
    ].join(','),
    h5: { fontWeight: 700 },
    subtitle2: { fontWeight: 700 },
  },
  components: {
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { borderRadius: 14, border: '1px solid #EEF2FF' },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 1 },
      styleOverrides: {
        root: { borderRadius: 14, border: '1px solid #EEF2FF' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 12, fontWeight: 600 },
      },
    },
  },
});

root.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <App />
  </ThemeProvider>
);
