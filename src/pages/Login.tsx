import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Paper, 
  Typography, 
  Container, 
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
  Stack,
  Link as MuiLink,
} from '@mui/material';
import { Google as GoogleIcon, Email as EmailIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import logoSvg from '../assets/images/logo-medical.svg';
import EnhancedTextField from '../components/common/EnhancedTextField';

export default function Login() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, currentUser, loading, error, clearError } = useAuth();
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
      setEmailError('Email é obrigatório');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Email inválido');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Senha é obrigatória');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres');
      isValid = false;
    }

    if (showSignup && !name) {
      setNameError('Nome é obrigatório');
      isValid = false;
    }

    return isValid;
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    await signInWithGoogle();
    setIsLoggingIn(false);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoggingIn(true);
    if (showSignup) {
      await signUpWithEmail(email, password, name);
    } else {
      await signInWithEmail(email, password);
    }
    setIsLoggingIn(false);
  };

  const toggleForm = () => {
    setShowSignup(!showSignup);
    setEmail('');
    setPassword('');
    setName('');
    setEmailError('');
    setPasswordError('');
    setNameError('');
  };

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh'
        }}
      >
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
      
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
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
          <Box 
            component="img"
            src={logoSvg} 
            alt="NeoMed Logo" 
            sx={{ 
              width: 120, 
              height: 120, 
              mb: 2 
            }} 
          />
          
          <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
            {showSignup ? 'Criar Nova Conta' : 'Entrar na sua Conta'}
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 3, textAlign: 'center' }}>
            {showSignup ? 'Crie sua conta para começar a usar o sistema' : 'Faça login para acessar o sistema de gerenciamento médico'}
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
                  onChange={(e) => setName(e.target.value)}
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
                onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
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
                sx={{ 
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500
                }}
              >
                {isLoggingIn 
                  ? 'Processando...' 
                  : showSignup 
                    ? 'Criar Conta' 
                    : 'Entrar com Email'
                }
              </Button>
            </Stack>
          </form>
          
          <Divider sx={{ width: '100%', my: 3 }}>ou</Divider>
          
          <Button
            fullWidth
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            sx={{ 
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            {isLoggingIn ? 'Processando...' : 'Continuar com Google'}
          </Button>
          
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <MuiLink 
              component="button" 
              variant="body2" 
              onClick={toggleForm}
              sx={{ cursor: 'pointer' }}
            >
              {showSignup 
                ? 'Já tem uma conta? Faça login' 
                : 'Não tem uma conta? Cadastre-se'
              }
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