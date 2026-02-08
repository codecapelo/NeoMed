import React, { useState, useEffect } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Autocomplete,
  IconButton,
  Chip,
  TablePagination,
  Alert,
  Snackbar
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Patient } from '../types';
import { EnhancedTextField, EnhancedTextArea, CID10Selector } from '../components/common';
import PatientFilter from '../components/patients/PatientFilter';
import { useData } from '../context/DataContext';

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const formatCpf = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
};

const isValidCpf = (value: string) => {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const calcDigit = (base: string, factor: number) => {
    let total = 0;
    for (const digit of base) {
      total += Number(digit) * factor;
      factor -= 1;
    }
    const mod = total % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const digit1 = calcDigit(cpf.slice(0, 9), 10);
  const digit2 = calcDigit(cpf.slice(0, 10), 11);
  return digit1 === Number(cpf[9]) && digit2 === Number(cpf[10]);
};

// Mapeamento de tipos para resolver incompatibilidade entre tipos Patient
const mapToContextPatient = (patient: Patient): any => {
  // Mapeia paciente do tipo da página para o tipo do contexto
  return {
    ...patient,
    birthDate: patient.dateOfBirth
  };
};

const mapFromContextPatient = (contextPatient: any): Patient => {
  // Mapeia paciente do tipo do contexto para o tipo da página
  const { birthDate, ...rest } = contextPatient;
  return {
    ...rest,
    dateOfBirth: birthDate || '',
    gender: (rest.gender as 'male' | 'female' | 'other') || 'other',
    address: rest.address || ''
  };
};

// Dados mockados iniciais para quando não há dados no localStorage
const initialPatients: Patient[] = [
  {
    id: '1',
    name: 'João Silva',
    cpf: '123.456.789-09',
    dateOfBirth: '1985-05-15',
    gender: 'male',
    email: 'joao.silva@email.com',
    phone: '(11) 99999-8888',
    address: 'Rua das Flores, 123 - São Paulo, SP',
    healthInsurance: 'Unimed',
    bloodType: 'O+',
    medicalHistory: 'Hipertensão',
    allergies: ['Penicilina', 'Látex'],
    medications: ['Losartana 50mg'],
    cid10Code: 'I10',
    cid10Description: 'Hipertensão essencial (primária)'
  },
  {
    id: '2',
    name: 'Maria Oliveira',
    cpf: '529.982.247-25',
    dateOfBirth: '1990-10-20',
    gender: 'female',
    email: 'maria.oliveira@email.com',
    phone: '(11) 98888-7777',
    address: 'Av. Paulista, 1578 - São Paulo, SP',
    healthInsurance: 'Bradesco Saúde',
    bloodType: 'A+',
    allergies: ['Dipirona'],
    cid10Code: 'E11',
    cid10Description: 'Diabetes mellitus não-insulino-dependente'
  }
];

const Patients: React.FC = () => {
  // Usar o contexto de dados global
  const { patients: contextPatients, addPatient, updatePatient, deletePatient } = useData();

  // Estados locais
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [currentPatient, setCurrentPatient] = useState<Partial<Patient>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [gender, setGender] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  
  // Carregar dados quando o componente montar
  useEffect(() => {
    const loadPatients = () => {
      try {
        setLoading(true);
        
        // Verificar se temos dados no contexto
        if (contextPatients && contextPatients.length > 0) {
          console.log('Usando pacientes do contexto:', contextPatients);
          // Mapear os pacientes do contexto para o formato esperado nesta página
          const mappedPatients = contextPatients.map(mapFromContextPatient);
          setPatients(mappedPatients as unknown as Patient[]);
        } else {
          // Fallback para localStorage
          console.log('Verificando localStorage para pacientes');
          const savedPatients = localStorage.getItem('patients');
          
          if (savedPatients) {
            const parsedPatients = JSON.parse(savedPatients);
            console.log('Pacientes carregados do localStorage:', parsedPatients);
            setPatients(parsedPatients);
          } else {
            // Usar dados iniciais mockados
            console.log('Usando dados iniciais mockados de pacientes');
            setPatients(initialPatients);
            // Salvar dados iniciais no localStorage
            localStorage.setItem('patients', JSON.stringify(initialPatients));
          }
        }
        
        setError(null);
      } catch (err) {
        const errorMessage = 'Erro ao carregar pacientes: ' + (err instanceof Error ? err.message : String(err));
        setError(errorMessage);
        console.error(errorMessage);
        showSnackbar(errorMessage, 'error');
      } finally {
        setLoading(false);
      }
    };
    
    loadPatients();
  }, [contextPatients]);

  // Função para mostrar mensagens toast
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleClickOpen = () => {
    setCurrentPatient({});
    setIsEditing(false);
    setOpen(true);
  };

  const handleEdit = (patient: Patient) => {
    setCurrentPatient({...patient});
    setIsEditing(true);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = () => {
    try {
      if (!currentPatient.name?.trim()) {
        showSnackbar('Nome completo é obrigatório.', 'warning');
        return;
      }

      const cpf = formatCpf(currentPatient.cpf || '');
      if (!cpf) {
        showSnackbar('CPF é obrigatório para cadastrar paciente.', 'warning');
        return;
      }

      if (!isValidCpf(cpf)) {
        showSnackbar('Informe um CPF válido.', 'warning');
        return;
      }

      if (isEditing && currentPatient.id) {
        // Atualizar paciente existente
        const contextPatient = mapToContextPatient({ ...(currentPatient as Patient), cpf });
        updatePatient(contextPatient);
        showSnackbar('Paciente atualizado com sucesso', 'success');
      } else {
        // Adicionar novo paciente com ID gerado
        const newPatient: Patient = {
          id: Date.now().toString(), // Usar timestamp como ID
          name: currentPatient.name || '',
          cpf,
          email: currentPatient.email || '',
          phone: currentPatient.phone || '',
          dateOfBirth: currentPatient.dateOfBirth || '',
          gender: (currentPatient.gender as 'male' | 'female' | 'other') || 'other',
          address: currentPatient.address || '',
          healthInsurance: currentPatient.healthInsurance,
          bloodType: currentPatient.bloodType,
          medicalHistory: currentPatient.medicalHistory,
          allergies: currentPatient.allergies,
          medications: currentPatient.medications,
          cid10Code: currentPatient.cid10Code,
          cid10Description: currentPatient.cid10Description
        };
        
        const contextPatient = mapToContextPatient(newPatient);
        addPatient(contextPatient);
        showSnackbar('Paciente adicionado com sucesso', 'success');
      }
      
      // Atualizar estado local com dados do contexto
      const mappedPatients = contextPatients.map(mapFromContextPatient);
      setPatients(mappedPatients as unknown as Patient[]);
      setOpen(false);
    } catch (err) {
      const errorMessage = 'Erro ao salvar paciente: ' + (err instanceof Error ? err.message : String(err));
      console.error(errorMessage);
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este paciente?')) {
      try {
        deletePatient(id);
        // Atualizar estado local com dados do contexto
        const mappedPatients = contextPatients.map(mapFromContextPatient);
        setPatients(mappedPatients as unknown as Patient[]);
        showSnackbar('Paciente removido com sucesso', 'success');
      } catch (err) {
        const errorMessage = 'Erro ao remover paciente: ' + (err instanceof Error ? err.message : String(err));
        console.error(errorMessage);
        showSnackbar(errorMessage, 'error');
      }
    }
  };

  const handleICDSelect = (code: string, title: string) => {
    setCurrentPatient({
      ...currentPatient,
      cid10Code: code,
      cid10Description: title
    });
  };

  const handleChangeAllergies = (newValue: string[]) => {
    setCurrentPatient({
      ...currentPatient,
      allergies: newValue
    });
  };

  const handleChangeMedications = (newValue: string[]) => {
    setCurrentPatient({
      ...currentPatient,
      medications: newValue
    });
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = searchTerm === '' || 
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.cpf?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      patient.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBloodType = bloodType === '' || patient.bloodType === bloodType;
    const matchesGender = gender === '' || patient.gender === gender;
    
    return matchesSearch && matchesBloodType && matchesGender;
  });

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch (e) {
      return dateString;
    }
  };

  // Exibir mensagem de erro se houver problemas ao carregar
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
        >
          Tentar Novamente
        </Button>
      </Box>
    );
  }

  // Placeholder durante o carregamento
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Carregando pacientes...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">
          Pacientes
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleClickOpen}
        >
          Novo Paciente
        </Button>
      </Box>

      <PatientFilter 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        bloodType={bloodType}
        setBloodType={setBloodType}
        gender={gender}
        setGender={setGender}
      />

      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>CPF</TableCell>
              <TableCell>Data Nasc.</TableCell>
              <TableCell>Contato</TableCell>
              <TableCell>Plano de Saúde</TableCell>
              <TableCell>Tipo Sanguíneo</TableCell>
              <TableCell>Alergias</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPatients
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map(patient => (
                <TableRow key={patient.id}>
                  <TableCell>{patient.name}</TableCell>
                  <TableCell>{patient.cpf || '-'}</TableCell>
                  <TableCell>{formatDate(patient.dateOfBirth)}</TableCell>
                  <TableCell>
                    {patient.phone}<br/>
                    {patient.email}
                  </TableCell>
                  <TableCell>{patient.healthInsurance}</TableCell>
                  <TableCell>{patient.bloodType}</TableCell>
                  <TableCell>
                    {patient.allergies?.map(allergy => (
                      <Chip key={allergy} label={allergy} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                    ))}
                  </TableCell>
                  <TableCell>
                    <IconButton color="primary" onClick={() => handleEdit(patient)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDelete(patient.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            {filteredPatients.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Nenhum paciente encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredPatients.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{isEditing ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <EnhancedTextField
                fullWidth
                label="Nome Completo"
                value={currentPatient.name || ''}
                onChange={(e) => setCurrentPatient({...currentPatient, name: e.target.value})}
                required
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <EnhancedTextField
                fullWidth
                label="CPF"
                value={currentPatient.cpf || ''}
                onChange={(e) => setCurrentPatient({...currentPatient, cpf: formatCpf(e.target.value)})}
                required
                inputProps={{ maxLength: 14 }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Data de Nascimento"
                type="date"
                value={currentPatient.dateOfBirth || ''}
                onChange={(e) => setCurrentPatient({...currentPatient, dateOfBirth: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Gênero</InputLabel>
                <Select
                  value={currentPatient.gender || ''}
                  label="Gênero"
                  onChange={(e) => setCurrentPatient({
                    ...currentPatient, 
                    gender: e.target.value as 'male' | 'female' | 'other'
                  })}
                >
                  <MenuItem value="male">Masculino</MenuItem>
                  <MenuItem value="female">Feminino</MenuItem>
                  <MenuItem value="other">Outro</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <EnhancedTextField
                fullWidth
                label="Email"
                value={currentPatient.email || ''}
                onChange={(e) => setCurrentPatient({...currentPatient, email: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <EnhancedTextField
                fullWidth
                label="Telefone"
                value={currentPatient.phone || ''}
                onChange={(e) => setCurrentPatient({...currentPatient, phone: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <EnhancedTextField
                fullWidth
                label="Endereço"
                value={currentPatient.address || ''}
                onChange={(e) => setCurrentPatient({...currentPatient, address: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <EnhancedTextField
                fullWidth
                label="Plano de Saúde"
                value={currentPatient.healthInsurance || ''}
                onChange={(e) => setCurrentPatient({...currentPatient, healthInsurance: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo Sanguíneo</InputLabel>
                <Select
                  value={currentPatient.bloodType || ''}
                  label="Tipo Sanguíneo"
                  onChange={(e) => setCurrentPatient({...currentPatient, bloodType: e.target.value})}
                >
                  <MenuItem value="A+">A+</MenuItem>
                  <MenuItem value="A-">A-</MenuItem>
                  <MenuItem value="B+">B+</MenuItem>
                  <MenuItem value="B-">B-</MenuItem>
                  <MenuItem value="AB+">AB+</MenuItem>
                  <MenuItem value="AB-">AB-</MenuItem>
                  <MenuItem value="O+">O+</MenuItem>
                  <MenuItem value="O-">O-</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>Informações Médicas</Divider>
            </Grid>
            <Grid item xs={12}>
              <EnhancedTextArea
                fullWidth
                label="Histórico Médico"
                minRows={3}
                value={currentPatient.medicalHistory || ''}
                onChange={(e) => setCurrentPatient({...currentPatient, medicalHistory: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={currentPatient.allergies || []}
                onChange={(_, newValue) => handleChangeAllergies(newValue)}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip label={option} {...getTagProps({ index })} />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Alergias"
                    placeholder="Adicionar alergia"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={currentPatient.medications || []}
                onChange={(_, newValue) => handleChangeMedications(newValue)}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip label={option} {...getTagProps({ index })} />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Medicações"
                    placeholder="Adicionar medicação"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <CID10Selector 
                value={currentPatient.cid10Code || ''} 
                onSelect={handleICDSelect} 
              />
              {currentPatient.cid10Code && (
                <Typography variant="caption" display="block" color="textSecondary">
                  {currentPatient.cid10Code}: {currentPatient.cid10Description}
                </Typography>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="inherit">Cancelar</Button>
          <Button onClick={handleSave} variant="contained" color="primary">Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para mensagens de feedback */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Patients; 
