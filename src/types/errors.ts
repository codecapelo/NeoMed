/**
 * Enumeração para códigos de erro da aplicação
 */
export enum ErrorCode {
  // Erros de autenticação
  AUTH_ERROR = 'auth/error',
  INVALID_CREDENTIALS = 'auth/invalid-credentials',
  USER_NOT_FOUND = 'auth/user-not-found',
  EMAIL_ALREADY_IN_USE = 'auth/email-already-in-use',
  WEAK_PASSWORD = 'auth/weak-password',
  
  // Erros de armazenamento
  STORAGE_ERROR = 'storage/error',
  DATA_NOT_FOUND = 'storage/data-not-found',
  QUOTA_EXCEEDED = 'storage/quota-exceeded',
  
  // Erros de API
  API_ERROR = 'api/error',
  NETWORK_ERROR = 'api/network-error',
  TIMEOUT_ERROR = 'api/timeout',
  
  // Erros de validação
  VALIDATION_ERROR = 'validation/error',
  REQUIRED_FIELD = 'validation/required-field',
  INVALID_FORMAT = 'validation/invalid-format',
  
  // Erros gerais
  UNKNOWN_ERROR = 'unknown/error'
}

/**
 * Interface para erros da aplicação
 */
export interface AppError {
  code: ErrorCode;
  message: string;
  details?: any;
}

/**
 * Interface para respostas de operações que podem falhar
 */
export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: AppError;
} 