import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import {
  ArrowForward as ArrowForwardIcon,
  CalendarMonth as AppointmentMUIcon,
  MedicalServices as RecordMUIcon,
  Medication as PrescriptionMUIcon,
  PersonAdd as PatientMUIcon,
  Groups as GroupsIcon,
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

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { patients, appointments, prescriptions, medicalRecords } = useData();
  const [registeredUsersCount, setRegisteredUsersCount] = useState<number | null>(null);

  const isAdmin = !!currentUser && typeof currentUser === 'object' && currentUser.role === 'admin';

  useEffect(() => {
    const loadUsersCount = async () => {
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
    };

    loadUsersCount();
  }, [isAdmin]);

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
                  sx={{
                    backgroundColor: '#3949ab1a',
                    color: '#3949ab',
                    fontWeight: 600,
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
