import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import './styles/index.css';

// Extend the theme interface to include custom properties
declare module '@mui/material/styles' {
  interface Theme {
    custom: {
      gradients: {
        primary: string;
        background: string;
        placeholder: string;
        scrollFade: string;
      };
      colors: {
        placeholderText: string;
        errorBackground: string;
        disabledButton: string;
        disabledText: string;
      };
    };
  }
  interface ThemeOptions {
    custom?: {
      gradients?: {
        primary?: string;
        background?: string;
        placeholder?: string;
        scrollFade?: string;
      };
      colors?: {
        placeholderText?: string;
        errorBackground?: string;
        disabledButton?: string;
        disabledText?: string;
      };
    };
  }
}

const container = document.getElementById('root');
const root = createRoot(container!);

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#5b6670',
      light: '#7a8491',
      dark: '#3d4853',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#8b7e74',
      light: '#a89d94',
      dark: '#6b5f56',
      contrastText: '#ffffff',
    },
    background: {
      default: '#FAFBFF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#2c3338',
      secondary: '#5f6b74',
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
      dark: '#4d6d8f',
    },
    info: {
      main: '#c9a961',
      light: '#d4ba82',
      dark: '#a08843',
    },
    error: {
      main: '#d32f2f',
      light: '#ef5350',
      dark: '#c62828',
    },
    warning: {
      main: '#ed6c02',
      light: '#ff9800',
      dark: '#e65100',
    },
  },
  // Custom theme properties for app-specific colors
  custom: {
    gradients: {
      primary: 'linear-gradient(135deg, #5b6670 0%, #3d4853 100%)',
      background: 'radial-gradient(1200px 800px at 80% -200px, rgba(102,126,234,0.08), transparent 60%), radial-gradient(900px 600px at -200px -200px, rgba(118,75,162,0.06), transparent 60%), #FAFBFF',
      placeholder: 'radial-gradient(800px 400px at 80% -10%, rgba(102,126,234,0.10), transparent 60%), radial-gradient(600px 300px at -10% -20%, rgba(118,75,162,0.08), transparent 60%), #fafbff',
      scrollFade: 'linear-gradient(to bottom, #FAFBFF 0%, transparent 100%)',
    },
    colors: {
      placeholderText: '#7c8aa0',
      errorBackground: '#fff8f8',
      disabledButton: '#e0e0e0',
      disabledText: '#999999',
    },
  },
  // Use minimal rounding (2px) across the UI for uniform look
  shape: { borderRadius: 2 },
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
          borderRadius: 2,
          border: 'none',
          boxShadow: 'none',
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 2,
          border: 'none',
          boxShadow: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 2,
          fontWeight: 600,
          padding: '10px 20px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          '&:hover': {
            transform: 'none',
          },
        },
        outlined: {
          '&:hover': {
            backgroundColor: 'rgba(91, 102, 112, 0.04)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          fontWeight: 500,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '&:hover fieldset': {
              borderColor: 'primary.light',
            },
          },
        },
      },
    },
    // Custom component overrides for app-specific classes
    MuiBox: {
      styleOverrides: {
        root: {
          '&.card': {
            background: 'background.paper',
            borderRadius: 2,
            boxShadow: 'none',
            border: 'none',
            padding: 24,
            marginBottom: 20,
            transition: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
          '&.container': {
            maxWidth: 1200,
            margin: '0 auto',
            padding: '48px 20px 20px',
            '&.results': {
              maxWidth: '100%',
            },
          },
          '&.fade-in': {
            animation: 'fadeIn 0.3s ease-in',
          },
          '&.slide-in': {
            animation: 'slideIn 0.4s ease-out',
          },
        },
      },
    },
  },
});

// Add keyframe animations to the document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `;
  document.head.appendChild(style);
}

root.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <App />
  </ThemeProvider>
);
