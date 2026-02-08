import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Link as MuiLink,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { Email as EmailIcon } from '@mui/icons-material';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoSvg from '../assets/images/logo-medical.svg';
import EnhancedTextField from '../components/common/EnhancedTextField';

export default function Login() {
  const { signInWithEmail, signUpWithEmail, currentUser, loading, error, clearError } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showSignup, setShowSignup] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [nameError, setNameError] = useState('');

  const validateForm = () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');
    setNameError('');

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

    if (showSignup && !name) {
      setNameError('Nome e obrigatorio');
      isValid = false;
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
        await signUpWithEmail(email, password, name);
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
    setEmailError('');
    setPasswordError('');
    setNameError('');
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
    <Container component="main" maxWidth="xs">
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
              ? 'Crie sua conta para comecar a usar o sistema'
              : 'Faca login para acessar o sistema de gerenciamento medico'}
          </Typography>

          <form onSubmit={handleEmailLogin} style={{ width: '100%' }}>
            <Stack spacing={2} sx={{ width: '100%' }}>
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
