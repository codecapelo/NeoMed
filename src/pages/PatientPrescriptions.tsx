import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Divider,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrl, getAuthToken } from '../services/authService';
import { normalizeVideoCallProvider, normalizeVideoCallUrl } from '../utils/videoCall';

type GenericPrescription = {
  id?: string;
  patientId?: string;
  date?: string;
  validUntil?: string;
  instructions?: string;
  medications?: Array<{ name?: string }>;
};

type PatientAppointment = {
  id: string;
  patientId: string;
  date: string;
  time: string;
  status?: string;
  reason?: string;
  notes?: string;
  requestedAt?: string;
};

type EmergencyRequest = {
  id: string;
  status: 'open' | 'resolved';
  message: string;
  attendingDoctorName?: string | null;
  videoCallUrl?: string | null;
  videoCallProvider?: string | null;
  videoCallStartedAt?: string | null;
  videoCallRoom?: string | null;
  videoCallAccessCode?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('pt-BR');
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('pt-BR');
};

const extractMedicationNames = (prescription: GenericPrescription): string[] => {
  const medications = Array.isArray(prescription?.medications) ? prescription.medications : [];
  if (!medications.length) {
    return [];
  }

  return medications
    .map((item: { name?: string }) => String(item?.name || '').trim())
    .filter((item: string) => item.length > 0);
};

const byMostRecentPrescription = (a: GenericPrescription, b: GenericPrescription) => {
  const aTime = new Date(a.date || 0).getTime();
  const bTime = new Date(b.date || 0).getTime();
  return bTime - aTime;
};

const byUpcomingAppointment = (a: PatientAppointment, b: PatientAppointment) => {
  const aKey = `${a.date || ''}T${a.time || '00:00'}`;
  const bKey = `${b.date || ''}T${b.time || '00:00'}`;
  return new Date(aKey).getTime() - new Date(bKey).getTime();
};

const PatientPrescriptions: React.FC = () => {
  const { prescriptions, appointments } = useData();
  const { currentUser } = useAuth();
  const patientId = currentUser?.uid || '';
  const [activeTab, setActiveTab] = useState(0);

  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentReason, setAppointmentReason] = useState('Consulta de acompanhamento');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [appointmentSubmitting, setAppointmentSubmitting] = useState(false);
  const [requestedAppointments, setRequestedAppointments] = useState<PatientAppointment[]>([]);

  const [emergencyMessage, setEmergencyMessage] = useState('');
  const [emergencySubmitting, setEmergencySubmitting] = useState(false);
  const [lastEmergencyRequest, setLastEmergencyRequest] = useState<EmergencyRequest | null>(null);

  const [toast, setToast] = useState<{ open: boolean; severity: 'success' | 'error' | 'info'; message: string }>({
    open: false,
    severity: 'info',
    message: '',
  });

  const ownPrescriptions = useMemo<GenericPrescription[]>(() => {
    if (!patientId) {
      return [];
    }

    return prescriptions
      .filter((item: GenericPrescription) => String(item?.patientId || '') === patientId)
      .sort(byMostRecentPrescription);
  }, [patientId, prescriptions]);

  const ownAppointments = useMemo<PatientAppointment[]>(() => {
    if (!patientId) {
      return [];
    }

    return (appointments as PatientAppointment[])
      .filter((item) => String(item?.patientId || '') === patientId)
      .sort(byUpcomingAppointment);
  }, [appointments, patientId]);

  const combinedAppointments = useMemo<PatientAppointment[]>(() => {
    const byId = new Map<string, PatientAppointment>();
    ownAppointments.forEach((appointment) => {
      byId.set(String(appointment.id), appointment);
    });
    requestedAppointments.forEach((appointment) => {
      byId.set(String(appointment.id), appointment);
    });

    return Array.from(byId.values()).sort(byUpcomingAppointment);
  }, [ownAppointments, requestedAppointments]);

  const nextAppointmentReminder = useMemo<PatientAppointment | null>(() => {
    const now = Date.now();
    for (const appointment of combinedAppointments) {
      const status = String(appointment.status || '').toLowerCase();
      if (status === 'cancelled' || status === 'completed') {
        continue;
      }

      const timestamp = new Date(`${appointment.date || ''}T${appointment.time || '00:00'}`).getTime();
      if (!Number.isNaN(timestamp) && timestamp >= now) {
        return appointment;
      }
    }
    return combinedAppointments[0] || null;
  }, [combinedAppointments]);

  const emergencyCallUrl = useMemo(
    () => normalizeVideoCallUrl(lastEmergencyRequest?.videoCallUrl || '', lastEmergencyRequest?.videoCallRoom || ''),
    [lastEmergencyRequest?.videoCallRoom, lastEmergencyRequest?.videoCallUrl]
  );

  useEffect(() => {
    const now = new Date();
    setAppointmentDate(now.toISOString().slice(0, 10));
    setAppointmentTime('09:00');
  }, []);

  useEffect(() => {
    if (!patientId) {
      setLastEmergencyRequest(null);
      return;
    }

    let cancelled = false;
    const loadLatestEmergencyRequest = async () => {
      const token = getAuthToken();
      if (!token) {
        return;
      }

      try {
        const response = await fetch(`${getApiBaseUrl()}/api/patient/emergency/latest`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        if (!cancelled) {
          setLastEmergencyRequest(payload?.request || null);
        }
      } catch {
        // Silent refresh failure for background polling.
      }
    };

    loadLatestEmergencyRequest();
    const intervalId = window.setInterval(loadLatestEmergencyRequest, 12000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [patientId]);

  const showToast = (severity: 'success' | 'error' | 'info', message: string) => {
    setToast({ open: true, severity, message });
  };

  const closeToast = () => {
    setToast((prev) => ({ ...prev, open: false }));
  };

  const copyEmergencyCallInfo = async () => {
    if (!emergencyCallUrl) {
      return;
    }

    const info = [
      `Link: ${emergencyCallUrl || '-'}`,
      `Sala: ${lastEmergencyRequest?.videoCallRoom || '-'}`,
      `Codigo: ${lastEmergencyRequest?.videoCallAccessCode || '-'}`,
    ].join('\n');

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(info);
        showToast('success', 'Dados da videochamada copiados.');
      } else {
        throw new Error('clipboard-nao-disponivel');
      }
    } catch {
      showToast('error', 'Nao foi possivel copiar os dados da videochamada.');
    }
  };

  const handleScheduleAppointment = async () => {
    const token = getAuthToken();
    if (!token) {
      showToast('error', 'Sessao invalida. Faca login novamente.');
      return;
    }

    if (!appointmentDate || !appointmentTime) {
      showToast('error', 'Informe data e hora para solicitar a consulta.');
      return;
    }

    setAppointmentSubmitting(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/patient/appointments/request`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: appointmentDate,
          time: appointmentTime,
          reason: appointmentReason,
          notes: appointmentNotes,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Nao foi possivel agendar a consulta.');
      }

      const doctorName = payload?.doctor?.name ? ` com ${payload.doctor.name}` : '';
      showToast('success', `Consulta solicitada${doctorName}.`);
      if (payload?.appointment && payload.appointment.id) {
        setRequestedAppointments((prev) => [payload.appointment as PatientAppointment, ...prev]);
      }
      setAppointmentNotes('');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Erro ao solicitar consulta.');
    } finally {
      setAppointmentSubmitting(false);
    }
  };

  const handleEmergencyRequest = async () => {
    const token = getAuthToken();
    if (!token) {
      showToast('error', 'Sessao invalida. Faca login novamente.');
      return;
    }

    setEmergencySubmitting(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/patient/emergency/request`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: emergencyMessage,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Nao foi possivel enviar a solicitacao de emergencia.');
      }

      setLastEmergencyRequest(payload.request as EmergencyRequest);
      showToast('success', 'Solicitacao de emergencia enviada para os medicos online.');
      setEmergencyMessage('');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Erro ao solicitar emergencia.');
    } finally {
      setEmergencySubmitting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1.5 }}>
        Area do Paciente
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Aqui voce pode revisar prescricoes anteriores, agendar consulta com seu medico e solicitar emergencia.
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, tab) => setActiveTab(tab)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="abas do paciente"
        >
          <Tab label="Prescricoes anteriores" />
          <Tab label="Agendar consulta" />
          <Tab label="Emergencia" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <>
          <Alert severity="info" sx={{ mb: 2.5 }}>
            Voce visualiza somente prescricoes vinculadas ao seu cadastro.
          </Alert>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Validade</TableCell>
                  <TableCell>Medicamentos</TableCell>
                  <TableCell>Orientacoes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ownPrescriptions.map((prescription) => {
                  const medicationNames = extractMedicationNames(prescription);
                  return (
                    <TableRow key={String(prescription.id)}>
                      <TableCell>{formatDate(prescription.date)}</TableCell>
                      <TableCell>{formatDate(prescription.validUntil)}</TableCell>
                      <TableCell>
                        {medicationNames.length > 0 ? (
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            {medicationNames.map((name: string) => (
                              <Chip key={`${prescription.id}_${name}`} size="small" label={name} sx={{ mb: 0.5 }} />
                            ))}
                          </Stack>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{prescription.instructions || '-'}</TableCell>
                    </TableRow>
                  );
                })}

                {ownPrescriptions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      Nenhuma prescricao anterior encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {activeTab === 1 && (
        <Stack spacing={2.5}>
          <Alert severity="info">Escolha no calendario o dia e a hora desejada para agendar com seu medico.</Alert>

          {nextAppointmentReminder && (
            <Alert severity="success">
              Lembrete: proxima consulta em {formatDate(nextAppointmentReminder.date)} as {nextAppointmentReminder.time || '--:--'}.
              Motivo: {nextAppointmentReminder.reason || 'Consulta de acompanhamento'}.
            </Alert>
          )}

          <Paper sx={{ p: 2.5 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Data"
                type="date"
                value={appointmentDate}
                onChange={(event) => setAppointmentDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Hora"
                type="time"
                value={appointmentTime}
                onChange={(event) => setAppointmentTime(event.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                inputProps={{ step: 300 }}
              />
            </Stack>

            <TextField
              sx={{ mt: 2 }}
              label="Motivo"
              value={appointmentReason}
              onChange={(event) => setAppointmentReason(event.target.value)}
              fullWidth
            />

            <TextField
              sx={{ mt: 2 }}
              label="Observacoes"
              value={appointmentNotes}
              onChange={(event) => setAppointmentNotes(event.target.value)}
              fullWidth
              multiline
              minRows={2}
            />

            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
              <Button variant="contained" onClick={handleScheduleAppointment} disabled={appointmentSubmitting}>
                {appointmentSubmitting ? 'Enviando...' : 'Solicitar consulta'}
              </Button>
            </Stack>
          </Paper>

          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Consultas solicitadas
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
            {combinedAppointments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Nenhuma consulta solicitada ainda.
              </Typography>
            ) : (
              <Stack spacing={1.2}>
                {combinedAppointments.map((appointment) => (
                  <Paper key={appointment.id} variant="outlined" sx={{ p: 1.25 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {formatDate(appointment.date)} as {appointment.time || '--:--'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {appointment.reason || 'Consulta solicitada pelo paciente'}
                        </Typography>
                        {appointment.notes && (
                          <Typography variant="caption" color="text.secondary">
                            Observacoes: {appointment.notes}
                          </Typography>
                        )}
                      </Box>
                      <Chip
                        size="small"
                        label={appointment.status || 'scheduled'}
                        color={appointment.status === 'cancelled' ? 'default' : 'primary'}
                        variant={appointment.status === 'completed' ? 'outlined' : 'filled'}
                      />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Stack>
      )}

      {activeTab === 2 && (
        <Stack spacing={2.5}>
          <Alert severity="warning">
            Use esta opcao para acionar emergencia. A solicitacao aparece para todos os medicos enquanto voce estiver online.
          </Alert>

          <Paper sx={{ p: 2.5 }}>
            <TextField
              label="Descreva rapidamente a emergencia"
              value={emergencyMessage}
              onChange={(event) => setEmergencyMessage(event.target.value)}
              fullWidth
              multiline
              minRows={3}
              placeholder="Ex: dor intensa, falta de ar, sangramento..."
            />

            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
              <Button color="error" variant="contained" onClick={handleEmergencyRequest} disabled={emergencySubmitting}>
                {emergencySubmitting ? 'Enviando...' : 'Solicitar emergencia'}
              </Button>
            </Stack>
          </Paper>

          {lastEmergencyRequest && (
            <Stack spacing={1.2}>
              <Alert severity={lastEmergencyRequest.status === 'open' ? 'info' : 'success'}>
                Ultima solicitacao: {lastEmergencyRequest.status} em {formatDateTime(lastEmergencyRequest.updatedAt)}.
                {lastEmergencyRequest.attendingDoctorName
                  ? ` Em atendimento por ${lastEmergencyRequest.attendingDoctorName}.`
                  : ''}
              </Alert>

              {lastEmergencyRequest.status === 'open' && !!emergencyCallUrl && (
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Videochamada disponivel
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Atendimento iniciado em {formatDateTime(lastEmergencyRequest.videoCallStartedAt)} via{' '}
                        {normalizeVideoCallProvider(lastEmergencyRequest.videoCallProvider)}.
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Sala: {lastEmergencyRequest.videoCallRoom || '-'} | Codigo: {lastEmergencyRequest.videoCallAccessCode || '-'}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconButton color="primary" onClick={copyEmergencyCallInfo} aria-label="copiar dados da chamada">
                        <ContentCopyIcon />
                      </IconButton>
                      <Button
                        variant="contained"
                        color="error"
                        onClick={() => window.open(String(emergencyCallUrl), '_blank', 'noopener,noreferrer')}
                      >
                        Entrar na videochamada
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              )}
            </Stack>
          )}
        </Stack>
      )}

      <Snackbar open={toast.open} autoHideDuration={5000} onClose={closeToast} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={closeToast} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PatientPrescriptions;
