import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  Link as MuiLink,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Email as EmailIcon } from '@mui/icons-material';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as authService from '../services/authService';
import type { DoctorSignupOption, PatientSignupProfile, SignupRole } from '../services/authService';
import logoSvg from '../assets/images/logo-medical.svg';
import EnhancedTextField from '../components/common/EnhancedTextField';
import { hasBrazilPhoneDigits, normalizePhoneWithBrazilCountryCode } from '../utils/phone';

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

const defaultPatientProfile: PatientSignupProfile = {
  cpf: '',
  phone: '+55',
  dateOfBirth: '',
  gender: 'other',
  address: '',
  healthInsurance: '',
  bloodType: '',
  medicalHistory: '',
};

export default function Login() {
  const { signInWithEmail, signUpWithEmail, currentUser, loading, error, clearError } = useAuth();

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showSignup, setShowSignup] = useState(false);
  const [accessRole, setAccessRole] = useState<SignupRole>('doctor');

  const [doctorOptions, setDoctorOptions] = useState<DoctorSignupOption[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctorLoadError, setDoctorLoadError] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  const [patientProfile, setPatientProfile] = useState<PatientSignupProfile>(defaultPatientProfile);

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [nameError, setNameError] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [birthDateError, setBirthDateError] = useState('');
  const [doctorError, setDoctorError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadDoctors = async () => {
      if (!showSignup || accessRole !== 'patient') {
        return;
      }

      try {
        setLoadingDoctors(true);
        setDoctorLoadError('');
        const doctors = await authService.listDoctorsForSignup();

        if (cancelled) {
          return;
        }

        setDoctorOptions(doctors);

        if (!doctors.length) {
          setDoctorLoadError('Nenhum medico disponivel para vinculo.');
          setSelectedDoctorId('');
          return;
        }

        setSelectedDoctorId((prev) => {
          if (prev && doctors.some((doctor) => doctor.id === prev)) {
            return prev;
          }
          return doctors[0].id;
        });
      } catch {
        if (!cancelled) {
          setDoctorOptions([]);
          setSelectedDoctorId('');
          setDoctorLoadError('Nao foi possivel carregar os medicos. Tente novamente em instantes.');
        }
      } finally {
        if (!cancelled) {
          setLoadingDoctors(false);
        }
      }
    };

    loadDoctors();

    return () => {
      cancelled = true;
    };
  }, [showSignup, accessRole]);

  const validateForm = () => {
    let isValid = true;

    setEmailError('');
    setPasswordError('');
    setNameError('');
    setCpfError('');
    setPhoneError('');
    setBirthDateError('');
    setDoctorError('');

    if (!email) {
      setEmailError('Email e obrigatorio');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Email invalido');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Senha e obrigatoria');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres');
      isValid = false;
    }

    if (showSignup && !name.trim()) {
      setNameError('Nome e obrigatorio');
      isValid = false;
    }

    if (showSignup && accessRole === 'patient') {
      const cpfValue = formatCpf(patientProfile.cpf || '');
      const normalizedPhone = normalizePhoneWithBrazilCountryCode(patientProfile.phone || '');

      if (!cpfValue) {
        setCpfError('CPF e obrigatorio');
        isValid = false;
      } else if (!isValidCpf(cpfValue)) {
        setCpfError('Informe um CPF valido');
        isValid = false;
      }

      if (!hasBrazilPhoneDigits(normalizedPhone)) {
        setPhoneError('Telefone invalido. Informe DDD + numero.');
        isValid = false;
      }

      if (!patientProfile.dateOfBirth) {
        setBirthDateError('Data de nascimento e obrigatoria');
        isValid = false;
      }

      if (!selectedDoctorId) {
        setDoctorError('Selecione um medico para vincular o cadastro');
        isValid = false;
      }
    }

    return isValid;
  };

  const handleEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoggingIn(true);

    try {
      if (showSignup) {
        await signUpWithEmail(email, password, name, {
          role: accessRole,
          doctorId: accessRole === 'patient' ? selectedDoctorId : undefined,
          patientProfile:
            accessRole === 'patient'
              ? {
                  ...patientProfile,
                  cpf: formatCpf(patientProfile.cpf || ''),
                  phone: normalizePhoneWithBrazilCountryCode(patientProfile.phone || ''),
                }
              : undefined,
        });
      } else {
        await signInWithEmail(email, password);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const toggleForm = () => {
    setShowSignup((prev) => !prev);
    setEmail('');
    setPassword('');
    setName('');
    setDoctorOptions([]);
    setLoadingDoctors(false);
    setDoctorLoadError('');
    setSelectedDoctorId('');
    setPatientProfile(defaultPatientProfile);
    setEmailError('');
    setPasswordError('');
    setNameError('');
    setCpfError('');
    setPhoneError('');
    setBirthDateError('');
    setDoctorError('');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (currentUser) {
    return <Navigate to="/" />;
  }

  return (
    <Container component="main" maxWidth="sm">
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={clearError}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={clearError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2,
            width: '100%',
            bgcolor: 'background.paper',
          }}
        >
          <Box component="img" src={logoSvg} alt="NeoMed Logo" sx={{ width: 120, height: 120, mb: 2 }} />

          <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
            {showSignup ? 'Criar Nova Conta' : 'Entrar na sua Conta'}
          </Typography>

          <Typography variant="body2" sx={{ mb: 3, textAlign: 'center' }}>
            {showSignup
              ? accessRole === 'patient'
                ? 'Cadastre-se como paciente e vincule seu medico responsavel'
                : 'Crie sua conta para comecar a usar o sistema'
              : accessRole === 'patient'
              ? 'Acesse como paciente para ver suas prescricoes'
              : 'Acesse como medico para gerir pacientes e prescricoes'}
          </Typography>

          <form onSubmit={handleEmailLogin} style={{ width: '100%' }}>
            <Stack spacing={2} sx={{ width: '100%' }}>
              <>
                <Typography variant="subtitle2" color="text.secondary">
                  Voce e:
                </Typography>
                <ToggleButtonGroup
                  color="primary"
                  value={accessRole}
                  exclusive
                  fullWidth
                  onChange={(_, value: SignupRole | null) => {
                    if (!value) {
                      return;
                    }

                    setAccessRole(value);
                    setCpfError('');
                    setPhoneError('');
                    setBirthDateError('');
                    setDoctorError('');
                  }}
                >
                  <ToggleButton value="doctor">Sou medico</ToggleButton>
                  <ToggleButton value="patient">Sou paciente</ToggleButton>
                </ToggleButtonGroup>
              </>

              {showSignup && (
                <EnhancedTextField
                  required
                  fullWidth
                  id="name"
                  label="Nome completo"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  error={!!nameError}
                  helperText={nameError}
                  disabled={isLoggingIn}
                />
              )}

              <EnhancedTextField
                required
                fullWidth
                id="email"
                label="Email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={!!emailError}
                helperText={emailError}
                disabled={isLoggingIn}
              />

              <EnhancedTextField
                required
                fullWidth
                name="password"
                label="Senha"
                type="password"
                id="password"
                autoComplete={showSignup ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                error={!!passwordError}
                helperText={passwordError}
                disabled={isLoggingIn}
              />

              {showSignup && accessRole === 'patient' && (
                <>
                  <EnhancedTextField
                    required
                    fullWidth
                    id="patient-cpf"
                    label="CPF"
                    name="patient-cpf"
                    value={patientProfile.cpf}
                    onChange={(event) =>
                      setPatientProfile((prev) => ({
                        ...prev,
                        cpf: formatCpf(event.target.value),
                      }))
                    }
                    error={!!cpfError}
                    helperText={cpfError}
                    inputProps={{ maxLength: 14 }}
                    disabled={isLoggingIn}
                  />

                  <EnhancedTextField
                    required
                    fullWidth
                    id="patient-phone"
                    label="Telefone"
                    name="patient-phone"
                    value={patientProfile.phone}
                    onChange={(event) =>
                      setPatientProfile((prev) => ({
                        ...prev,
                        phone: normalizePhoneWithBrazilCountryCode(event.target.value, {
                          keepPrefixWhenEmpty: true,
                        }),
                      }))
                    }
                    error={!!phoneError}
                    helperText={phoneError}
                    disabled={isLoggingIn}
                  />

                  <EnhancedTextField
                    required
                    fullWidth
                    id="patient-date-of-birth"
                    label="Data de nascimento"
                    name="patient-date-of-birth"
                    type="date"
                    value={patientProfile.dateOfBirth}
                    onChange={(event) =>
                      setPatientProfile((prev) => ({
                        ...prev,
                        dateOfBirth: event.target.value,
                      }))
                    }
                    error={!!birthDateError}
                    helperText={birthDateError}
                    disabled={isLoggingIn}
                    InputLabelProps={{ shrink: true }}
                  />

                  <FormControl fullWidth>
                    <InputLabel id="patient-gender-label">Genero</InputLabel>
                    <Select
                      labelId="patient-gender-label"
                      value={patientProfile.gender}
                      label="Genero"
                      onChange={(event) =>
                        setPatientProfile((prev) => ({
                          ...prev,
                          gender: event.target.value as PatientSignupProfile['gender'],
                        }))
                      }
                      disabled={isLoggingIn}
                    >
                      <MenuItem value="male">Masculino</MenuItem>
                      <MenuItem value="female">Feminino</MenuItem>
                      <MenuItem value="other">Outro</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth error={!!doctorError || !!doctorLoadError}>
                    <InputLabel id="doctor-select-label">Medico responsavel</InputLabel>
                    <Select
                      labelId="doctor-select-label"
                      value={selectedDoctorId}
                      label="Medico responsavel"
                      onChange={(event) => setSelectedDoctorId(String(event.target.value || ''))}
                      disabled={isLoggingIn || loadingDoctors || doctorOptions.length === 0}
                    >
                      {doctorOptions.map((doctor) => (
                        <MenuItem key={doctor.id} value={doctor.id}>
                          {doctor.name} ({doctor.email})
                        </MenuItem>
                      ))}
                    </Select>
                    {(doctorError || doctorLoadError) && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.75, ml: 1.75 }}>
                        {doctorError || doctorLoadError}
                      </Typography>
                    )}
                  </FormControl>

                  <EnhancedTextField
                    fullWidth
                    id="patient-address"
                    label="Endereco"
                    name="patient-address"
                    value={patientProfile.address || ''}
                    onChange={(event) =>
                      setPatientProfile((prev) => ({
                        ...prev,
                        address: event.target.value,
                      }))
                    }
                    disabled={isLoggingIn}
                  />
                </>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                startIcon={<EmailIcon />}
                disabled={isLoggingIn}
                sx={{ py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 500 }}
              >
                {isLoggingIn ? 'Processando...' : showSignup ? 'Criar Conta' : 'Entrar com Email'}
              </Button>
            </Stack>
          </form>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <MuiLink component="button" variant="body2" onClick={toggleForm} sx={{ cursor: 'pointer' }}>
              {showSignup ? 'Ja tem uma conta? Faca login' : 'Nao tem uma conta? Cadastre-se'}
            </MuiLink>
          </Box>
        </Paper>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
          &copy; {new Date().getFullYear()} NeoMed. Todos os direitos reservados.
        </Typography>
      </Box>
    </Container>
  );
}
