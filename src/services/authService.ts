export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role?: string;
  createdAt?: string;
  lastSeenAt?: string | null;
  isOnline?: boolean;
}

interface AuthResponse {
  success: boolean;
  user: AuthUser;
  token: string;
}

const AUTH_TOKEN_KEY = 'neomed_auth_token';
const AUTH_USER_KEY = 'neomed_auth_user';

const getApiBase = () => {
  if (process.env.REACT_APP_API_BASE) {
    return process.env.REACT_APP_API_BASE;
  }

  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3001';
  }

  return '';
};

const parseApiError = async (response: Response): Promise<never> => {
  let payload: any = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const error = new Error(payload?.message || `Request failed with status ${response.status}`) as Error & {
    code?: string;
  };

  error.code = payload?.code || undefined;
  throw error;
};

const saveSession = (token: string, user: AuthUser) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

const clearSession = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
};

const requestAuth = async (path: string, body: Record<string, unknown>): Promise<AuthResponse> => {
  const response = await fetch(`${getApiBase()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await parseApiError(response);
  }

  return response.json();
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

export const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();

  if (!token) {
    return {
      'Content-Type': 'application/json',
    };
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export const signInWithGoogle = async (): Promise<AuthUser> => {
  const error = new Error('auth/google-not-enabled');
  throw error;
};

export const signInWithEmail = async (email: string, password: string): Promise<AuthUser> => {
  const payload = await requestAuth('/api/auth/login', { email, password });
  saveSession(payload.token, payload.user);
  return payload.user;
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  name: string = ''
): Promise<AuthUser> => {
  const payload = await requestAuth('/api/auth/register', { email, password, name });
  saveSession(payload.token, payload.user);
  return payload.user;
};

export const signOut = async (): Promise<void> => {
  const token = getAuthToken();

  clearSession();

  if (!token) {
    return;
  }

  try {
    await fetch(`${getApiBase()}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    // Ignore network failures during logout.
  }
};

export const getCurrentUser = (): AuthUser | null => {
  const rawUser = localStorage.getItem(AUTH_USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    clearSession();
    return null;
  }
};

export const refreshCurrentUser = async (): Promise<AuthUser | null> => {
  const token = getAuthToken();

  if (!token) {
    return null;
  }

  const response = await fetch(`${getApiBase()}/api/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    clearSession();
    return null;
  }

  const payload = await response.json();
  if (!payload?.user) {
    clearSession();
    return null;
  }

  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(payload.user));
  return payload.user as AuthUser;
};

export const pingSession = async (): Promise<AuthUser | null> => {
  const token = getAuthToken();

  if (!token) {
    return null;
  }

  const response = await fetch(`${getApiBase()}/api/auth/ping`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearSession();
    }
    return null;
  }

  const payload = await response.json();
  if (!payload?.user) {
    return null;
  }

  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(payload.user));
  return payload.user as AuthUser;
};

export const getApiBaseUrl = getApiBase;
