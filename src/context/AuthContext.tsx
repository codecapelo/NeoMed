import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import * as authService from '../services/authService';
import { AuthUser } from '../services/authService';

interface AuthContextType {
  currentUser: User | AuthUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar usuário inicial e configurar modo de autenticação
    console.log('Auth Provider initialized, checking auth mode...');
    console.log('Auth mode:', process.env.REACT_APP_AUTH_MODE);
    
    try {
      const user = authService.getCurrentUser();
      console.log('Current user:', user);
      setCurrentUser(user);
    } catch (error) {
      console.error('Error getting current user:', error);
      setError('Erro ao verificar o usuário atual.');
    } finally {
      setLoading(false);
    }
  }, []);

  async function signInWithGoogle() {
    try {
      setError(null);
      const user = await authService.signInWithGoogle();
      console.log('Google login successful:', user);
      setCurrentUser(user);
    } catch (error) {
      console.error('Erro ao fazer login com Google:', error);
      handleAuthError(error);
    }
  }

  async function signInWithEmail(email: string, password: string) {
    try {
      setError(null);
      console.log('Tentando login com email:', email);
      const user = await authService.signInWithEmail(email, password);
      console.log('Email login successful:', user);
      setCurrentUser(user);
    } catch (error) {
      console.error('Erro ao fazer login com email:', error);
      handleAuthError(error);
    }
  }

  async function signUpWithEmail(email: string, password: string, name?: string) {
    try {
      setError(null);
      const user = await authService.signUpWithEmail(email, password, name);
      console.log('Signup successful:', user);
      setCurrentUser(user);
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      handleAuthError(error);
    }
  }

  async function logout() {
    try {
      setError(null);
      await authService.signOut();
      setCurrentUser(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      setError('Erro ao fazer logout.');
    }
  }

  function clearError() {
    setError(null);
  }

  // Função auxiliar para tratar erros de autenticação
  function handleAuthError(error: any) {
    console.log('Handling auth error:', error);
    
    if (!error) {
      setError('Erro desconhecido durante a autenticação.');
      return;
    }
    
    const errorCode = error.code || (error.message && error.message.includes('auth/') 
      ? error.message 
      : null);
    
    console.log('Error code:', errorCode);
    
    if (errorCode === 'auth/user-not-found' || error.message === 'auth/user-not-found') {
      setError('Usuário não encontrado. Verifique o email informado.');
    } else if (errorCode === 'auth/wrong-password') {
      setError('Senha incorreta. Tente novamente.');
    } else if (errorCode === 'auth/invalid-email') {
      setError('Email inválido. Verifique o formato do email.');
    } else if (errorCode === 'auth/user-disabled') {
      setError('Esta conta foi desativada. Entre em contato com o administrador.');
    } else if (errorCode === 'auth/too-many-requests') {
      setError('Muitas tentativas de login. Tente novamente mais tarde.');
    } else if (errorCode === 'auth/email-already-in-use') {
      setError('Este email já está sendo usado por outra conta.');
    } else if (errorCode === 'auth/weak-password') {
      setError('Senha fraca. Use uma senha mais forte.');
    } else if (errorCode === 'auth/popup-closed-by-user') {
      setError('O popup de login foi fechado antes de completar a autenticação.');
    } else if (errorCode === 'auth/popup-blocked') {
      setError('O popup de login foi bloqueado pelo navegador. Por favor, permita popups para este site.');
    } else if (errorCode === 'auth/cancelled-popup-request') {
      setError('Múltiplas requisições de popup foram feitas. Por favor, tente novamente.');
    } else if (errorCode === 'auth/network-request-failed') {
      setError('Erro de rede. Verifique sua conexão com a internet.');
    } else {
      setError(`Erro ao realizar operação: ${error.message || 'Erro desconhecido'}`);
    }
  }

  const value = {
    currentUser,
    loading,
    error,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logout,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 