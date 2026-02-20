import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  DragIndicator as DragIndicatorIcon,
  FileDownload as FileDownloadIcon,
  OpenInNew as OpenInNewIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { buildVideoCallUrl, normalizeVideoCallProvider } from '../utils/videoCall';

type TeleMode = 'appointment' | 'emergency';

interface EmergencyRequestState {
  id: string;
  patientId: string;
  patientName?: string;
  patientPhone?: string;
  patientEmail?: string;
  message?: string;
  videoCallUrl?: string | null;
  videoCallRoom?: string | null;
  videoCallAccessCode?: string | null;
  videoCallProvider?: string | null;
}

interface AppointmentState {
  id: string;
  patientId: string;
  date: string;
  time: string;
  reason?: string;
  videoCallUrl?: string;
  videoCallRoom?: string;
  videoCallAccessCode?: string;
  videoCallProvider?: string;
}

interface TeleconsultationLocationState {
  mode?: TeleMode;
  request?: EmergencyRequestState;
  appointment?: AppointmentState;
}

const DEFAULT_MEVO_URL = process.env.REACT_APP_MEVO_LOGIN_URL || 'https://receita.mevosaude.com.br';
const DEFAULT_MEVO_EMBED_URL = process.env.REACT_APP_MEVO_EMBED_URL || '';
const VIDEO_PANEL_WIDTH = 420;
const VIDEO_PANEL_HEIGHT = 460;

const createLocalId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};

const safeSlug = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 40);

const buildAppointmentCallData = (appointmentId: string) => {
  const room = `neomed-consulta-${safeSlug(appointmentId) || Date.now()}`;
  const accessCode = safeSlug(appointmentId).slice(-6).toUpperCase() || 'ACESSO';
  const videoCallUrl = buildVideoCallUrl(room);
  return {
    videoCallRoom: room,
    videoCallAccessCode: accessCode,
    videoCallUrl,
    videoCallProvider: 'twilio',
  };
};

const getGenderLabel = (gender?: string) => {
  if (gender === 'male') return 'Masculino';
  if (gender === 'female') return 'Feminino';
  if (gender === 'other') return 'Outro';
  return '';
};

const formatDateToBR = (value?: string) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString('pt-BR');
};

const escapeCsvValue = (value: string) => {
  const normalized = value ?? '';
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
};

const Teleconsultation: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { appointments, medicalRecords, addMedicalRecord, updateMedicalRecord, updateAppointment, getPatient } = useData();

  const locationState = (location.state || {}) as TeleconsultationLocationState;
  const mode = (searchParams.get('mode') || locationState.mode || 'appointment') as TeleMode;
  const appointmentIdFromRoute = searchParams.get('appointmentId') || locationState.appointment?.id || '';

  const appointment = useMemo(() => {
    if (mode !== 'appointment' || !appointmentIdFromRoute) {
      return null;
    }

    const fromRoute = appointments.find((item) => String(item.id || '') === appointmentIdFromRoute) || null;
    if (!fromRoute) {
      return locationState.appointment || null;
    }

    return {
      ...fromRoute,
      ...(locationState.appointment || {}),
    } as AppointmentState;
  }, [appointments, appointmentIdFromRoute, locationState.appointment, mode]);

  const emergencyRequest = useMemo(() => {
    if (mode !== 'emergency') {
      return null;
    }

    return locationState.request || null;
  }, [locationState.request, mode]);

  const patientId = String(appointment?.patientId || emergencyRequest?.patientId || '');
  const patient = getPatient(patientId);
  const patientName = patient?.name || emergencyRequest?.patientName || 'Paciente';

  const callData = useMemo(() => {
    if (mode === 'emergency' && emergencyRequest) {
      return {
        videoCallUrl: String(emergencyRequest.videoCallUrl || ''),
        videoCallRoom: String(emergencyRequest.videoCallRoom || ''),
        videoCallAccessCode: String(emergencyRequest.videoCallAccessCode || ''),
        videoCallProvider: normalizeVideoCallProvider(emergencyRequest.videoCallProvider),
      };
    }

    if (appointment) {
      const generated = buildAppointmentCallData(String(appointment.id || appointmentIdFromRoute));
      return {
        videoCallUrl: String(appointment.videoCallUrl || generated.videoCallUrl),
        videoCallRoom: String(appointment.videoCallRoom || generated.videoCallRoom),
        videoCallAccessCode: String(appointment.videoCallAccessCode || generated.videoCallAccessCode),
        videoCallProvider: normalizeVideoCallProvider(appointment.videoCallProvider || generated.videoCallProvider),
      };
    }

    return {
      videoCallUrl: '',
      videoCallRoom: '',
      videoCallAccessCode: '',
      videoCallProvider: 'twilio',
    };
  }, [appointment, appointmentIdFromRoute, emergencyRequest, mode]);

  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [mevoPrescription, setMevoPrescription] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const hasContext = Boolean(
    (mode === 'appointment' && appointment && appointmentIdFromRoute) || (mode === 'emergency' && emergencyRequest)
  );
  const hasVideoCall = Boolean(callData.videoCallUrl);

  const [videoPanelPos, setVideoPanelPos] = useState({ x: 24, y: 88 });
  const [videoPanelReady, setVideoPanelReady] = useState(false);
  const [draggingPanel, setDraggingPanel] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const clampPanelPosition = useCallback((x: number, y: number) => {
    if (typeof window === 'undefined') {
      return { x, y };
    }

    const margin = 10;
    const maxX = Math.max(margin, window.innerWidth - VIDEO_PANEL_WIDTH - margin);
    const maxY = Math.max(margin, window.innerHeight - VIDEO_PANEL_HEIGHT - margin);

    return {
      x: Math.min(Math.max(margin, x), maxX),
      y: Math.min(Math.max(margin, y), maxY),
    };
  }, []);

  useEffect(() => {
    if (!hasVideoCall || isMobile || videoPanelReady || typeof window === 'undefined') {
      return;
    }

    setVideoPanelPos(clampPanelPosition(window.innerWidth - VIDEO_PANEL_WIDTH - 22, 92));
    setVideoPanelReady(true);
  }, [clampPanelPosition, hasVideoCall, isMobile, videoPanelReady]);

  useEffect(() => {
    if (isMobile || typeof window === 'undefined') {
      return;
    }

    const onResize = () => {
      setVideoPanelPos((prev) => clampPanelPosition(prev.x, prev.y));
    };

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, [clampPanelPosition, isMobile]);

  useEffect(() => {
    if (!draggingPanel || isMobile) {
      return;
    }

    const onMouseMove = (event: MouseEvent) => {
      const nextX = event.clientX - dragOffsetRef.current.x;
      const nextY = event.clientY - dragOffsetRef.current.y;
      setVideoPanelPos(clampPanelPosition(nextX, nextY));
    };

    const onMouseUp = () => {
      setDraggingPanel(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [clampPanelPosition, draggingPanel, isMobile]);

  const startDragVideoPanel = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile) {
      return;
    }

    setDraggingPanel(true);
    dragOffsetRef.current = {
      x: event.clientX - videoPanelPos.x,
      y: event.clientY - videoPanelPos.y,
    };
  };

  const saveSoap = (finishAppointment = false) => {
    if (!patientId) {
      setFeedback({ type: 'error', message: 'Paciente não identificado para salvar SOAP.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const consultationDate = nowIso.slice(0, 10);
    const planWithMevo = mevoPrescription
      ? `${plan}\n\nPrescrição Mevo:\n${mevoPrescription}`.trim()
      : plan.trim();

    const consultation = {
      id: createLocalId(),
      date: consultationDate,
      subjective: subjective.trim(),
      objective: objective.trim(),
      assessment: assessment.trim(),
      plan: planWithMevo,
      vitals: {},
      examTexts: [],
      examAttachments: [],
    };

    const existingRecord = medicalRecords.find((record) => String(record.patientId || '') === patientId);

    if (existingRecord) {
      const existingConsultations = Array.isArray(existingRecord.consultations) ? existingRecord.consultations : [];
      updateMedicalRecord(existingRecord.id, {
        date: consultationDate,
        diagnosis: consultation.assessment,
        treatment: consultation.plan,
        notes: consultation.subjective,
        consultations: [consultation, ...existingConsultations],
        updatedAt: nowIso,
      });
    } else {
      addMedicalRecord({
        patientId,
        date: consultationDate,
        diagnosis: consultation.assessment,
        treatment: consultation.plan,
        notes: consultation.subjective,
        consultations: [consultation],
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }

    if (finishAppointment && mode === 'appointment' && appointmentIdFromRoute) {
      updateAppointment(appointmentIdFromRoute, { status: 'completed' });
    }

    setFeedback({
      type: 'success',
      message:
        finishAppointment && mode === 'appointment'
          ? 'SOAP salvo e consulta finalizada.'
          : 'SOAP salvo no prontuário.',
    });
  };

  const copyCallData = async () => {
    if (!hasVideoCall) {
      return;
    }

    const content = [
      `Link: ${callData.videoCallUrl || '-'}`,
      `Sala: ${callData.videoCallRoom || '-'}`,
      `Código: ${callData.videoCallAccessCode || '-'}`,
    ].join('\n');

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
        setFeedback({ type: 'success', message: 'Dados da chamada copiados.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Não foi possível copiar os dados da chamada.' });
    }
  };

  const handleDownloadPatientCsv = () => {
    const targetPatient = patient || emergencyRequest;
    if (!targetPatient) {
      setFeedback({ type: 'info', message: 'Selecione um paciente para baixar os dados em CSV.' });
      return;
    }

    const header = ['Nome Completo', 'Celular', 'CPF', 'Sexo', 'Data de Nascimento', 'Email'];
    const row = [
      String((targetPatient as any).name || emergencyRequest?.patientName || patientName || ''),
      String((targetPatient as any).phone || emergencyRequest?.patientPhone || ''),
      String((targetPatient as any).cpf || ''),
      getGenderLabel(String((targetPatient as any).gender || '')),
      formatDateToBR(String((targetPatient as any).dateOfBirth || (targetPatient as any).birthDate || '')),
      String((targetPatient as any).email || ''),
    ];

    const csvContent = `${header.join(',')}\n${row.map((item) => escapeCsvValue(String(item || ''))).join(',')}\n`;
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = String((targetPatient as any).name || 'paciente')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();

    link.href = url;
    link.download = `${safeName || 'paciente'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setFeedback({ type: 'success', message: 'CSV do paciente baixado com sucesso.' });
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1.5} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4">Atendimento por Vídeo</Typography>
          <Typography variant="body2" color="text.secondary">
            {mode === 'emergency' ? 'Fluxo de emergência' : 'Consulta agendada'} • Paciente: {patientName}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate('/agendamentos')}>
            Voltar
          </Button>
          {hasVideoCall && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<OpenInNewIcon />}
              onClick={() => window.open(callData.videoCallUrl, '_blank', 'noopener,noreferrer')}
            >
              Abrir vídeo em nova aba
            </Button>
          )}
        </Stack>
      </Stack>

      {feedback && (
        <Alert severity={feedback.type} sx={{ mb: 2 }}>
          {feedback.message}
        </Alert>
      )}

      {!hasContext && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Contexto da teleconsulta não encontrado. Inicie a chamada pela agenda ou pela emergência.
        </Alert>
      )}

      <Box>
        <Paper sx={{ p: 2.25 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            SOAP
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <TextField
            label="S - Subjetivo"
            value={subjective}
            onChange={(event) => setSubjective(event.target.value)}
            multiline
            minRows={5}
            fullWidth
            sx={{ mb: 2 }}
            placeholder="Queixa principal, história clínica e relato do paciente..."
          />

          <TextField
            label="O - Objetivo"
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
            multiline
            minRows={5}
            fullWidth
            sx={{ mb: 2 }}
            placeholder="Exame físico, sinais vitais e achados objetivos..."
          />

          <TextField
            label="A - Avaliação"
            value={assessment}
            onChange={(event) => setAssessment(event.target.value)}
            multiline
            minRows={4}
            fullWidth
            sx={{ mb: 2 }}
            placeholder="Hipótese diagnóstica e avaliação clínica..."
          />

          <TextField
            label="P - Plano"
            value={plan}
            onChange={(event) => setPlan(event.target.value)}
            multiline
            minRows={5}
            fullWidth
            sx={{ mb: 2 }}
            placeholder="Conduta, exames, orientações e retorno..."
          />

          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Prescrição Mevo (final)
            </Typography>
            <TextField
              label="Resumo / token / observação da prescrição Mevo"
              value={mevoPrescription}
              onChange={(event) => setMevoPrescription(event.target.value)}
              multiline
              minRows={7}
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.4, mb: 1.4 }}>
              <Button variant="contained" onClick={() => window.open(DEFAULT_MEVO_URL, '_blank', 'noopener,noreferrer')}>
                Abrir Mevo
              </Button>
              <Tooltip title={patient ? 'Baixar dados do paciente (CSV)' : 'Paciente não disponível'}>
                <span>
                  <Button
                    variant="outlined"
                    startIcon={<FileDownloadIcon />}
                    onClick={handleDownloadPatientCsv}
                    disabled={!patient && !emergencyRequest}
                  >
                    Baixar CSV do Paciente
                  </Button>
                </span>
              </Tooltip>
              <Button variant="outlined" onClick={() => navigate('/prescricoes')}>
                Ir para Prescrições
              </Button>
            </Stack>

            {DEFAULT_MEVO_EMBED_URL ? (
              <Box
                component="iframe"
                src={DEFAULT_MEVO_EMBED_URL}
                title="Mevo"
                sx={{ width: '100%', height: 560, border: '1px solid #d7e2ea', borderRadius: 1.5 }}
              />
            ) : (
              <Alert severity="info">
                Configure <code>REACT_APP_MEVO_EMBED_URL</code> para visualizar o portal Mevo ampliado nesta tela.
              </Alert>
            )}
          </Paper>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={() => saveSoap(false)}>
              Salvar SOAP
            </Button>
            {mode === 'appointment' && (
              <Button color="success" variant="contained" onClick={() => saveSoap(true)}>
                Salvar e Encerrar Consulta
              </Button>
            )}
          </Stack>
        </Paper>
      </Box>

      {hasVideoCall && (
        <Paper
          elevation={8}
          sx={
            isMobile
              ? { mt: 2, p: 1.5 }
              : {
                  position: 'fixed',
                  left: `${videoPanelPos.x}px`,
                  top: `${videoPanelPos.y}px`,
                  width: `${VIDEO_PANEL_WIDTH}px`,
                  zIndex: 1400,
                  p: 1.25,
                  border: '1px solid #d7e2ea',
                  cursor: draggingPanel ? 'grabbing' : 'default',
                }
          }
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            onMouseDown={startDragVideoPanel}
            sx={{
              px: 0.5,
              py: 0.6,
              mb: 1,
              borderRadius: 1,
              backgroundColor: '#f3f8fc',
              cursor: isMobile ? 'default' : draggingPanel ? 'grabbing' : 'grab',
              userSelect: 'none',
            }}
          >
            <Stack direction="row" spacing={0.6} alignItems="center">
              {!isMobile && <DragIndicatorIcon fontSize="small" color="action" />}
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Vídeo da consulta
              </Typography>
            </Stack>
            <Chip size="small" label={normalizeVideoCallProvider(callData.videoCallProvider)} />
          </Stack>

          <Box
            component="iframe"
            src={callData.videoCallUrl}
            title="Videochamada"
            allow="camera; microphone; fullscreen; display-capture"
            sx={{
              width: '100%',
              height: 250,
              border: '1px solid #d7e2ea',
              borderRadius: 1.5,
              mb: 1.2,
            }}
          />

          <Typography variant="caption" color="text.secondary" display="block">
            Sala: {callData.videoCallRoom || '-'}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Código: {callData.videoCallAccessCode || '-'}
          </Typography>

          <Stack direction="row" spacing={1}>
            <Button fullWidth variant="outlined" startIcon={<ContentCopyIcon />} onClick={copyCallData}>
              Copiar dados
            </Button>
            <Button
              fullWidth
              variant="contained"
              startIcon={<OpenInNewIcon />}
              onClick={() => window.open(callData.videoCallUrl, '_blank', 'noopener,noreferrer')}
            >
              Expandir
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default Teleconsultation;
