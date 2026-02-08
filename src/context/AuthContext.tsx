import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as authService from '../services/authService';
import { AuthUser } from '../services/authService';

interface AuthContextType {
  currentUser: AuthUser | null;
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
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const cachedUser = authService.getCurrentUser();
        if (cachedUser) {
          setCurrentUser(cachedUser);
        }

        const freshUser = await authService.refreshCurrentUser();
        setCurrentUser(freshUser);
      } catch {
        setError('Erro ao verificar a sessão atual.');
      } finally {
        setLoading(false);
      }
    };

    bootstrapAuth();
  }, []);

  async function signInWithGoogle() {
    try {
      setError(null);
      const user = await authService.signInWithGoogle();
      setCurrentUser(user);
    } catch (authError) {
      handleAuthError(authError);
    }
  }

  async function signInWithEmail(email: string, password: string) {
    try {
      setError(null);
      const user = await authService.signInWithEmail(email, password);
      setCurrentUser(user);
    } catch (authError) {
      handleAuthError(authError);
    }
  }

  async function signUpWithEmail(email: string, password: string, name?: string) {
    try {
      setError(null);
      const user = await authService.signUpWithEmail(email, password, name);
      setCurrentUser(user);
    } catch (authError) {
      handleAuthError(authError);
    }
  }

  async function logout() {
    try {
      setError(null);
      await authService.signOut();
      setCurrentUser(null);
    } catch {
      setError('Erro ao fazer logout.');
    }
  }

  function clearError() {
    setError(null);
  }

  function handleAuthError(authError: unknown) {
    const errorObj = authError as Error & { code?: string };
    const code = errorObj?.code || errorObj?.message || '';

    if (code.includes('auth/invalid-credentials')) {
      setError('Email ou senha incorretos.');
      return;
    }

    if (code.includes('auth/email-already-in-use')) {
      setError('Este email ja esta sendo usado por outra conta.');
      return;
    }

    if (code.includes('auth/weak-password')) {
      setError('Senha fraca. Use pelo menos 6 caracteres.');
      return;
    }

    if (code.includes('auth/invalid-email')) {
      setError('Email invalido. Verifique o formato informado.');
      return;
    }

    if (code.includes('auth/google-not-enabled')) {
      setError('Login com Google nao esta habilitado nesta versao.');
      return;
    }

    setError(errorObj?.message || 'Erro desconhecido durante a autenticacao.');
  }

  const value = {
    currentUser,
    loading,
    error,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}
