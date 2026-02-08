import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Alert,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AssignmentInd as PatientIcon,
  Description as NotesIcon,
  Favorite as HeartIcon,
  Medication as MedicationIcon,
  Search as SearchIcon,
  LocalHospital as DiagnosisIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Download as DownloadIcon,
  UploadFile as UploadFileIcon,
  EventNote as EventNoteIcon,
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MedicalConsultation, MedicalExamAttachment, MedicalRecord } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface NormalizedMedicalRecord extends MedicalRecord {
  consultations: MedicalConsultation[];
}

const todayIso = () => format(new Date(), 'yyyy-MM-dd');

const createLocalId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};

const createEmptyVitals = () => ({
  bloodPressure: '',
  heartRate: '',
  temperature: '',
  respiratoryRate: '',
  oxygenSaturation: '',
  weight: '',
  height: '',
});

const createEmptyConsultation = (): MedicalConsultation => ({
  id: createLocalId(),
  date: todayIso(),
  subjective: '',
  objective: '',
  assessment: '',
  plan: '',
  vitals: createEmptyVitals(),
  examTexts: [],
  examAttachments: [],
});

const normalizeAttachment = (attachment: any): MedicalExamAttachment | null => {
  if (!attachment || typeof attachment !== 'object') {
    return null;
  }

  if (!attachment.dataUrl || !attachment.fileName) {
    return null;
  }

  return {
    id: String(attachment.id || createLocalId()),
    fileName: String(attachment.fileName),
    mimeType: String(attachment.mimeType || 'application/pdf'),
    dataUrl: String(attachment.dataUrl),
    uploadedAt: String(attachment.uploadedAt || new Date().toISOString()),
  };
};

const normalizeConsultation = (source: any, fallbackDate: string): MedicalConsultation => {
  const examTexts = Array.isArray(source?.examTexts)
    ? source.examTexts.map((item: any) => String(item)).filter(Boolean)
    : Array.isArray(source?.exams)
    ? source.exams.map((item: any) => String(item)).filter(Boolean)
    : [];

  const examAttachments = Array.isArray(source?.examAttachments)
    ? source.examAttachments
        .map(normalizeAttachment)
        .filter((item: MedicalExamAttachment | null): item is MedicalExamAttachment => Boolean(item))
    : [];

  return {
    id: String(source?.id || createLocalId()),
    date: String(source?.date || fallbackDate || todayIso()),
    subjective: String(source?.subjective || source?.notes || ''),
    objective: String(source?.objective || ''),
    assessment: String(source?.assessment || source?.diagnosis || ''),
    plan: String(source?.plan || source?.treatment || ''),
    vitals: {
      ...createEmptyVitals(),
      ...(source?.vitals || {}),
    },
    examTexts,
    examAttachments,
  };
};

const normalizeRecord = (record: any): NormalizedMedicalRecord => {
  const fallbackDate = String(record?.date || todayIso());
  const consultations = Array.isArray(record?.consultations) && record.consultations.length > 0
    ? record.consultations.map((item: any) => normalizeConsultation(item, fallbackDate))
    : [normalizeConsultation(record, fallbackDate)];

  const sortedConsultations = [...consultations].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const latest = sortedConsultations[0];

  return {
    ...(record || {}),
    id: String(record?.id || createLocalId()),
    patientId: String(record?.patientId || ''),
    date: String(record?.date || latest?.date || todayIso()),
    diagnosis: String(record?.diagnosis || latest?.assessment || ''),
    treatment: String(record?.treatment || latest?.plan || ''),
    notes: String(record?.notes || latest?.subjective || ''),
    createdAt: String(record?.createdAt || record?.date || latest?.date || new Date().toISOString()),
    updatedAt: String(record?.updatedAt || new Date().toISOString()),
    consultations: sortedConsultations,
  };
};

const getLatestConsultation = (consultations: MedicalConsultation[]): MedicalConsultation | null => {
  if (!consultations.length) {
    return null;
  }

  return [...consultations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
};

const buildMedicalRecordPayload = (
  patientId: string,
  consultations: MedicalConsultation[],
  existing?: Partial<MedicalRecord>
): Omit<MedicalRecord, 'id'> => {
  const sortedConsultations = [...consultations].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const latest = getLatestConsultation(sortedConsultations);

  return {
    patientId,
    date: latest?.date || todayIso(),
    diagnosis: latest?.assessment || '',
    treatment: latest?.plan || '',
    notes: latest?.subjective || '',
    consultations: sortedConsultations,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`medicalrecord-tabpanel-${index}`}
      aria-labelledby={`medicalrecord-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

const downloadDataUrl = (dataUrl: string, fileName: string) => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const ConsultationCard: React.FC<{
  consultation: MedicalConsultation;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ consultation, onEdit, onDelete }) => {
  const [tabValue, setTabValue] = useState(0);

  return (
    <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          pt: 1.5,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Consulta de {format(new Date(consultation.date), 'dd/MM/yyyy', { locale: ptBR })}
        </Typography>
        <Box>
          <IconButton size="small" color="primary" onClick={onEdit}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={onDelete}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Subjetivo" />
          <Tab label="Objetivo" />
          <Tab label="Avaliação" />
          <Tab label="Plano" />
          <Tab label="Exames" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Typography variant="body2">{consultation.subjective || 'Sem conteúdo.'}</Typography>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {consultation.objective || 'Sem conteúdo.'}
        </Typography>
        {consultation.vitals && Object.values(consultation.vitals).some(Boolean) && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {consultation.vitals.bloodPressure && (
              <Chip size="small" label={`P.A.: ${consultation.vitals.bloodPressure} mmHg`} />
            )}
            {consultation.vitals.heartRate && <Chip size="small" label={`F.C.: ${consultation.vitals.heartRate} bpm`} />}
            {consultation.vitals.temperature && <Chip size="small" label={`Temp.: ${consultation.vitals.temperature} °C`} />}
            {consultation.vitals.respiratoryRate && (
              <Chip size="small" label={`F.R.: ${consultation.vitals.respiratoryRate} rpm`} />
            )}
            {consultation.vitals.oxygenSaturation && (
              <Chip size="small" label={`SpO2: ${consultation.vitals.oxygenSaturation}%`} />
            )}
            {consultation.vitals.weight && <Chip size="small" label={`Peso: ${consultation.vitals.weight} kg`} />}
            {consultation.vitals.height && <Chip size="small" label={`Altura: ${consultation.vitals.height} cm`} />}
          </Box>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Typography variant="body2">{consultation.assessment || 'Sem conteúdo.'}</Typography>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Typography variant="body2">{consultation.plan || 'Sem conteúdo.'}</Typography>
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        {consultation.examTexts && consultation.examTexts.length > 0 ? (
          <Box sx={{ mb: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {consultation.examTexts.map((exam, index) => (
              <Chip key={`${consultation.id}-exam-${index}`} label={exam} size="small" />
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Sem exames em texto.
          </Typography>
        )}

        {consultation.examAttachments && consultation.examAttachments.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {consultation.examAttachments.map((attachment) => (
              <Box
                key={attachment.id}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
              >
                <Chip icon={<PictureAsPdfIcon />} label={attachment.fileName} size="small" color="info" />
                <Button
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={() => downloadDataUrl(attachment.dataUrl, attachment.fileName)}
                >
                  Baixar
                </Button>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Sem exames em PDF.
          </Typography>
        )}
      </TabPanel>
    </Paper>
  );
};

const MedicalRecords: React.FC = () => {
  const { medicalRecords, patients, addMedicalRecord, updateMedicalRecord, deleteMedicalRecord } = useData();

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [dialogTab, setDialogTab] = useState(0);
  const [draftPatientId, setDraftPatientId] = useState<string>('');
  const [draftConsultation, setDraftConsultation] = useState<MedicalConsultation>(createEmptyConsultation());
  const [examTextInput, setExamTextInput] = useState('');
  const [editContext, setEditContext] = useState<{ recordId: string; consultationId: string } | null>(null);

  const normalizedRecords = useMemo(() => {
    return (medicalRecords as MedicalRecord[])
      .map((record) => normalizeRecord(record))
      .sort((a, b) => {
        const latestA = getLatestConsultation(a.consultations);
        const latestB = getLatestConsultation(b.consultations);
        return new Date(latestB?.date || 0).getTime() - new Date(latestA?.date || 0).getTime();
      });
  }, [medicalRecords]);

  const filteredRecords = useMemo(() => {
    if (!selectedPatientId) {
      return normalizedRecords;
    }

    return normalizedRecords.filter((record) => record.patientId === selectedPatientId);
  }, [normalizedRecords, selectedPatientId]);

  const getPatient = (patientId: string) => patients.find((patient) => patient.id === patientId);

  const resetDialog = (patientId: string = '') => {
    setEditContext(null);
    setDraftPatientId(patientId);
    setDraftConsultation(createEmptyConsultation());
    setExamTextInput('');
    setDialogTab(0);
  };

  const openNewConsultation = (patientId: string = '') => {
    resetDialog(patientId);
    setOpenDialog(true);
  };

  const openEditConsultation = (record: NormalizedMedicalRecord, consultation: MedicalConsultation) => {
    setEditContext({ recordId: record.id, consultationId: consultation.id });
    setDraftPatientId(record.patientId);
    setDraftConsultation({
      ...consultation,
      vitals: {
        ...createEmptyVitals(),
        ...(consultation.vitals || {}),
      },
      examTexts: [...(consultation.examTexts || [])],
      examAttachments: [...(consultation.examAttachments || [])],
    });
    setExamTextInput('');
    setDialogTab(0);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    resetDialog();
  };

  const handleConsultationChange = (field: keyof MedicalConsultation, value: string) => {
    setDraftConsultation((prev) => ({ ...prev, [field]: value }));
  };

  const handleVitalsChange = (field: string, value: string) => {
    setDraftConsultation((prev) => ({
      ...prev,
      vitals: {
        ...createEmptyVitals(),
        ...(prev.vitals || {}),
        [field]: value,
      },
    }));
  };

  const handleAddExamText = () => {
    const value = examTextInput.trim();
    if (!value) {
      return;
    }

    setDraftConsultation((prev) => ({
      ...prev,
      examTexts: [...(prev.examTexts || []), value],
    }));
    setExamTextInput('');
  };

  const handleRemoveExamText = (index: number) => {
    setDraftConsultation((prev) => ({
      ...prev,
      examTexts: (prev.examTexts || []).filter((_, idx) => idx !== index),
    }));
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Falha ao ler arquivo PDF.'));
      reader.readAsDataURL(file);
    });
  };

  const handleUploadExamPdf = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      window.alert('Selecione um PDF válido para exame.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      window.alert('O PDF do exame excede 25MB.');
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const attachment: MedicalExamAttachment = {
        id: createLocalId(),
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        dataUrl,
        uploadedAt: new Date().toISOString(),
      };

      setDraftConsultation((prev) => ({
        ...prev,
        examAttachments: [...(prev.examAttachments || []), attachment],
      }));
    } catch {
      window.alert('Não foi possível anexar o PDF do exame.');
    }
  };

  const handleRemoveExamAttachment = (attachmentId: string) => {
    setDraftConsultation((prev) => ({
      ...prev,
      examAttachments: (prev.examAttachments || []).filter((attachment) => attachment.id !== attachmentId),
    }));
  };

  const handleSaveConsultation = () => {
    if (!draftPatientId) {
      window.alert('Selecione o paciente da consulta.');
      return;
    }

    if (!draftConsultation.date) {
      window.alert('Informe a data da consulta.');
      return;
    }

    const consultationToSave: MedicalConsultation = {
      ...draftConsultation,
      id: draftConsultation.id || createLocalId(),
      date: draftConsultation.date || todayIso(),
      subjective: draftConsultation.subjective || '',
      objective: draftConsultation.objective || '',
      assessment: draftConsultation.assessment || '',
      plan: draftConsultation.plan || '',
      vitals: {
        ...createEmptyVitals(),
        ...(draftConsultation.vitals || {}),
      },
      examTexts: draftConsultation.examTexts || [],
      examAttachments: draftConsultation.examAttachments || [],
    };

    if (editContext) {
      const targetRecord = normalizedRecords.find((record) => record.id === editContext.recordId);
      if (!targetRecord) {
        window.alert('Prontuário não encontrado para atualização.');
        return;
      }

      const updatedConsultations = targetRecord.consultations.map((consultation) =>
        consultation.id === editContext.consultationId ? consultationToSave : consultation
      );

      updateMedicalRecord(
        targetRecord.id,
        buildMedicalRecordPayload(targetRecord.patientId, updatedConsultations, targetRecord)
      );

      handleCloseDialog();
      return;
    }

    const existingRecord = normalizedRecords.find((record) => record.patientId === draftPatientId);

    if (existingRecord) {
      const updatedConsultations = [consultationToSave, ...existingRecord.consultations];
      updateMedicalRecord(
        existingRecord.id,
        buildMedicalRecordPayload(existingRecord.patientId, updatedConsultations, existingRecord)
      );
    } else {
      addMedicalRecord(buildMedicalRecordPayload(draftPatientId, [consultationToSave]));
    }

    handleCloseDialog();
  };

  const handleDeleteConsultation = (record: NormalizedMedicalRecord, consultationId: string) => {
    if (!window.confirm('Deseja excluir esta consulta do prontuário?')) {
      return;
    }

    const remainingConsultations = record.consultations.filter((consultation) => consultation.id !== consultationId);

    if (!remainingConsultations.length) {
      if (window.confirm('Esta era a última consulta. Deseja excluir o prontuário inteiro do paciente?')) {
        deleteMedicalRecord(record.id);
      }
      return;
    }

    updateMedicalRecord(record.id, buildMedicalRecordPayload(record.patientId, remainingConsultations, record));
  };

  const handleDeleteRecord = (recordId: string) => {
    if (window.confirm('Tem certeza que deseja excluir todo o prontuário deste paciente?')) {
      deleteMedicalRecord(recordId);
    }
  };

  const getPatientName = (patientId: string) => {
    const patient = getPatient(patientId);
    return patient ? patient.name : 'Paciente não encontrado';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Prontuários Médicos</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openNewConsultation()}>
          Nova Consulta
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel id="patient-filter-label">Filtrar por Paciente</InputLabel>
          <Select
            labelId="patient-filter-label"
            value={selectedPatientId}
            label="Filtrar por Paciente"
            onChange={(e) => setSelectedPatientId(e.target.value as string)}
          >
            <MenuItem value="">Todos os Pacientes</MenuItem>
            {patients.map((patient) => (
              <MenuItem key={patient.id} value={patient.id}>
                {patient.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {filteredRecords.length > 0 ? (
        filteredRecords.map((record) => {
          const patient = getPatient(record.patientId);
          return (
            <Paper key={record.id} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} mb={2}>
                <Box>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PatientIcon fontSize="small" />
                    {patient?.name || 'Paciente não encontrado'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Consultas no prontuário: {record.consultations.length}
                  </Typography>
                  {patient?.cpf && (
                    <Typography variant="body2" color="text.secondary">
                      CPF: {patient.cpf}
                    </Typography>
                  )}
                </Box>

                <Box display="flex" gap={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => openNewConsultation(record.patientId)}
                  >
                    Nova consulta
                  </Button>
                  <IconButton color="error" size="small" onClick={() => handleDeleteRecord(record.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {record.consultations.map((consultation) => (
                <ConsultationCard
                  key={consultation.id}
                  consultation={consultation}
                  onEdit={() => openEditConsultation(record, consultation)}
                  onDelete={() => handleDeleteConsultation(record, consultation.id)}
                />
              ))}
            </Paper>
          );
        })
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nenhum prontuário encontrado
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedPatientId
              ? 'Não existem prontuários para o paciente selecionado.'
              : 'Clique em "Nova Consulta" para iniciar o prontuário do paciente.'}
          </Typography>
        </Paper>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editContext ? 'Editar Consulta' : 'Nova Consulta no Prontuário'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel id="dialog-patient-label">Paciente</InputLabel>
                <Select
                  labelId="dialog-patient-label"
                  value={draftPatientId}
                  label="Paciente"
                  onChange={(e) => setDraftPatientId(e.target.value as string)}
                  disabled={Boolean(editContext)}
                >
                  {patients.map((patient) => (
                    <MenuItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Data da Consulta"
                value={draftConsultation.date}
                onChange={(e) => handleConsultationChange('date', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={dialogTab}
              onChange={(_, newValue) => setDialogTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="Subjetivo" />
              <Tab label="Objetivo" />
              <Tab label="Avaliação" />
              <Tab label="Plano" />
              <Tab label="Exames" />
            </Tabs>
          </Box>

          <TabPanel value={dialogTab} index={0}>
            <TextField
              fullWidth
              multiline
              minRows={6}
              label="Subjetivo (S)"
              value={draftConsultation.subjective || ''}
              onChange={(e) => handleConsultationChange('subjective', e.target.value)}
              placeholder="Queixa principal, história da doença atual, percepções do paciente..."
            />
          </TabPanel>

          <TabPanel value={dialogTab} index={1}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Objetivo (O)"
                  value={draftConsultation.objective || ''}
                  onChange={(e) => handleConsultationChange('objective', e.target.value)}
                  placeholder="Achados do exame físico e dados objetivos da consulta..."
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HeartIcon fontSize="small" />
                  Sinais Vitais
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Pressão Arterial (mmHg)"
                  value={draftConsultation.vitals?.bloodPressure || ''}
                  onChange={(e) => handleVitalsChange('bloodPressure', e.target.value)}
                  placeholder="Ex: 120/80"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Frequência Cardíaca (bpm)"
                  value={draftConsultation.vitals?.heartRate || ''}
                  onChange={(e) => handleVitalsChange('heartRate', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Temperatura (°C)"
                  value={draftConsultation.vitals?.temperature || ''}
                  onChange={(e) => handleVitalsChange('temperature', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Frequência Respiratória (rpm)"
                  value={draftConsultation.vitals?.respiratoryRate || ''}
                  onChange={(e) => handleVitalsChange('respiratoryRate', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Saturação O2 (%)"
                  value={draftConsultation.vitals?.oxygenSaturation || ''}
                  onChange={(e) => handleVitalsChange('oxygenSaturation', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Peso (kg)"
                  value={draftConsultation.vitals?.weight || ''}
                  onChange={(e) => handleVitalsChange('weight', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Altura (cm)"
                  value={draftConsultation.vitals?.height || ''}
                  onChange={(e) => handleVitalsChange('height', e.target.value)}
                />
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={dialogTab} index={2}>
            <TextField
              fullWidth
              multiline
              minRows={6}
              label="Avaliação (A)"
              value={draftConsultation.assessment || ''}
              onChange={(e) => handleConsultationChange('assessment', e.target.value)}
              placeholder="Hipóteses diagnósticas, diagnóstico principal e secundários..."
            />
          </TabPanel>

          <TabPanel value={dialogTab} index={3}>
            <TextField
              fullWidth
              multiline
              minRows={6}
              label="Plano (P)"
              value={draftConsultation.plan || ''}
              onChange={(e) => handleConsultationChange('plan', e.target.value)}
              placeholder="Condutas, tratamento, orientações, retorno..."
            />
          </TabPanel>

          <TabPanel value={dialogTab} index={4}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Você pode adicionar exames como texto e anexar resultados em PDF para esta consulta.
            </Alert>

            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid item xs>
                <TextField
                  fullWidth
                  label="Exame (texto)"
                  value={examTextInput}
                  onChange={(e) => setExamTextInput(e.target.value)}
                  placeholder="Ex: Hemograma completo"
                />
              </Grid>
              <Grid item>
                <Button variant="contained" onClick={handleAddExamText} sx={{ height: '100%' }}>
                  Adicionar
                </Button>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {(draftConsultation.examTexts || []).map((exam, index) => (
                <Chip
                  key={`exam-text-${index}`}
                  label={exam}
                  onDelete={() => handleRemoveExamText(index)}
                  size="small"
                />
              ))}
              {(draftConsultation.examTexts || []).length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Nenhum exame em texto adicionado.
                </Typography>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} sx={{ mb: 2 }}>
              Anexar Exame em PDF
              <input hidden accept="application/pdf" type="file" onChange={handleUploadExamPdf} />
            </Button>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {(draftConsultation.examAttachments || []).map((attachment) => (
                <Box
                  key={attachment.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    flexWrap: 'wrap',
                  }}
                >
                  <Chip icon={<PictureAsPdfIcon />} label={attachment.fileName} color="info" size="small" />
                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={() => downloadDataUrl(attachment.dataUrl, attachment.fileName)}
                    >
                      Baixar
                    </Button>
                    <Button size="small" color="error" onClick={() => handleRemoveExamAttachment(attachment.id)}>
                      Remover
                    </Button>
                  </Box>
                </Box>
              ))}

              {(draftConsultation.examAttachments || []).length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Nenhum PDF de exame anexado.
                </Typography>
              )}
            </Box>
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSaveConsultation} variant="contained" startIcon={<EventNoteIcon />}>
            {editContext ? 'Atualizar Consulta' : 'Salvar Consulta'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MedicalRecords;
