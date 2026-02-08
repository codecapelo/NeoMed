import React, { useMemo, useState } from 'react';
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  CalendarMonth as AppointmentIcon,
  Dashboard as DashboardIcon,
  Logout as LogoutIcon,
  MedicalServices as MedicalRecordIcon,
  Medication as PrescriptionIcon,
  Menu as MenuIcon,
  PersonAdd as PatientIcon,
  Save as SaveIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import logoSvg from '../../assets/images/logo-medical.svg';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

const drawerWidth = 264;
const getApiBase = () => {
  if (process.env.REACT_APP_API_BASE) {
    return process.env.REACT_APP_API_BASE;
  }

  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3001';
  }

  return '';
};

interface LayoutProps {
  children?: React.ReactNode;
}

interface AppMenuItem {
  text: string;
  icon: React.ReactElement;
  path: string;
}

const menuItems: AppMenuItem[] = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Pacientes', icon: <PatientIcon />, path: '/pacientes' },
  { text: 'Prontuarios', icon: <MedicalRecordIcon />, path: '/prontuarios' },
  { text: 'Prescricoes', icon: <PrescriptionIcon />, path: '/prescricoes' },
  { text: 'Agendamentos', icon: <AppointmentIcon />, path: '/agendamentos' },
  { text: 'Configuracoes', icon: <SettingsIcon />, path: '/configuracoes' },
];

export default function Layout({ children }: LayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [savingData, setSavingData] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { logout, currentUser } = useAuth();
  const apiBase = useMemo(() => getApiBase(), []);
  const { patients, prescriptions, appointments, medicalRecords } = useData();

  const userEmail = useMemo(() => {
    if (!currentUser || typeof currentUser !== 'object') {
      return '';
    }

    if ('email' in currentUser && currentUser.email) {
      return String(currentUser.email);
    }

    return '';
  }, [currentUser]);

  const userDisplayName = useMemo(() => {
    if (!currentUser || typeof currentUser !== 'object') {
      return 'Usuario';
    }

    if ('displayName' in currentUser && currentUser.displayName) {
      return String(currentUser.displayName);
    }

    if ('email' in currentUser && currentUser.email) {
      return String(currentUser.email).split('@')[0];
    }

    return 'Usuario';
  }, [currentUser]);

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      setToast({
        open: true,
        message: 'Nao foi possivel sair agora. Tente novamente.',
        severity: 'error',
      });
    }
  };

  const handleSaveAllData = async () => {
    const userId = currentUser && typeof currentUser === 'object' && 'uid' in currentUser ? String(currentUser.uid) : null;

    if (!userId) {
      setToast({
        open: true,
        message: 'Usuario nao identificado para salvar dados.',
        severity: 'error',
      });
      return;
    }

    setSavingData(true);

    try {
      const response = await fetch(`${apiBase}/api/saveAll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          patients,
          prescriptions,
          appointments,
          medicalRecords,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      setToast({
        open: true,
        message: 'Dados sincronizados com o servidor.',
        severity: 'success',
      });
    } catch {
      setToast({
        open: true,
        message: 'Falha ao salvar dados no servidor.',
        severity: 'error',
      });
    } finally {
      setSavingData(false);
    }
  };

  const closeToast = () => {
    setToast((prev) => ({ ...prev, open: false }));
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2.5 }}>
        <Box
          component="img"
          src={logoSvg}
          alt="NeoMed Logo"
          sx={{ width: 86, height: 86, mb: 1.2, filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.18))' }}
        />
        <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '0.02em' }}>
          NeoMed
        </Typography>
        <Chip
          label={userEmail || 'Modo local'}
          size="small"
          sx={{ mt: 1.2, color: '#d8f6fb', borderColor: 'rgba(216, 246, 251, 0.25)' }}
          variant="outlined"
        />
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(216, 246, 251, 0.15)' }} />
      <List sx={{ mt: 1, px: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ mt: 'auto', px: 2, pb: 2.5 }}>
        <Typography variant="caption" sx={{ color: 'rgba(216, 246, 251, 0.75)' }}>
          Sessao ativa
        </Typography>
        <Typography variant="body2" sx={{ color: '#f0fbff', fontWeight: 600 }}>
          {userDisplayName}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          borderBottom: '1px solid rgba(255,255,255,0.16)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="abrir menu"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box display="flex" alignItems="center" sx={{ flexGrow: 1, gap: 1.5 }}>
            <Avatar
              src={logoSvg}
              alt="NeoMed"
              sx={{ width: 34, height: 34, display: { xs: 'none', sm: 'inline-flex' } }}
            />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                Prontuario Clinico NeoMed
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(235, 247, 250, 0.9)' }}>
                Fluxo medico mais rapido e consistente
              </Typography>
            </Box>
          </Box>

          <Tooltip title="Salvar no servidor">
            <span>
              <Button
                color="inherit"
                startIcon={<SaveIcon />}
                onClick={handleSaveAllData}
                disabled={savingData}
                sx={{ ml: 1 }}
              >
                {savingData ? 'Salvando...' : 'Salvar'}
              </Button>
            </span>
          </Tooltip>

          <Tooltip title="Sair">
            <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout} sx={{ ml: 1 }}>
              Sair
            </Button>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }} aria-label="menu principal">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>

        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: '1px solid rgba(255,255,255,0.1)',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          px: { xs: 2, md: 3.5 },
          py: { xs: 2, md: 3 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
        }}
      >
        {children || <Outlet />}
      </Box>

      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={closeToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={closeToast} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
