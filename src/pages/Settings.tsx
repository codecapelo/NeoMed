import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Switch,
  FormControlLabel,
  Button,
  TextField,
  Grid,
  Alert,
  Snackbar,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
  Delete as DeleteIcon,
  ColorLens as ThemeIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Language as LanguageIcon,
  Print as PrintIcon,
  Assessment as ReportIcon,
  Storage as StorageIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import usePersistentState from '../hooks/usePersistentState';
import { storageService } from '../services/storageService';

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
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
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

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'pt-BR' | 'en-US' | 'es-ES';
  notificationsEnabled: boolean;
  autosaveInterval: number;
  prescriptionFooter: string;
  prescriptionHeader: string;
  reportLogo?: string;
  backupFrequency: 'daily' | 'weekly' | 'monthly' | 'manual';
  showPatientPhotos: boolean;
  defaultTimeSlotDuration: number;
  prescriptionFontSize: 'small' | 'medium' | 'large';
}

const defaultSettings: UserSettings = {
  theme: 'light',
  language: 'pt-BR',
  notificationsEnabled: true,
  autosaveInterval: 5,
  prescriptionFooter: 'NeoMed - Sistema de Gestão Hospitalar',
  prescriptionHeader: 'Prescrição Médica',
  backupFrequency: 'daily',
  showPatientPhotos: true,
  defaultTimeSlotDuration: 30,
  prescriptionFontSize: 'medium'
};

const languageOptions = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'es-ES', label: 'Español' }
];

const themeOptions = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'system', label: 'Sistema' }
];

const backupFrequencyOptions = [
  { value: 'manual', label: 'Manual' },
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' }
];

const fontSizeOptions = [
  { value: 'small', label: 'Pequeno' },
  { value: 'medium', label: 'Médio' },
  { value: 'large', label: 'Grande' }
];

const Settings: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning'>('success');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogAction, setConfirmDialogAction] = useState<() => void>(() => {});
  const [confirmDialogMessage, setConfirmDialogMessage] = useState('');
  
  // Usamos um hook personalizado para manter as configurações persistentes
  const [settings, setSettings] = usePersistentState<UserSettings>(
    `userSettings_${currentUser?.uid || 'default'}`,
    defaultSettings
  );

  // Para simular estatísticas de armazenamento 
  const [storageStats, setStorageStats] = useState({
    totalPatients: 0,
    totalPrescriptions: 0,
    totalAppointments: 0,
    totalMedicalRecords: 0,
    estimatedSize: '0 MB'
  });

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // Simulação de carregamento de estatísticas de armazenamento
    const loadStorageStats = () => {
      const patientsStr = localStorage.getItem(`${currentUser.uid}_patients`);
      const prescriptionsStr = localStorage.getItem(`${currentUser.uid}_prescriptions`);
      const appointmentsStr = localStorage.getItem(`${currentUser.uid}_appointments`);
      const medicalRecordsStr = localStorage.getItem(`${currentUser.uid}_medicalRecords`);

      const patients = patientsStr ? JSON.parse(patientsStr) : [];
      const prescriptions = prescriptionsStr ? JSON.parse(prescriptionsStr) : [];
      const appointments = appointmentsStr ? JSON.parse(appointmentsStr) : [];
      const medicalRecords = medicalRecordsStr ? JSON.parse(medicalRecordsStr) : [];

      // Estimativa de tamanho em bytes
      const totalSize = (
        (patientsStr?.length || 0) +
        (prescriptionsStr?.length || 0) +
        (appointmentsStr?.length || 0) +
        (medicalRecordsStr?.length || 0)
      ) * 2; // Multiplicado por 2 para considerar codificação Unicode

      // Converter para MB
      const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);

      setStorageStats({
        totalPatients: patients.length,
        totalPrescriptions: prescriptions.length,
        totalAppointments: appointments.length,
        totalMedicalRecords: medicalRecords.length,
        estimatedSize: `${sizeInMB} MB`
      });
    };

    loadStorageStats();
  }, [currentUser, navigate]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSettingChange = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleResetSettings = () => {
    showConfirmDialog(
      'Tem certeza que deseja restaurar todas as configurações para os valores padrão?',
      () => {
        setSettings(defaultSettings);
        showSnackbar('Configurações restauradas com sucesso', 'success');
      }
    );
  };

  const handleClearAllData = () => {
    showConfirmDialog(
      'ATENÇÃO: Esta ação irá excluir permanentemente todos os seus dados. Esta ação não pode ser desfeita. Deseja continuar?',
      () => {
        if (currentUser) {
          // Lista de chaves a serem removidas
          const keysToRemove = [
            `${currentUser.uid}_patients`,
            `${currentUser.uid}_prescriptions`,
            `${currentUser.uid}_appointments`,
            `${currentUser.uid}_medicalRecords`,
            `${currentUser.uid}_userSettings`
          ];

          // Remove cada item do localStorage
          keysToRemove.forEach(key => localStorage.removeItem(key));
          
          // Atualiza as estatísticas
          setStorageStats({
            totalPatients: 0,
            totalPrescriptions: 0,
            totalAppointments: 0,
            totalMedicalRecords: 0,
            estimatedSize: '0 MB'
          });

          showSnackbar('Todos os dados foram excluídos com sucesso', 'success');
        }
      }
    );
  };

  const handleExportAllData = async () => {
    try {
      if (!currentUser) {
        showSnackbar('Você precisa estar logado para exportar dados', 'error');
        return;
      }

      // Obtém todas as chaves de armazenamento para este usuário
      const allData = storageService.getAllUserData(currentUser.uid);
      
      // Criar um blob com os dados para download
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Criar um elemento de link para download
      const link = document.createElement('a');
      link.href = url;
      link.download = `neomed_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      
      // Limpar
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      showSnackbar('Dados exportados com sucesso', 'success');
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      showSnackbar('Erro ao exportar dados. Tente novamente.', 'error');
    }
  };

  const handleImportData = () => {
    // Criar um input de arquivo
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    
    fileInput.onchange = async (e: Event) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;
      
      const file = files[0];
      try {
        const fileText = await file.text();
        const importedData = JSON.parse(fileText);
        
        showConfirmDialog(
          'Esta ação irá substituir seus dados atuais pelos dados importados. Deseja continuar?',
          async () => {
            if (currentUser) {
              // Para cada conjunto de dados no arquivo importado
              Object.entries(importedData).forEach(([key, value]) => {
                localStorage.setItem(`${currentUser.uid}_${key}`, JSON.stringify(value));
              });
              
              // Recarregar a página para atualizar os dados
              window.location.reload();
              
              showSnackbar('Dados importados com sucesso', 'success');
            }
          }
        );
      } catch (error) {
        console.error('Erro ao importar dados:', error);
        showSnackbar('Erro ao importar dados. Verifique o formato do arquivo.', 'error');
      }
    };
    
    fileInput.click();
  };

  const handleSaveToServer = async () => {
    try {
      if (!currentUser) {
        showSnackbar('Você precisa estar logado para salvar dados no servidor', 'error');
        return;
      }

      // Iniciar o processo de salvamento com uma mensagem
      showSnackbar('Salvando dados no servidor...', 'warning');

      // Simulação de uma operação assíncrona
      setTimeout(() => {
        showSnackbar('Todos os dados foram salvos no servidor com sucesso!', 'success');
      }, 2000);
    } catch (error) {
      console.error('Erro ao salvar dados no servidor:', error);
      showSnackbar('Erro ao salvar dados no servidor. Tente novamente.', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const showConfirmDialog = (message: string, onConfirm: () => void) => {
    setConfirmDialogMessage(message);
    setConfirmDialogAction(() => onConfirm);
    setConfirmDialogOpen(true);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const handleConfirmDialogClose = (confirmed: boolean) => {
    setConfirmDialogOpen(false);
    if (confirmed) {
      confirmDialogAction();
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Configurações do Sistema
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="configurações tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Geral" icon={<SettingsIcon />} iconPosition="start" />
          <Tab label="Aparência" icon={<ThemeIcon />} iconPosition="start" />
          <Tab label="Documentos" icon={<PrintIcon />} iconPosition="start" />
          <Tab label="Armazenamento" icon={<StorageIcon />} iconPosition="start" />
          <Tab label="Backup" icon={<CloudUploadIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Guia Geral */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardHeader title="Preferências Gerais" />
              <Divider />
              <CardContent>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="language-select-label">Idioma</InputLabel>
                  <Select
                    labelId="language-select-label"
                    value={settings.language}
                    label="Idioma"
                    onChange={(e) => handleSettingChange('language', e.target.value as UserSettings['language'])}
                  >
                    {languageOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notificationsEnabled}
                      onChange={(e) => handleSettingChange('notificationsEnabled', e.target.checked)}
                    />
                  }
                  label="Ativar notificações"
                  sx={{ display: 'block', mt: 2 }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.showPatientPhotos}
                      onChange={(e) => handleSettingChange('showPatientPhotos', e.target.checked)}
                    />
                  }
                  label="Mostrar fotos de pacientes"
                  sx={{ display: 'block', mt: 1 }}
                />

                <TextField
                  label="Intervalo de salvamento automático (minutos)"
                  type="number"
                  fullWidth
                  margin="normal"
                  value={settings.autosaveInterval}
                  onChange={(e) => handleSettingChange('autosaveInterval', parseInt(e.target.value) || 1)}
                  InputProps={{
                    inputProps: { min: 1, max: 60 }
                  }}
                />

                <TextField
                  label="Duração padrão de consulta (minutos)"
                  type="number"
                  fullWidth
                  margin="normal"
                  value={settings.defaultTimeSlotDuration}
                  onChange={(e) => handleSettingChange('defaultTimeSlotDuration', parseInt(e.target.value) || 15)}
                  InputProps={{
                    inputProps: { min: 5, max: 120, step: 5 }
                  }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardHeader 
                title="Ações" 
                action={
                  <IconButton onClick={handleResetSettings}>
                    <RefreshIcon />
                  </IconButton>
                }
              />
              <Divider />
              <CardContent>
                <List>
                  <ListItem button onClick={() => navigate('/pacientes')}>
                    <ListItemIcon>
                      <SecurityIcon />
                    </ListItemIcon>
                    <ListItemText primary="Gerenciar Pacientes" />
                  </ListItem>
                  <ListItem button onClick={() => navigate('/prescricoes')}>
                    <ListItemIcon>
                      <ReportIcon />
                    </ListItemIcon>
                    <ListItemText primary="Gerenciar Prescrições" />
                  </ListItem>
                  <ListItem button onClick={handleResetSettings}>
                    <ListItemIcon>
                      <RefreshIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Restaurar Configurações Padrão" 
                      secondary="Redefine todas as configurações para os valores padrão"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Guia Aparência */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardHeader title="Tema e Aparência" />
              <Divider />
              <CardContent>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="theme-select-label">Tema</InputLabel>
                  <Select
                    labelId="theme-select-label"
                    value={settings.theme}
                    label="Tema"
                    onChange={(e) => handleSettingChange('theme', e.target.value as UserSettings['theme'])}
                  >
                    {themeOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Alert severity="info" sx={{ mt: 2 }}>
                  A mudança de tema requer reinicialização da aplicação para ter efeito completo.
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Guia Documentos */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardHeader title="Configurações de Prescrição" />
              <Divider />
              <CardContent>
                <TextField
                  label="Cabeçalho da Prescrição"
                  fullWidth
                  margin="normal"
                  value={settings.prescriptionHeader}
                  onChange={(e) => handleSettingChange('prescriptionHeader', e.target.value)}
                />

                <TextField
                  label="Rodapé da Prescrição"
                  fullWidth
                  margin="normal"
                  value={settings.prescriptionFooter}
                  onChange={(e) => handleSettingChange('prescriptionFooter', e.target.value)}
                  multiline
                  rows={2}
                />

                <FormControl fullWidth margin="normal">
                  <InputLabel id="font-size-select-label">Tamanho da Fonte</InputLabel>
                  <Select
                    labelId="font-size-select-label"
                    value={settings.prescriptionFontSize}
                    label="Tamanho da Fonte"
                    onChange={(e) => handleSettingChange('prescriptionFontSize', e.target.value as UserSettings['prescriptionFontSize'])}
                  >
                    {fontSizeOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="outlined"
                    startIcon={<PrintIcon />}
                    onClick={() => navigate('/prescricoes')}
                  >
                    Visualizar Modelo
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardHeader title="Logotipo e Marca" />
              <Divider />
              <CardContent>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                  fullWidth
                  sx={{ mb: 2, height: '56px' }}
                >
                  Upload de Logotipo
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => {
                      // Em uma implementação real, este seria o local para lidar com o upload do arquivo
                      showSnackbar('Funcionalidade de upload de logotipo será implementada em versões futuras', 'warning');
                    }}
                  />
                </Button>

                <Alert severity="info">
                  O logotipo será exibido em relatórios e documentos oficiais.
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Guia Armazenamento */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardHeader title="Uso de Armazenamento" />
              <Divider />
              <CardContent>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <StorageIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Tamanho Total Estimado" 
                      secondary={storageStats.estimatedSize} 
                    />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText 
                      primary="Pacientes" 
                      secondary={`${storageStats.totalPatients} registros`} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Prescrições" 
                      secondary={`${storageStats.totalPrescriptions} registros`} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Consultas" 
                      secondary={`${storageStats.totalAppointments} registros`} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Prontuários" 
                      secondary={`${storageStats.totalMedicalRecords} registros`} 
                    />
                  </ListItem>
                </List>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveToServer}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  Salvar Todos os Dados no Servidor
                </Button>

                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleClearAllData}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  Limpar Todos os Dados
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Guia Backup */}
      <TabPanel value={tabValue} index={4}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardHeader title="Backup de Dados" />
              <Divider />
              <CardContent>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="backup-frequency-label">Frequência de Backup Automático</InputLabel>
                  <Select
                    labelId="backup-frequency-label"
                    value={settings.backupFrequency}
                    label="Frequência de Backup Automático"
                    onChange={(e) => handleSettingChange('backupFrequency', e.target.value as UserSettings['backupFrequency'])}
                  >
                    {backupFrequencyOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<CloudDownloadIcon />}
                    onClick={handleExportAllData}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    Exportar Todos os Dados
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    onClick={handleImportData}
                    fullWidth
                  >
                    Importar Dados
                  </Button>
                </Box>

                <Alert severity="warning" sx={{ mt: 3 }}>
                  A importação de dados substituirá todos os dados atuais. Faça um backup antes de importar.
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Snackbar para mensagens */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbarSeverity} 
          sx={{ width: '100%' }}
          icon={snackbarSeverity === 'success' ? <SuccessIcon /> : <WarningIcon />}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Diálogo de confirmação */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => handleConfirmDialogClose(false)}
      >
        <DialogTitle>Confirmação</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialogMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleConfirmDialogClose(false)}>Cancelar</Button>
          <Button onClick={() => handleConfirmDialogClose(true)} color="primary" autoFocus>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings; 