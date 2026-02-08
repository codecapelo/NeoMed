import { alpha, createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#0f7a8a',
      light: '#4eaec0',
      dark: '#0a5661',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f08b4c',
      light: '#ffb27f',
      dark: '#be5d25',
      contrastText: '#1f2937',
    },
    background: {
      default: '#ecf5f9',
      paper: '#ffffff',
    },
    text: {
      primary: '#13253a',
      secondary: '#42596d',
    },
    divider: alpha('#0a5661', 0.12),
  },
  typography: {
    fontFamily: [
      'Space Grotesk',
      'Avenir Next',
      'Segoe UI',
      'Trebuchet MS',
      'sans-serif',
    ].join(','),
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.01em' },
    h4: { fontWeight: 700, letterSpacing: '-0.01em' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: {
      fontWeight: 600,
      letterSpacing: '0.02em',
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'radial-gradient(circle at 20% 20%, #d9f4ff 0%, #f3f8ff 45%, #f8fbff 100%)',
          color: '#13253a',
        },
        '::selection': {
          backgroundColor: alpha('#0f7a8a', 0.22),
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          border: `1px solid ${alpha('#0a5661', 0.08)}`,
          backgroundImage:
            'linear-gradient(160deg, rgba(255,255,255,0.96) 0%, rgba(242,249,255,0.96) 100%)',
          boxShadow: '0 10px 24px rgba(17, 70, 86, 0.08)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${alpha('#0a5661', 0.1)}`,
          boxShadow: '0 10px 24px rgba(17, 70, 86, 0.09)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          paddingInline: 16,
        },
        containedPrimary: {
          backgroundImage: 'linear-gradient(120deg, #0f7a8a 0%, #0ca4b8 100%)',
          boxShadow: '0 10px 20px rgba(15, 122, 138, 0.25)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(90deg, rgba(9,61,70,0.96) 0%, rgba(13,103,116,0.96) 100%)',
          backdropFilter: 'blur(8px)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'linear-gradient(180deg, #0b3f48 0%, #0d5a66 100%)',
          color: '#e4f7fb',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          marginInline: 8,
          marginBlock: 2,
          '&.Mui-selected': {
            backgroundColor: alpha('#9ad7e3', 0.24),
          },
          '&.Mui-selected:hover': {
            backgroundColor: alpha('#9ad7e3', 0.32),
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderRadius: '10px',
            },
            '& input': {
              fontSize: '1rem',
              padding: '12px 14px',
              minHeight: '24px',
            },
            '& textarea': {
              fontSize: '1rem',
              lineHeight: '1.5',
            },
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '1rem',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          fontSize: '1rem',
          padding: '12px 14px',
          minHeight: '24px',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '1rem',
          padding: '8px 16px',
          minHeight: '24px',
        },
      },
    },
  },
});

export default theme;
