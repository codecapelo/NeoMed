import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  ArrowForward as ArrowForwardIcon,
  CalendarMonth as AppointmentMUIcon,
  MedicalServices as RecordMUIcon,
  Medication as PrescriptionMUIcon,
  PersonAdd as PatientMUIcon,
  Groups as GroupsIcon,
  WarningAmber as WarningAmberIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { getApiBaseUrl, getAuthToken } from '../services/authService';
import DashboardCard from '../components/DashboardCard';
import PatientIcon from '../assets/icons/patient.svg';
import AppointmentIcon from '../assets/icons/appointment.svg';
import PrescriptionIcon from '../assets/icons/prescription.svg';
import MedicalRecordIcon from '../assets/icons/medical-record.svg';
import '../styles/Dashboard.css';

interface RegisteredUser {
  uid: string;
  email: string | null;
  role?: string;
  isOnline?: boolean;
  lastSeenAt?: string | null;
}

interface EmergencyRequest {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  attendingDoctorName?: string | null;
  videoCallUrl?: string | null;
  videoCallProvider?: string | null;
  videoCallStartedAt?: string | null;
  message: string;
  updatedAt?: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { patients, appointments, prescriptions, medicalRecords } = useData();
  const [registeredUsersCount, setRegisteredUsersCount] = useState<number | null>(null);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [isUsersListLoading, setIsUsersListLoading] = useState(false);
  const [usersListError, setUsersListError] = useState<string | null>(null);
  const [emergencyRequests, setEmergencyRequests] = useState<EmergencyRequest[]>([]);
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [emergencyError, setEmergencyError] = useState<string | null>(null);
  const [startingVideoRequestId, setStartingVideoRequestId] = useState<string | null>(null);

  const isAdmin = !!currentUser && typeof currentUser === 'object' && currentUser.role === 'admin';
  const canViewEmergency = !!currentUser && typeof currentUser === 'object' && ['admin', 'doctor'].includes(String(currentUser.role || ''));

  const loadUsersCount = useCallback(async () => {
    if (!isAdmin) {
      setRegisteredUsersCount(null);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setRegisteredUsersCount(null);
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/admin/users/count`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Nao foi possivel carregar contagem de usuarios.');
      }

      const payload = await response.json();
      setRegisteredUsersCount(typeof payload.count === 'number' ? payload.count : null);
    } catch {
      setRegisteredUsersCount(null);
    }
  }, [isAdmin]);

  const loadRegisteredUsers = useCallback(async () => {
    if (!isAdmin) {
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setUsersListError('Sessao invalida. Faca login novamente.');
      setRegisteredUsers([]);
      return;
    }

    setIsUsersListLoading(true);
    setUsersListError(null);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Nao foi possivel carregar a lista de usuarios.');
      }

      const payload = await response.json();
      const users = Array.isArray(payload.users) ? (payload.users as RegisteredUser[]) : [];
      setRegisteredUsers(users);
      setRegisteredUsersCount(users.length);
    } catch {
      setUsersListError('Erro ao carregar usuarios.');
      setRegisteredUsers([]);
    } finally {
      setIsUsersListLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadUsersCount();
  }, [loadUsersCount]);

  useEffect(() => {
    if (!usersDialogOpen || !isAdmin) {
      return;
    }

    loadRegisteredUsers();
    const intervalId = window.setInterval(loadRegisteredUsers, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isAdmin, loadRegisteredUsers, usersDialogOpen]);

  useEffect(() => {
    if (!isAdmin && usersDialogOpen) {
      setUsersDialogOpen(false);
    }
  }, [isAdmin, usersDialogOpen]);

  const loadEmergencyRequests = useCallback(async () => {
    if (!canViewEmergency) {
      setEmergencyRequests([]);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setEmergencyError('Sessao invalida. Faca login novamente.');
      setEmergencyRequests([]);
      return;
    }

    setEmergencyLoading(true);
    setEmergencyError(null);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/doctor/emergency/requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao carregar emergencias.');
      }

      const payload = await response.json();
      setEmergencyRequests(Array.isArray(payload?.requests) ? (payload.requests as EmergencyRequest[]) : []);
    } catch {
      setEmergencyError('Erro ao carregar solicitacoes de emergencia.');
      setEmergencyRequests([]);
    } finally {
      setEmergencyLoading(false);
    }
  }, [canViewEmergency]);

  useEffect(() => {
    if (!canViewEmergency) {
      return;
    }

    loadEmergencyRequests();
    const intervalId = window.setInterval(loadEmergencyRequests, 15000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [canViewEmergency, loadEmergencyRequests]);

  const resolveEmergencyRequest = useCallback(
    async (requestId: string) => {
      const token = getAuthToken();
      if (!token) {
        setEmergencyError('Sessao invalida. Faca login novamente.');
        return;
      }

      try {
        const response = await fetch(`${getApiBaseUrl()}/api/doctor/emergency/${requestId}/resolve`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Falha ao marcar emergencia como atendida.');
        }

        setEmergencyRequests((prev) => prev.filter((item) => item.id !== requestId));
      } catch {
        setEmergencyError('Nao foi possivel atualizar a solicitacao de emergencia.');
      }
    },
    []
  );

  const startEmergencyVideoCall = useCallback(async (requestId: string) => {
    const token = getAuthToken();
    if (!token) {
      setEmergencyError('Sessao invalida. Faca login novamente.');
      return;
    }

    setStartingVideoRequestId(requestId);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/doctor/emergency/${requestId}/start-video`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Falha ao iniciar videochamada de emergencia.');
      }

      const request = payload.request as EmergencyRequest;
      setEmergencyRequests((prev) => prev.map((item) => (item.id === requestId ? { ...item, ...request } : item)));

      if (request?.videoCallUrl) {
        window.open(String(request.videoCallUrl), '_blank', 'noopener,noreferrer');
      }
    } catch {
      setEmergencyError('Nao foi possivel iniciar a videochamada agora.');
    } finally {
      setStartingVideoRequestId(null);
    }
  }, []);

  const userName = useMemo(() => {
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

  const totalRegistros = patients.length + appointments.length + prescriptions.length + medicalRecords.length;
  const onlineUsersCount = useMemo(
    () => registeredUsers.filter((user) => Boolean(user.isOnline)).length,
    [registeredUsers]
  );

  const formatLastSeen = useCallback((lastSeenAt?: string | null) => {
    if (!lastSeenAt) {
      return 'sem atividade recente';
    }

    const date = new Date(lastSeenAt);
    if (Number.isNaN(date.getTime())) {
      return 'sem atividade recente';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  }, []);

  const cards = useMemo(
    () => [
      {
        title: 'Pacientes',
        subtitle: 'Cadastros ativos',
        count: patients.length,
        icon: PatientIcon,
        path: '/pacientes',
      },
      {
        title: 'Consultas',
        subtitle: 'Agenda da clinica',
        count: appointments.length,
        icon: AppointmentIcon,
        path: '/agendamentos',
      },
      {
        title: 'Prescricoes',
        subtitle: 'Receitas emitidas',
        count: prescriptions.length,
        icon: PrescriptionIcon,
        path: '/prescricoes',
      },
      {
        title: 'Prontuarios',
        subtitle: 'Historico clinico',
        count: medicalRecords.length,
        icon: MedicalRecordIcon,
        path: '/prontuarios',
      },
    ],
    [appointments.length, medicalRecords.length, patients.length, prescriptions.length]
  );

  const highlights = [
    {
      label: 'Pacientes',
      value: patients.length,
      icon: <PatientMUIcon fontSize="small" />,
      color: '#0f7a8a',
    },
    {
      label: 'Consultas',
      value: appointments.length,
      icon: <AppointmentMUIcon fontSize="small" />,
      color: '#0e93a5',
    },
    {
      label: 'Prescricoes',
      value: prescriptions.length,
      icon: <PrescriptionMUIcon fontSize="small" />,
      color: '#f08b4c',
    },
    {
      label: 'Prontuarios',
      value: medicalRecords.length,
      icon: <RecordMUIcon fontSize="small" />,
      color: '#1d6f86',
    },
  ];

  return (
    <div className="dashboard-container">
      <Paper className="dashboard-hero" elevation={0}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={3}>
          <Box>
            <Typography variant="h4" className="dashboard-title">
              Painel Clinico
            </Typography>
            <Typography className="dashboard-subtitle">
              Bem-vindo, {userName}. Veja os indicadores principais e acesse os modulos com um clique.
            </Typography>
            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 2 }}>
              {highlights.map((item) => (
                <Chip
                  key={item.label}
                  icon={item.icon}
                  label={`${item.label}: ${item.value}`}
                  sx={{
                    backgroundColor: `${item.color}1a`,
                    color: item.color,
                    fontWeight: 600,
                  }}
                />
              ))}
              {isAdmin && (
                <Chip
                  icon={<GroupsIcon fontSize="small" />}
                  label={`Usuarios cadastrados: ${registeredUsersCount ?? '...'}`}
                  clickable
                  onClick={() => setUsersDialogOpen(true)}
                  sx={{
                    backgroundColor: '#3949ab1a',
                    color: '#3949ab',
                    fontWeight: 600,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: '#3949ab26',
                    },
                  }}
                />
              )}
            </Stack>
          </Box>

          <Box className="dashboard-hero-side">
            <Typography variant="overline" className="dashboard-kpi-label">
              Total de registros
            </Typography>
            <Typography variant="h2" className="dashboard-kpi-value">
              {totalRegistros}
            </Typography>
            <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/pacientes')}>
              Ir para pacientes
            </Button>
          </Box>
        </Stack>
      </Paper>

      {canViewEmergency && (
        <Paper elevation={0} sx={{ p: 2.5, mb: 2.5, border: '1px solid', borderColor: 'warning.light', backgroundColor: '#fffaf3' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <WarningAmberIcon color="warning" />
              <Typography variant="h6">Solicitacoes de emergencia (pacientes online)</Typography>
            </Stack>
            <Button size="small" onClick={loadEmergencyRequests}>
              Atualizar
            </Button>
          </Stack>

          {emergencyLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {!emergencyLoading && emergencyError && <Alert severity="error">{emergencyError}</Alert>}

          {!emergencyLoading && !emergencyError && emergencyRequests.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Nenhuma solicitacao de emergencia ativa no momento.
            </Typography>
          )}

          {!emergencyLoading && !emergencyError && emergencyRequests.length > 0 && (
            <Stack spacing={1.2}>
              {emergencyRequests.map((request) => (
                <Paper key={request.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.2}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {request.patientName} ({request.patientEmail || 'sem email'})
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {request.message}
                      </Typography>
                      {request.videoCallUrl && (
                        <Typography variant="caption" color="primary.main" sx={{ display: 'block', mt: 0.5 }}>
                          Videochamada ativa {request.attendingDoctorName ? `com ${request.attendingDoctorName}` : ''}.
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        Atualizado em: {formatLastSeen(request.updatedAt)}
                      </Typography>
                    </Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Button
                        size="small"
                        color="error"
                        variant={request.videoCallUrl ? 'outlined' : 'contained'}
                        onClick={() => startEmergencyVideoCall(request.id)}
                        disabled={startingVideoRequestId === request.id}
                      >
                        {startingVideoRequestId === request.id ? 'Iniciando...' : request.videoCallUrl ? 'Abrir video' : 'Videochamada'}
                      </Button>
                      <Button size="small" variant="contained" onClick={() => navigate('/agendamentos')}>
                        Ir para agenda
                      </Button>
                      <Button size="small" color="warning" onClick={() => resolveEmergencyRequest(request.id)}>
                        Marcar atendido
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      )}

      {isAdmin && (
        <Dialog open={usersDialogOpen} onClose={() => setUsersDialogOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Usuarios cadastrados</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                Total: {registeredUsers.length} | Online agora: {onlineUsersCount}
              </Typography>
              <Divider />
              {isUsersListLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={26} />
                </Box>
              )}
              {!isUsersListLoading && usersListError && <Alert severity="error">{usersListError}</Alert>}
              {!isUsersListLoading && !usersListError && (
                <List disablePadding>
                  {registeredUsers.map((user) => (
                    <ListItem
                      key={user.uid}
                      disablePadding
                      sx={{
                        py: 1.1,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                      secondaryAction={
                        <Chip
                          size="small"
                          label={user.isOnline ? 'Online' : 'Offline'}
                          color={user.isOnline ? 'success' : 'default'}
                          variant={user.isOnline ? 'filled' : 'outlined'}
                        />
                      }
                    >
                      <ListItemText
                        primary={user.email || 'sem email'}
                        secondary={`Perfil: ${user.role || 'usuario'} | Ultima atividade: ${formatLastSeen(user.lastSeenAt)}`}
                      />
                    </ListItem>
                  ))}
                  {registeredUsers.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                      Nenhum usuario cadastrado.
                    </Typography>
                  )}
                </List>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={loadRegisteredUsers}>Atualizar</Button>
            <Button onClick={() => setUsersDialogOpen(false)} variant="contained">
              Fechar
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <div className="dashboard-cards">
        {cards.map((card) => (
          <DashboardCard
            key={card.title}
            title={card.title}
            subtitle={card.subtitle}
            count={card.count}
            icon={card.icon}
            onClick={() => navigate(card.path)}
          />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
