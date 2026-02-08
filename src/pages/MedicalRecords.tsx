import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  IconButton,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs
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
  LocalHospital as DiagnosisIcon
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MedicalRecord {
  id: string;
  patientId: string;
  date: string;
  diagnosis: string;
  treatment: string;
  notes?: string;
  vitals?: {
    bloodPressure?: string;
    heartRate?: string;
    temperature?: string;
    respiratoryRate?: string;
    oxygenSaturation?: string;
    weight?: string;
    height?: string;
  };
  exams?: string[];
  medications?: string[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

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
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const MedicalRecordDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  recordToEdit: MedicalRecord | null;
}> = ({ open, onClose, recordToEdit }) => {
  const { patients, addMedicalRecord, updateMedicalRecord } = useData();
  const [tabValue, setTabValue] = useState(0);
  
  const initialRecord = recordToEdit || {
    id: '',
    patientId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    diagnosis: '',
    treatment: '',
    notes: '',
    vitals: {
      bloodPressure: '',
      heartRate: '',
      temperature: '',
      respiratoryRate: '',
      oxygenSaturation: '',
      weight: '',
      height: ''
    },
    exams: [],
    medications: []
  };

  const [record, setRecord] = useState<MedicalRecord>(initialRecord);
  const [examInput, setExamInput] = useState('');
  const [medicationInput, setMedicationInput] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRecord(prev => ({ ...prev, [name]: value }));
  };

  const handlePatientChange = (e: any) => {
    setRecord(prev => ({ ...prev, patientId: e.target.value }));
  };

  const handleVitalsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRecord(prev => ({
      ...prev,
      vitals: { ...prev.vitals, [name]: value }
    }));
  };

  const handleAddExam = () => {
    if (examInput.trim()) {
      setRecord(prev => ({
        ...prev,
        exams: [...(prev.exams || []), examInput.trim()]
      }));
      setExamInput('');
    }
  };

  const handleAddMedication = () => {
    if (medicationInput.trim()) {
      setRecord(prev => ({
        ...prev,
        medications: [...(prev.medications || []), medicationInput.trim()]
      }));
      setMedicationInput('');
    }
  };

  const handleRemoveExam = (index: number) => {
    setRecord(prev => ({
      ...prev,
      exams: prev.exams?.filter((_, i) => i !== index)
    }));
  };

  const handleRemoveMedication = (index: number) => {
    setRecord(prev => ({
      ...prev,
      medications: prev.medications?.filter((_, i) => i !== index)
    }));
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSave = () => {
    if (recordToEdit) {
      updateMedicalRecord(recordToEdit.id, record);
    } else {
      addMedicalRecord(record);
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {recordToEdit ? 'Editar Prontuário Médico' : 'Novo Prontuário Médico'}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="medical record tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Informações Básicas" />
            <Tab label="Sinais Vitais" />
            <Tab label="Exames" />
            <Tab label="Medicações" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel id="patient-select-label">Paciente</InputLabel>
                <Select
                  labelId="patient-select-label"
                  value={record.patientId}
                  label="Paciente"
                  onChange={handlePatientChange}
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
                name="date"
                label="Data"
                type="date"
                fullWidth
                value={record.date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="diagnosis"
                label="Diagnóstico"
                fullWidth
                multiline
                rows={2}
                value={record.diagnosis}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="treatment"
                label="Tratamento"
                fullWidth
                multiline
                rows={2}
                value={record.treatment}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="notes"
                label="Observações"
                fullWidth
                multiline
                rows={4}
                value={record.notes}
                onChange={handleChange}
              />
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="bloodPressure"
                label="Pressão Arterial (mmHg)"
                fullWidth
                value={record.vitals?.bloodPressure || ''}
                onChange={handleVitalsChange}
                placeholder="Ex: 120/80"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="heartRate"
                label="Frequência Cardíaca (bpm)"
                fullWidth
                value={record.vitals?.heartRate || ''}
                onChange={handleVitalsChange}
                placeholder="Ex: 75"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="temperature"
                label="Temperatura (°C)"
                fullWidth
                value={record.vitals?.temperature || ''}
                onChange={handleVitalsChange}
                placeholder="Ex: 36.5"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="respiratoryRate"
                label="Frequência Respiratória (rpm)"
                fullWidth
                value={record.vitals?.respiratoryRate || ''}
                onChange={handleVitalsChange}
                placeholder="Ex: 16"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="oxygenSaturation"
                label="Saturação de O2 (%)"
                fullWidth
                value={record.vitals?.oxygenSaturation || ''}
                onChange={handleVitalsChange}
                placeholder="Ex: 98"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="weight"
                label="Peso (kg)"
                fullWidth
                value={record.vitals?.weight || ''}
                onChange={handleVitalsChange}
                placeholder="Ex: 70.5"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="height"
                label="Altura (cm)"
                fullWidth
                value={record.vitals?.height || ''}
                onChange={handleVitalsChange}
                placeholder="Ex: 175"
              />
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 2 }}>
            <Grid container spacing={1}>
              <Grid item xs>
                <TextField
                  label="Adicionar Exame"
                  fullWidth
                  value={examInput}
                  onChange={(e) => setExamInput(e.target.value)}
                  placeholder="Ex: Hemograma completo"
                />
              </Grid>
              <Grid item>
                <Button 
                  variant="contained" 
                  onClick={handleAddExam}
                  sx={{ height: '100%' }}
                >
                  Adicionar
                </Button>
              </Grid>
            </Grid>
          </Box>
          
          <Box sx={{ mt: 2 }}>
            {(record.exams || []).length > 0 ? (
              record.exams?.map((exam, index) => (
                <Chip
                  key={index}
                  label={exam}
                  onDelete={() => handleRemoveExam(index)}
                  sx={{ m: 0.5 }}
                />
              ))
            ) : (
              <Typography color="text.secondary">Nenhum exame adicionado</Typography>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Box sx={{ mb: 2 }}>
            <Grid container spacing={1}>
              <Grid item xs>
                <TextField
                  label="Adicionar Medicação"
                  fullWidth
                  value={medicationInput}
                  onChange={(e) => setMedicationInput(e.target.value)}
                  placeholder="Ex: Paracetamol 500mg, 8/8h"
                />
              </Grid>
              <Grid item>
                <Button 
                  variant="contained" 
                  onClick={handleAddMedication}
                  sx={{ height: '100%' }}
                >
                  Adicionar
                </Button>
              </Grid>
            </Grid>
          </Box>
          
          <Box sx={{ mt: 2 }}>
            {(record.medications || []).length > 0 ? (
              record.medications?.map((medication, index) => (
                <Chip
                  key={index}
                  label={medication}
                  onDelete={() => handleRemoveMedication(index)}
                  sx={{ m: 0.5 }}
                  color="primary"
                  variant="outlined"
                />
              ))
            ) : (
              <Typography color="text.secondary">Nenhuma medicação adicionada</Typography>
            )}
          </Box>
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={!record.patientId || !record.diagnosis || !record.treatment}
        >
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const MedicalRecordView: React.FC<{ record: MedicalRecord }> = ({ record }) => {
  const { patients } = useData();
  const patient = patients.find(p => p.id === record.patientId);

  return (
    <Card variant="outlined" sx={{ mb: 2, borderRadius: '8px' }}>
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="h6" component="div" gutterBottom>
              <PatientIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              {patient?.name || 'Paciente não encontrado'}
            </Typography>
            <Typography color="text.secondary" gutterBottom>
              Data: {format(new Date(record.date), 'dd/MM/yyyy')}
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                <DiagnosisIcon sx={{ mr: 1 }} />
                Diagnóstico
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {record.diagnosis}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                <NotesIcon sx={{ mr: 1 }} />
                Tratamento
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {record.treatment}
              </Typography>
            </Box>
          </Grid>
          
          {record.vitals && Object.values(record.vitals).some(v => v) && (
            <Grid item xs={12}>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                  <HeartIcon sx={{ mr: 1 }} />
                  Sinais Vitais
                </Typography>
                <Grid container spacing={1} sx={{ mt: 0.5 }}>
                  {record.vitals.bloodPressure && (
                    <Grid item xs={6} sm={4} md={3}>
                      <Typography variant="body2" component="div">
                        <strong>P.A.:</strong> {record.vitals.bloodPressure} mmHg
                      </Typography>
                    </Grid>
                  )}
                  {record.vitals.heartRate && (
                    <Grid item xs={6} sm={4} md={3}>
                      <Typography variant="body2" component="div">
                        <strong>F.C.:</strong> {record.vitals.heartRate} bpm
                      </Typography>
                    </Grid>
                  )}
                  {record.vitals.temperature && (
                    <Grid item xs={6} sm={4} md={3}>
                      <Typography variant="body2" component="div">
                        <strong>Temp.:</strong> {record.vitals.temperature} °C
                      </Typography>
                    </Grid>
                  )}
                  {record.vitals.respiratoryRate && (
                    <Grid item xs={6} sm={4} md={3}>
                      <Typography variant="body2" component="div">
                        <strong>F.R.:</strong> {record.vitals.respiratoryRate} rpm
                      </Typography>
                    </Grid>
                  )}
                  {record.vitals.oxygenSaturation && (
                    <Grid item xs={6} sm={4} md={3}>
                      <Typography variant="body2" component="div">
                        <strong>SpO2:</strong> {record.vitals.oxygenSaturation}%
                      </Typography>
                    </Grid>
                  )}
                  {record.vitals.weight && (
                    <Grid item xs={6} sm={4} md={3}>
                      <Typography variant="body2" component="div">
                        <strong>Peso:</strong> {record.vitals.weight} kg
                      </Typography>
                    </Grid>
                  )}
                  {record.vitals.height && (
                    <Grid item xs={6} sm={4} md={3}>
                      <Typography variant="body2" component="div">
                        <strong>Altura:</strong> {record.vitals.height} cm
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Grid>
          )}
          
          {record.medications && record.medications.length > 0 && (
            <Grid item xs={12}>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                  <MedicationIcon sx={{ mr: 1 }} />
                  Medicações
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {record.medications.map((med, index) => (
                    <Chip
                      key={index}
                      label={med}
                      sx={{ m: 0.5 }}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              </Box>
            </Grid>
          )}
          
          {record.exams && record.exams.length > 0 && (
            <Grid item xs={12}>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                  <SearchIcon sx={{ mr: 1 }} />
                  Exames
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {record.exams.map((exam, index) => (
                    <Chip
                      key={index}
                      label={exam}
                      sx={{ m: 0.5 }}
                      size="small"
                    />
                  ))}
                </Box>
              </Box>
            </Grid>
          )}
          
          {record.notes && (
            <Grid item xs={12}>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                  <NotesIcon sx={{ mr: 1 }} />
                  Observações
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {record.notes}
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

const MedicalRecords: React.FC = () => {
  const { medicalRecords, patients, deleteMedicalRecord } = useData();
  const [open, setOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<MedicalRecord | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const navigate = useNavigate();

  const filteredRecords = selectedPatientId 
    ? medicalRecords.filter(record => record.patientId === selectedPatientId)
    : medicalRecords;

  const sortedRecords = [...filteredRecords].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleOpen = () => {
    setRecordToEdit(null);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setRecordToEdit(null);
  };

  const handleEdit = (record: MedicalRecord) => {
    setRecordToEdit(record);
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este prontuário?')) {
      deleteMedicalRecord(id);
    }
  };

  const getPatientName = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? patient.name : 'Paciente não encontrado';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Prontuários Médicos</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleOpen}
        >
          Novo Prontuário
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

      {sortedRecords.length > 0 ? (
        sortedRecords.map((record) => (
          <Box key={record.id} sx={{ mb: 2, position: 'relative' }}>
            <MedicalRecordView record={record} />
            <Box 
              sx={{ 
                position: 'absolute', 
                top: 10, 
                right: 10, 
                display: 'flex',
                gap: 1
              }}
            >
              <IconButton 
                size="small" 
                onClick={() => handleEdit(record)} 
                color="primary"
                sx={{ bgcolor: 'background.paper' }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton 
                size="small" 
                onClick={() => handleDelete(record.id)} 
                color="error"
                sx={{ bgcolor: 'background.paper' }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        ))
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nenhum prontuário encontrado
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedPatientId ? 
              'Não existem prontuários para o paciente selecionado.' : 
              'Clique em "Novo Prontuário" para adicionar um registro médico.'}
          </Typography>
        </Paper>
      )}

      <MedicalRecordDialog 
        open={open} 
        onClose={handleClose} 
        recordToEdit={recordToEdit} 
      />
    </Box>
  );
};

export default MedicalRecords; 