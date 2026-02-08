import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  Unsubscribe, 
  User, 
  Auth
} from 'firebase/auth';

// Verifica se estamos em modo de autenticação local
// Usamos == aqui para comparar string com boolean em ambientes diferentes
const isLocalAuth = process.env.REACT_APP_AUTH_MODE === 'local' || process.env.REACT_APP_AUTH_MODE == 'true';

console.log('Auth mode:', process.env.REACT_APP_AUTH_MODE, 'isLocalAuth:', isLocalAuth);

// Interface para o auth mockado com propriedades adicionais
interface MockAuth {
  currentUser: User | null;
  onAuthStateChanged: (callback: (user: User | null) => void) => Unsubscribe;
  settings: {
    appVerificationDisabledForTesting: boolean;
  };
}

// Criamos mocks para autenticação local
const mockUser = {
  uid: '123456789',
  email: 'mock@example.com',
  displayName: 'Mock User',
  emailVerified: true,
  isAnonymous: false,
  photoURL: null,
  providerData: [],
  tenantId: null,
  metadata: {
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString()
  },
  refreshToken: 'mock-refresh-token',
  phoneNumber: null,
  providerId: 'password',
  delete: () => Promise.resolve(),
  getIdToken: () => Promise.resolve('mock-token'),
  getIdTokenResult: () => Promise.resolve({
    token: 'mock-token',
    authTime: new Date().toISOString(),
    issuedAtTime: new Date().toISOString(),
    expirationTime: new Date(Date.now() + 3600000).toISOString(),
    signInProvider: 'password',
    signInSecondFactor: null,
    claims: {}
  }),
  reload: () => Promise.resolve(),
  toJSON: () => ({})
} as User;

let auth: Auth | MockAuth;
let googleProvider: GoogleAuthProvider | Record<string, never>;

if (!isLocalAuth) {
  try {
    // Configuração do Firebase usando variáveis de ambiente
    const firebaseConfig = {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.REACT_APP_FIREBASE_APP_ID
    };

    // Inicializa Firebase apenas se as configurações forem válidas
    if (firebaseConfig.apiKey) {
      const app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      googleProvider = new GoogleAuthProvider();

      // Adiciona escopos para acesso ao Gmail
      googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
      googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
      googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');

      // Configurar parâmetros personalizados
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });
    } else {
      throw new Error('Firebase configuration is incomplete');
    }
  } catch (error) {
    console.warn('Error initializing Firebase, falling back to local mode:', error);
    // Em caso de erro, fallback para autenticação local
    auth = {
      currentUser: null,
      onAuthStateChanged: (callback: (user: User | null) => void): Unsubscribe => {
        callback(null);
        return () => {};
      },
      settings: {
        appVerificationDisabledForTesting: false
      }
    };
    googleProvider = {};
  }
} else {
  console.log('Using local authentication mode');
  // Mock objects for local authentication
  auth = {
    currentUser: null,
    onAuthStateChanged: (callback: (user: User | null) => void): Unsubscribe => {
      callback(null);
      return () => {};
    },
    settings: {
      appVerificationDisabledForTesting: false
    }
  };
  googleProvider = {};
}

export { auth, googleProvider }; 