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
    primary: { 
      main: '#5b6670',
      light: '#7a8491',
      dark: '#3d4853',
      contrastText: '#ffffff'
    },
    secondary: { 
      main: '#8b7e74',
      light: '#a89d94',
      dark: '#6b5f56',
      contrastText: '#ffffff'
    },
    background: { 
      default: '#FAFBFC', 
      paper: '#FFFFFF' 
    },
    text: { 
      primary: '#2c3338', 
      secondary: '#5f6b74' 
    },
    grey: {
      50: '#f8f9fa',
      100: '#f1f3f5',
      200: '#e9ecef',
      300: '#dee2e6',
      400: '#ced4da',
      500: '#adb5bd',
      600: '#868e96',
      700: '#495057',
      800: '#343a40',
      900: '#212529',
    },
    success: {
      main: '#6b8caf',
      light: '#8ba6c3',
      dark: '#4d6d8f'
    },
    info: {
      main: '#c9a961',
      light: '#d4ba82',
      dark: '#a08843'
    }
  },
  shape: { borderRadius: 12 },
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
    subtitle2: { fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { 
          borderRadius: 12, 
          border: '1px solid #e9ecef',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { 
          borderRadius: 12, 
          border: '1px solid #e9ecef',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { 
          textTransform: 'none', 
          borderRadius: 10, 
          fontWeight: 600,
          padding: '10px 20px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(91, 102, 112, 0.15)'
          }
        },
        contained: {
          '&:hover': {
            transform: 'translateY(-1px)',
          }
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
            backgroundColor: 'rgba(91, 102, 112, 0.04)'
          }
        }
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '&:hover fieldset': {
              borderColor: '#7a8491',
            },
          },
        },
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
