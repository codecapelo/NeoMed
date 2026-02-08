// Este serviço implementa uma autenticação local simples para desenvolvimento
import { testUsers } from '../data/users';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role?: string;
}

// Objeto para manter o usuário atualmente autenticado localmente
let currentLocalUser: AuthUser | null = null;

// Login com Google simulado
export const signInWithGoogle = async (): Promise<AuthUser> => {
  // Retorna o usuário administrador para simular login com Google
  const admin = testUsers.find(user => user.role === 'admin');
  if (admin) {
    currentLocalUser = {
      uid: admin.id,
      email: admin.email,
      displayName: admin.name,
      photoURL: null,
      role: admin.role,
    };
    return currentLocalUser;
  }
  
  // Fallback para um usuário padrão se não houver admin
  currentLocalUser = {
    uid: '123456789',
    email: 'admin@neomed.com',
    displayName: 'Administrador',
    photoURL: null,
    role: 'admin',
  };
  return currentLocalUser;
};

// Login com email e senha
export const signInWithEmail = async (email: string, password: string): Promise<AuthUser> => {
  console.log('Tentando login com:', email, password);
  
  // Procura o usuário na lista de usuários de teste
  const user = testUsers.find(user => user.email === email && user.password === password);
  
  if (!user) {
    console.error('Usuário não encontrado ou senha incorreta');
    throw new Error('auth/user-not-found');
  }
  
  console.log('Usuário encontrado:', user);
  
  // Cria o objeto de usuário autenticado
  currentLocalUser = {
    uid: user.id,
    email: user.email,
    displayName: user.name,
    photoURL: null,
    role: user.role,
  };
  
  return currentLocalUser;
};

// Cadastro de usuário simulado
export const signUpWithEmail = async (
  email: string, 
  password: string,
  name: string = ''
): Promise<AuthUser> => {
  // Verifica se o email já existe
  const userExists = testUsers.some(user => user.email === email);
  if (userExists) {
    throw new Error('auth/email-already-in-use');
  }
  
  // Cria um novo ID baseado no último ID + 1
  const lastId = Math.max(...testUsers.map(user => parseInt(user.id)));
  const newId = String(lastId + 1);
  
  // Adiciona o usuário à lista (em memória)
  const newUser = {
    id: newId,
    email,
    password,
    name: name || email.split('@')[0],
    role: 'doctor' as const,
    createdAt: new Date().toISOString(),
  };
  
  testUsers.push(newUser);
  
  // Retorna o usuário autenticado
  currentLocalUser = {
    uid: newUser.id,
    email: newUser.email,
    displayName: newUser.name,
    photoURL: null,
    role: newUser.role,
  };
  
  return currentLocalUser;
};

// Logout
export const signOut = async (): Promise<void> => {
  currentLocalUser = null;
};

// Obtém o usuário atual
export const getCurrentUser = (): AuthUser | null => {
  return currentLocalUser;
}; 