import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { Box, CircularProgress } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/common/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import theme from './theme';
import lazyWithRetry from './utils/lazyWithRetry';

const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const Patients = lazyWithRetry(() => import('./pages/Patients'));
const Prescriptions = lazyWithRetry(() => import('./pages/Prescriptions'));
const MedicalRecords = lazyWithRetry(() => import('./pages/MedicalRecords'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const Login = lazyWithRetry(() => import('./pages/Login'));
const AppointmentsPage = lazyWithRetry(() => import('./pages/AppointmentsPage'));
const PatientPrescriptions = lazyWithRetry(() => import('./pages/PatientPrescriptions'));

function LoadingScreen() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 20% 20%, #d9f4ff 0%, #f3f8ff 45%, #f8fbff 100%)',
      }}
    >
      <CircularProgress size={36} />
    </Box>
  );
}

function PrescriptionsEntry() {
  const { currentUser } = useAuth();
  if (currentUser?.role === 'patient') {
    return <PatientPrescriptions />;
  }

  return <Prescriptions />;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <DataProvider>
          <BrowserRouter>
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                <Route path="/login" element={<Login />} />

                <Route element={<ProtectedRoute />}>
                  <Route element={<Layout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/pacientes" element={<Patients />} />
                    <Route path="/prontuarios" element={<MedicalRecords />} />
                    <Route path="/prescricoes" element={<PrescriptionsEntry />} />
                    <Route path="/agendamentos" element={<AppointmentsPage />} />
                    <Route path="/configuracoes" element={<Settings />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
