import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  Divider,
  Badge,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stack
} from '@mui/material';
import { 
  CalendarMonth, 
  Schedule, 
  Notifications, 
  Add, 
  Edit, 
  Delete, 
  Today, 
  Person,
  Warning,
  VideoCall
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateCalendar, PickersDay, PickersDayProps } from '@mui/x-date-pickers';
import ptBR from 'date-fns/locale/pt-BR';
import { endOfWeek, format, isWithinInterval, parseISO, startOfWeek } from 'date-fns';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { buildVideoCallUrl, normalizeVideoCallProvider, normalizeVideoCallUrl } from '../utils/videoCall';

// Definindo tipos
interface AppointmentData {
  id: string;
  patientId: string;
  date: string;
  time: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  reason?: string;
  notes?: string;
  patientName?: string;
  videoCallUrl?: string;
  videoCallRoom?: string;
  videoCallAccessCode?: string;
  videoCallProvider?: string;
}

interface Reminder {
  id: string;
  title: string;
  date: Date;
  completed: boolean;
}

interface AppointmentCalendarDayProps extends PickersDayProps<Date> {
  highlightedDays?: Set<string>;
}

const parseAppointmentDate = (value?: string): Date | null => {
  if (!value) {
    return null;
  }

  const parsedIso = parseISO(value);
  if (!Number.isNaN(parsedIso.getTime())) {
    return parsedIso;
  }

  const fallback = new Date(value);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback;
  }

  return null;
};

const safeSlug = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 48);

const buildAppointmentVideoCallData = (appointmentId: string) => {
  const safeId = safeSlug(appointmentId) || Date.now().toString();
  const room = `neomed-consulta-${safeId}`;
  const accessCode = safeId.slice(-6).toUpperCase();
  return {
    videoCallUrl: buildVideoCallUrl(room),
    videoCallRoom: room,
    videoCallAccessCode: accessCode,
    videoCallProvider: 'twilio',
  };
};

const AppointmentCalendarDay = (props: AppointmentCalendarDayProps) => {
  const { highlightedDays, day, outsideCurrentMonth, ...other } = props;
  const dayKey = format(day, 'yyyy-MM-dd');
  const hasAppointments = Boolean(highlightedDays?.has(dayKey));

  return (
    <PickersDay
      {...other}
      day={day}
      outsideCurrentMonth={outsideCurrentMonth}
      sx={{
        ...(hasAppointments
          ? {
              border: '1px solid #d14343',
              backgroundColor: outsideCurrentMonth ? undefined : '#fde7e7',
              color: outsideCurrentMonth ? undefined : '#a31919',
              fontWeight: 700,
              '&:hover': {
                backgroundColor: outsideCurrentMonth ? undefined : '#f7d2d2',
              },
              '&.Mui-selected': {
                backgroundColor: '#c62828 !important',
                color: '#fff',
              },
            }
          : {}),
      }}
    />
  );
};

const AppointmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    appointments, 
    patients, 
    addAppointment, 
    updateAppointment, 
    deleteAppointment,
    getPatient 
  } = useData();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [openAppointmentDialog, setOpenAppointmentDialog] = useState(false);
  const [openReminderDialog, setOpenReminderDialog] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState<Partial<AppointmentData>>({});
  const [currentReminder, setCurrentReminder] = useState<Partial<Reminder>>({});

  // Carrega lembretes iniciais do localStorage
  useEffect(() => {
    const savedReminders = localStorage.getItem('reminders');
    if (savedReminders) {
      try {
        const parsedReminders = JSON.parse(savedReminders);
        // Converte as strings de data para objetos Date
        const remindersWithDates = parsedReminders.map((reminder: any) => ({
          ...reminder,
          date: new Date(reminder.date)
        }));
        setReminders(remindersWithDates);
      } catch (error) {
        console.error('Erro ao carregar lembretes:', error);
        setReminders([]);
      }
    } else {
      // Dados de exemplo para lembretes se não houver nada no localStorage
      const sampleReminders: Reminder[] = [
        {
          id: '1',
          title: 'Ligar para Sra. Pereira para confirmar consulta',
          date: new Date(),
          completed: false
        },
        {
          id: '2',
          title: 'Verificar resultados de exames do Sr. Almeida',
          date: new Date(new Date().setDate(new Date().getDate() + 1)),
          completed: false
        },
        {
          id: '3',
          title: 'Encaminhar relatório mensal',
          date: new Date(new Date().setDate(new Date().getDate() + 2)),
          completed: false
        }
      ];
      setReminders(sampleReminders);
    }
  }, []);

  // Salva lembretes no localStorage quando mudarem
  useEffect(() => {
    localStorage.setItem('reminders', JSON.stringify(reminders));
  }, [reminders]);

  // Obter detalhes do paciente para cada consulta
  const getAppointmentsWithPatientDetails = () => {
    return appointments.map(appointment => {
      const patient = getPatient(appointment.patientId);
      return {
        ...appointment,
        patientName: patient ? patient.name : 'Paciente não encontrado'
      };
    });
  };

  const allAppointmentsWithPatientDetails = getAppointmentsWithPatientDetails();
  const highlightedAppointmentDays = new Set(
    allAppointmentsWithPatientDetails
      .map((appointment) => parseAppointmentDate(appointment.date))
      .filter((value): value is Date => value instanceof Date)
      .map((value) => format(value, 'yyyy-MM-dd'))
  );

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

  // Filtrar consultas pela data selecionada
  const filteredAppointments = allAppointmentsWithPatientDetails.filter(appointment => {
    const appointmentDate = parseAppointmentDate(appointment.date);
    if (!appointmentDate) {
      return false;
    }

    return (
      appointmentDate.getDate() === selectedDate.getDate() &&
      appointmentDate.getMonth() === selectedDate.getMonth() &&
      appointmentDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  const weeklyAppointments = allAppointmentsWithPatientDetails
    .filter((appointment) => {
      const appointmentDate = parseAppointmentDate(appointment.date);
      if (!appointmentDate) {
        return false;
      }

      return isWithinInterval(appointmentDate, { start: weekStart, end: weekEnd });
    })
    .sort((a, b) => {
      const aDate = parseAppointmentDate(a.date);
      const bDate = parseAppointmentDate(b.date);
      const aValue = aDate ? `${format(aDate, 'yyyy-MM-dd')}T${a.time || '00:00'}` : '';
      const bValue = bDate ? `${format(bDate, 'yyyy-MM-dd')}T${b.time || '00:00'}` : '';
      return new Date(aValue).getTime() - new Date(bValue).getTime();
    });

  // Gerar ID único
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Manipuladores de eventos
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  const handleOpenAppointmentDialog = (appointment?: AppointmentData) => {
    if (appointment) {
      setCurrentAppointment(appointment);
    } else {
      setCurrentAppointment({
        patientId: '',
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: '',
        status: 'scheduled',
        reason: 'Consulta clínica',
        notes: ''
      });
    }
    setOpenAppointmentDialog(true);
  };

  const handleCloseAppointmentDialog = () => {
    setOpenAppointmentDialog(false);
    setCurrentAppointment({});
  };

  const handleOpenReminderDialog = (reminder?: Reminder) => {
    if (reminder) {
      setCurrentReminder(reminder);
    } else {
      setCurrentReminder({
        title: '',
        date: selectedDate,
        completed: false
      });
    }
    setOpenReminderDialog(true);
  };

  const handleCloseReminderDialog = () => {
    setOpenReminderDialog(false);
    setCurrentReminder({});
  };

  const handleSaveAppointment = () => {
    if (!currentAppointment.patientId || !currentAppointment.date || !currentAppointment.time) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (currentAppointment.id) {
      // Atualizar consulta existente
      updateAppointment(currentAppointment.id, {
        patientId: currentAppointment.patientId,
        date: currentAppointment.date,
        time: currentAppointment.time,
        status: currentAppointment.status as 'scheduled' | 'confirmed' | 'completed' | 'cancelled',
        reason: currentAppointment.reason,
        notes: currentAppointment.notes
      });
    } else {
      // Adicionar nova consulta
      addAppointment({
        patientId: currentAppointment.patientId as string,
        date: currentAppointment.date as string,
        time: currentAppointment.time as string,
        status: currentAppointment.status as 'scheduled' | 'confirmed' | 'completed' | 'cancelled',
        reason: String(currentAppointment.reason || 'Consulta clínica'),
        notes: currentAppointment.notes
      });
    }

    handleCloseAppointmentDialog();
  };

  const handleDeleteAppointment = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta consulta?')) {
      deleteAppointment(id);
    }
  };

  const handleStartVideoConsultation = (appointment: AppointmentData) => {
    const callData = buildAppointmentVideoCallData(String(appointment.id || ''));
    const mergedCallData = {
      videoCallUrl: normalizeVideoCallUrl(
        appointment.videoCallUrl || callData.videoCallUrl,
        appointment.videoCallRoom || callData.videoCallRoom
      ),
      videoCallRoom: appointment.videoCallRoom || callData.videoCallRoom,
      videoCallAccessCode: appointment.videoCallAccessCode || callData.videoCallAccessCode,
      videoCallProvider: normalizeVideoCallProvider(appointment.videoCallProvider || callData.videoCallProvider),
    };

    updateAppointment(appointment.id, mergedCallData);

    const params = new URLSearchParams({
      mode: 'appointment',
      appointmentId: String(appointment.id || ''),
    });

    navigate(`/teleconsulta?${params.toString()}`, {
      state: {
        mode: 'appointment',
        appointment: {
          ...appointment,
          ...mergedCallData,
        },
      },
    });
  };

  const handleSaveReminder = () => {
    if (!currentReminder.title || !currentReminder.date) {
      alert('Por favor, preencha todos os campos');
      return;
    }

    if (currentReminder.id) {
      // Atualizar lembrete existente
      setReminders(reminders.map(reminder => 
        reminder.id === currentReminder.id 
          ? { ...currentReminder as Reminder } 
          : reminder
      ));
    } else {
      // Adicionar novo lembrete
      const newReminder: Reminder = {
        id: generateId(),
        title: currentReminder.title as string,
        date: currentReminder.date as Date,
        completed: currentReminder.completed || false
      };
      setReminders([...reminders, newReminder]);
    }

    handleCloseReminderDialog();
  };

  const handleDeleteReminder = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este lembrete?')) {
      setReminders(reminders.filter(reminder => reminder.id !== id));
    }
  };

  const handleToggleReminderComplete = (id: string) => {
    setReminders(reminders.map(reminder => 
      reminder.id === id ? {...reminder, completed: !reminder.completed} : reminder
    ));
  };

  // Renderização de status colorido
  const getStatusChip = (status: AppointmentData['status']) => {
    const statusConfig = {
      scheduled: { label: 'Agendado', color: 'primary' as const },
      confirmed: { label: 'Confirmado', color: 'info' as const },
      completed: { label: 'Concluído', color: 'success' as const },
      cancelled: { label: 'Cancelado', color: 'error' as const }
    };
    
    const config = statusConfig[status];
    return <Chip size="small" label={config.label} color={config.color} />;
  };

  // Filtra lembretes pela data selecionada
  const filteredReminders = reminders.filter(reminder => 
    reminder.date.toDateString() === selectedDate.toDateString()
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Agendamentos
      </Typography>
      
      <Grid container spacing={3}>
        {/* Calendário */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CalendarMonth color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Calendário</Typography>
            </Box>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
              <DateCalendar 
                value={selectedDate} 
                onChange={(date) => {
                  if (date) {
                    handleDateChange(date);
                  }
                }}
                slots={{ day: AppointmentCalendarDay }}
                slotProps={{
                  day: {
                    highlightedDays: highlightedAppointmentDays,
                  } as any,
                }}
                sx={{ width: '100%' }}
              />
            </LocalizationProvider>
          </Paper>
        </Grid>
        
        {/* Lista de Consultas */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Schedule color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Consultas do Dia {format(selectedDate, 'dd/MM/yyyy')}
                </Typography>
              </Box>
              <Button 
                startIcon={<Add />} 
                variant="contained" 
                size="small"
                onClick={() => handleOpenAppointmentDialog()}
              >
                Nova
              </Button>
            </Box>
            
            {filteredAppointments.length > 0 ? (
              <List>
                {filteredAppointments.map((appointment, index) => (
                  <React.Fragment key={appointment.id}>
                    {index > 0 && <Divider component="li" />}
                    <ListItem sx={{ alignItems: 'flex-start', py: 1.25 }}>
                      <ListItemIcon sx={{ minWidth: 40, mt: 0.25 }}>
                        <Badge color="secondary" variant="dot">
                          <Today />
                        </Badge>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Stack spacing={0.6}>
                            <Stack
                              direction={{ xs: 'column', sm: 'row' }}
                              spacing={1}
                              alignItems={{ xs: 'flex-start', sm: 'center' }}
                              useFlexGap
                              flexWrap="wrap"
                            >
                              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                                {appointment.time}
                              </Typography>
                              <Typography variant="body1">{appointment.patientName}</Typography>
                              {getStatusChip(appointment.status)}
                            </Stack>

                            <Typography variant="body2" color="text.secondary">
                              {appointment.reason || 'Consulta'}
                            </Typography>

                            {appointment.notes && (
                              <Typography variant="caption" color="text.secondary">
                                {appointment.notes}
                              </Typography>
                            )}

                            <Stack direction="row" spacing={0.5} alignItems="center" useFlexGap flexWrap="wrap">
                              <Button
                                size="small"
                                startIcon={<VideoCall />}
                                variant="outlined"
                                onClick={() => handleStartVideoConsultation(appointment)}
                              >
                                Video + SOAP
                              </Button>
                              <IconButton size="small" onClick={() => handleOpenAppointmentDialog(appointment)}>
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleDeleteAppointment(appointment.id)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Stack>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  Não há consultas agendadas para esta data
                </Typography>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Consultas da semana ({format(weekStart, 'dd/MM')} - {format(weekEnd, 'dd/MM')})
            </Typography>

            {weeklyAppointments.length > 0 ? (
              <List dense>
                {weeklyAppointments.map((appointment, index) => (
                  <React.Fragment key={`week_${appointment.id}`}>
                    {index > 0 && <Divider component="li" />}
                    <ListItem sx={{ px: 0, alignItems: 'flex-start' }}>
                      <Box sx={{ width: '100%' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {format(parseAppointmentDate(appointment.date) || selectedDate, 'dd/MM')} às {appointment.time || '--:--'} -{' '}
                          {appointment.patientName || 'Paciente'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.8 }}>
                          {appointment.reason || 'Consulta'}
                          {appointment.notes ? ` | ${appointment.notes}` : ''}
                        </Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} useFlexGap>
                        {getStatusChip(appointment.status)}
                        <Button size="small" variant="outlined" startIcon={<VideoCall />} onClick={() => handleStartVideoConsultation(appointment)}>
                          Video + SOAP
                        </Button>
                        </Stack>
                      </Box>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nenhuma consulta cadastrada para esta semana.
              </Typography>
            )}
          </Paper>
        </Grid>
        
        {/* Lembretes */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Notifications color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Lembretes</Typography>
              </Box>
              <Button 
                startIcon={<Add />} 
                variant="contained" 
                size="small"
                onClick={() => handleOpenReminderDialog()}
              >
                Novo
              </Button>
            </Box>
            
            {filteredReminders.length > 0 ? (
              <List>
                {filteredReminders.map((reminder, index) => (
                  <React.Fragment key={reminder.id}>
                    {index > 0 && <Divider component="li" />}
                    <ListItem
                      sx={{
                        textDecoration: reminder.completed ? 'line-through' : 'none',
                        opacity: reminder.completed ? 0.6 : 1
                      }}
                      secondaryAction={
                        <Box>
                          <IconButton 
                            edge="end" 
                            onClick={() => handleToggleReminderComplete(reminder.id)}
                            sx={{ mr: 1 }}
                          >
                            <Chip 
                              label={reminder.completed ? "Concluído" : "Pendente"} 
                              size="small"
                              color={reminder.completed ? "success" : "warning"}
                            />
                          </IconButton>
                          <IconButton edge="end" onClick={() => handleOpenReminderDialog(reminder)} sx={{ mr: 1 }}>
                            <Edit />
                          </IconButton>
                          <IconButton edge="end" onClick={() => handleDeleteReminder(reminder.id)}>
                            <Delete />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={reminder.title}
                        secondary={format(reminder.date, 'dd/MM/yyyy')}
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  Não há lembretes para esta data
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Diálogo para Nova/Editar Consulta */}
      <Dialog open={openAppointmentDialog} onClose={handleCloseAppointmentDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentAppointment.id ? 'Editar Consulta' : 'Nova Consulta'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="patient-select-label">Paciente</InputLabel>
                <Select
                  labelId="patient-select-label"
                  value={currentAppointment.patientId || ''}
                  label="Paciente"
                  onChange={(e) => setCurrentAppointment({...currentAppointment, patientId: e.target.value})}
                >
                  {patients.map(patient => (
                    <MenuItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Data"
                type="date"
                fullWidth
                margin="normal"
                value={currentAppointment.date || format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setCurrentAppointment({...currentAppointment, date: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Hora"
                type="time"
                fullWidth
                margin="normal"
                value={currentAppointment.time || ''}
                onChange={(e) => setCurrentAppointment({...currentAppointment, time: e.target.value})}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Motivo da consulta"
                fullWidth
                margin="normal"
                value={currentAppointment.reason || 'Consulta clínica'}
                onChange={(e) => setCurrentAppointment({ ...currentAppointment, reason: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="status-select-label">Status</InputLabel>
                <Select
                  labelId="status-select-label"
                  value={currentAppointment.status || 'scheduled'}
                  label="Status"
                  onChange={(e) => setCurrentAppointment({
                    ...currentAppointment, 
                    status: e.target.value as 'scheduled' | 'completed' | 'cancelled'
                  })}
                >
                  <MenuItem value="scheduled">Agendado</MenuItem>
                  <MenuItem value="confirmed">Confirmado</MenuItem>
                  <MenuItem value="completed">Concluído</MenuItem>
                  <MenuItem value="cancelled">Cancelado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Observações"
                fullWidth
                margin="normal"
                multiline
                rows={2}
                value={currentAppointment.notes || ''}
                onChange={(e) => setCurrentAppointment({...currentAppointment, notes: e.target.value})}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAppointmentDialog}>Cancelar</Button>
          <Button onClick={handleSaveAppointment} variant="contained" color="primary">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para Novo/Editar Lembrete */}
      <Dialog open={openReminderDialog} onClose={handleCloseReminderDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentReminder.id ? 'Editar Lembrete' : 'Novo Lembrete'}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Título"
            fullWidth
            margin="normal"
            value={currentReminder.title || ''}
            onChange={(e) => setCurrentReminder({...currentReminder, title: e.target.value})}
          />
          <TextField
            label="Data"
            type="date"
            fullWidth
            margin="normal"
            value={currentReminder.date ? format(currentReminder.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => {
              const date = new Date(e.target.value);
              setCurrentReminder({...currentReminder, date});
            }}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReminderDialog}>Cancelar</Button>
          <Button onClick={handleSaveReminder} variant="contained" color="primary">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AppointmentsPage; 
