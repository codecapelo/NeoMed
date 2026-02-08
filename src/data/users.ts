// Este arquivo contém usuários de teste que podem ser usados em ambiente de desenvolvimento
// Em produção, esses usuários devem ser removidos e substituídos pelo Firebase Auth
// ou outro sistema de autenticação mais seguro

interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'doctor' | 'nurse' | 'receptionist';
  createdAt: string;
}

export const testUsers: User[] = [
  {
    id: '1',
    email: 'admin@neomed.com',
    password: 'admin123',
    name: 'Administrador',
    role: 'admin',
    createdAt: '2023-01-01T00:00:00Z',
  },
  {
    id: '2',
    email: 'medico@neomed.com',
    password: 'medico123',
    name: 'Dr. João Silva',
    role: 'doctor',
    createdAt: '2023-01-02T00:00:00Z',
  },
  {
    id: '3',
    email: 'enfermeira@neomed.com',
    password: 'enfermeira123',
    name: 'Maria Oliveira',
    role: 'nurse',
    createdAt: '2023-01-03T00:00:00Z',
  },
  {
    id: '4',
    email: 'recepcao@neomed.com',
    password: 'recepcao123',
    name: 'Ana Souza',
    role: 'receptionist',
    createdAt: '2023-01-04T00:00:00Z',
  }
];

// Função para verificar credenciais
export const verifyCredentials = (email: string, password: string): User | null => {
  const user = testUsers.find(user => user.email === email && user.password === password);
  if (user) {
    // Retorna o usuário sem a senha
    const { password, ...userWithoutPassword } = user;
    return { ...userWithoutPassword, password: '' } as User;
  }
  return null;
};

// Função para verificar se o email já existe
export const emailExists = (email: string): boolean => {
  return testUsers.some(user => user.email === email);
};

// Função para adicionar um novo usuário (em memória apenas)
export const addUser = (email: string, password: string, name: string, role: User['role'] = 'doctor'): User => {
  const newUser: User = {
    id: String(testUsers.length + 1),
    email,
    password,
    name,
    role,
    createdAt: new Date().toISOString(),
  };
  
  testUsers.push(newUser);
  
  // Retorna o usuário sem a senha
  const { password: _, ...userWithoutPassword } = newUser;
  return { ...userWithoutPassword, password: '' } as User;
}; 