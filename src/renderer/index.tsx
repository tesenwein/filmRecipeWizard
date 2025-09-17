import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import './styles/index.css';

const container = document.getElementById('root');
const root = createRoot(container!);

// Define blueish gray color variables
const blueishGray = {
  50: '#f8f9fc',
  100: '#f1f3f8',
  200: '#e9ecf2',
  300: '#dee2eb',
  400: '#ced4e0',
  500: '#adb5c8',
  600: '#868e9f',
  700: '#495057',
  800: '#343a40',
  900: '#212529',
};

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
      default: blueishGray[50],
      paper: '#FFFFFF',
    },
    text: {
      primary: '#2c3338',
      secondary: '#5f6b74',
    },
    grey: blueishGray,
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
          fontSize: '0.875rem',
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
            backgroundColor: `${blueishGray[100]}20`,
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
              borderColor: blueishGray[300],
            },
          },
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          marginBottom: 12,
          '&:before': { display: 'none' },
          '&.Mui-expanded': {
            marginBottom: 12,
          }
        }
      }
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          borderBottom: 'none',
          backgroundColor: '#ffffff !important',
          '&.Mui-expanded': {
            borderBottom: 'none',
            backgroundColor: '#ffffff !important',
          },
          '&:hover': {
            backgroundColor: '#f1f3f8 !important',
          }
        },
        content: {
          '& .MuiTypography-root': {
            fontSize: '0.95rem',
            fontWeight: 600,
          },
        },
      }
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
          paddingTop: '20px !important',
          paddingBottom: '24px !important',
        }
      }
    },
  },
});

root.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <App />
  </ThemeProvider>
);
