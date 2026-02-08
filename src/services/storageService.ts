import { ErrorCode } from '../types/errors';

// Prefixo para todas as chaves do localStorage para evitar conflitos
const STORAGE_PREFIX = 'neomed_';

// Interface para os tipos de dados que podemos armazenar
export interface StorageData {
  patients?: any[];
  prescriptions?: any[];
  appointments?: any[];
  medicalRecords?: any[];
  userPreferences?: any;
  [key: string]: any; // Permite outros tipos de dados
}

// Função para gerar a chave específica do usuário
const getUserKey = (userId: string, dataType: string) => {
  return `${STORAGE_PREFIX}${userId}_${dataType}`;
};

// Salvar dados no localStorage
export const saveData = (userId: string, dataType: string, data: any): void => {
  try {
    const key = getUserKey(userId, dataType);
    console.log(`Salvando dados para ${key}:`, data);
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Erro ao salvar dados do tipo ${dataType}:`, error);
    throw new Error('Falha ao salvar dados no armazenamento local');
  }
};

// Carregar dados do localStorage
export const loadData = (userId: string, dataType: string): any => {
  try {
    const key = getUserKey(userId, dataType);
    const data = localStorage.getItem(key);
    const parsedData = data ? JSON.parse(data) : null;
    console.log(`Carregando dados de ${key}:`, parsedData);
    return parsedData;
  } catch (error) {
    console.error(`Erro ao carregar dados do tipo ${dataType}:`, error);
    throw new Error('Falha ao carregar dados do armazenamento local');
  }
};

// Remover dados do localStorage
export const removeData = (userId: string, dataType: string): void => {
  try {
    const key = getUserKey(userId, dataType);
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Erro ao remover dados do tipo ${dataType}:`, error);
    throw new Error('Falha ao remover dados do armazenamento local');
  }
};

// Limpar todos os dados do usuário
export const clearUserData = (userId: string): void => {
  try {
    Object.keys(localStorage)
      .filter(key => key.startsWith(`${STORAGE_PREFIX}${userId}_`))
      .forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Erro ao limpar dados do usuário:', error);
    throw new Error('Falha ao limpar dados do usuário');
  }
};

// Verificar se existem dados salvos
export const hasData = (userId: string, dataType: string): boolean => {
  try {
    const key = getUserKey(userId, dataType);
    const item = localStorage.getItem(key);
    const result = item !== null;
    console.log(`Verificando existência de ${key}: ${result}`);
    
    // Verificação adicional para arrays vazios
    if (result && item) {
      const data = JSON.parse(item);
      if (Array.isArray(data) && data.length === 0) {
        console.log(`${key} existe, mas é um array vazio`);
        return false;
      }
    }
    
    return result;
  } catch (error) {
    console.error(`Erro ao verificar dados do tipo ${dataType}:`, error);
    return false;
  }
};

// Listar todas as chaves para um usuário específico
export const listUserStorageKeys = (userId: string): string[] => {
  try {
    return Object.keys(localStorage)
      .filter(key => key.startsWith(`${STORAGE_PREFIX}${userId}_`))
      .map(key => key.replace(`${STORAGE_PREFIX}${userId}_`, ''));
  } catch (error) {
    console.error('Erro ao listar chaves do armazenamento:', error);
    return [];
  }
};

// Depurar todos os dados do localStorage
export const debugLocalStorage = (): void => {
  console.group('Depuração do LocalStorage');
  console.log('Total de itens:', localStorage.length);
  
  try {
    // Listar todas as chaves que correspondem ao nosso prefixo
    const neomedKeys = Object.keys(localStorage)
      .filter(key => key.startsWith(STORAGE_PREFIX));
    
    console.log('Chaves NeoMed:', neomedKeys);
    
    // Para cada chave, exibir os dados armazenados
    neomedKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        const parsedValue = value ? JSON.parse(value) : null;
        console.log(`${key}:`, parsedValue);
      } catch (e) {
        console.log(`${key}: [Erro ao analisar JSON]`, e);
      }
    });
  } catch (error) {
    console.error('Erro ao depurar localStorage:', error);
  }
  
  console.groupEnd();
};

// Obter o tamanho aproximado dos dados armazenados (em bytes)
export const getStorageSize = (userId: string): number => {
  try {
    return Object.entries(localStorage)
      .filter(([key]) => key.startsWith(`${STORAGE_PREFIX}${userId}_`))
      .reduce((size, [key, value]) => {
        return size + (key.length + (value?.length || 0)) * 2; // Multiplicado por 2 pois cada caractere usa 2 bytes
      }, 0);
  } catch (error) {
    console.error('Erro ao calcular tamanho do armazenamento:', error);
    return 0;
  }
};

// Exportar dados do usuário
export const exportUserData = async (userId: string): Promise<string> => {
  try {
    const userData: StorageData = {};
    Object.keys(localStorage)
      .filter(key => key.startsWith(`${STORAGE_PREFIX}${userId}_`))
      .forEach(key => {
        const dataType = key.replace(`${STORAGE_PREFIX}${userId}_`, '');
        userData[dataType] = loadData(userId, dataType);
      });
    
    return JSON.stringify(userData);
  } catch (error) {
    console.error('Erro ao exportar dados do usuário:', error);
    throw new Error('Falha ao exportar dados do usuário');
  }
};

// Importar dados do usuário
export const importUserData = async (userId: string, jsonData: string): Promise<void> => {
  try {
    const userData: StorageData = JSON.parse(jsonData);
    Object.entries(userData).forEach(([dataType, data]) => {
      saveData(userId, dataType, data);
    });
  } catch (error) {
    console.error('Erro ao importar dados do usuário:', error);
    throw new Error('Falha ao importar dados do usuário');
  }
};

/**
 * Serviço para gerenciar operações de armazenamento local
 */
export const storageService = {
  /**
   * Salva um valor no localStorage com um prefixo de usuário
   * @param key Chave para o valor
   * @param value Valor a ser armazenado
   * @param userId ID do usuário atual
   */
  saveData: (key: string, value: any, userId?: string) => {
    try {
      const prefixedKey = userId ? `${userId}_${key}` : `${STORAGE_PREFIX}${key}`;
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(prefixedKey, serializedValue);
      return { success: true };
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      return { 
        success: false, 
        error: { 
          code: ErrorCode.STORAGE_ERROR, 
          message: 'Falha ao salvar dados.' 
        } 
      };
    }
  },

  /**
   * Carrega um valor do localStorage com um prefixo de usuário
   * @param key Chave do valor a ser carregado
   * @param defaultValue Valor padrão se a chave não existir
   * @param userId ID do usuário atual
   * @returns O valor armazenado ou o valor padrão
   */
  loadData: <T>(key: string, defaultValue: T, userId?: string): T => {
    try {
      const prefixedKey = userId ? `${userId}_${key}` : `${STORAGE_PREFIX}${key}`;
      const serializedValue = localStorage.getItem(prefixedKey);
      
      if (serializedValue === null) {
        return defaultValue;
      }
      
      return JSON.parse(serializedValue) as T;
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      return defaultValue;
    }
  },

  /**
   * Remove um valor do localStorage
   * @param key Chave do valor a ser removido
   * @param userId ID do usuário atual
   */
  removeData: (key: string, userId?: string) => {
    try {
      const prefixedKey = userId ? `${userId}_${key}` : `${STORAGE_PREFIX}${key}`;
      localStorage.removeItem(prefixedKey);
      return { success: true };
    } catch (error) {
      console.error('Erro ao remover dados:', error);
      return { 
        success: false, 
        error: { 
          code: ErrorCode.STORAGE_ERROR, 
          message: 'Falha ao remover dados.' 
        } 
      };
    }
  },

  /**
   * Retorna todas as chaves do localStorage para um usuário específico
   * @param userId ID do usuário
   * @returns Array de chaves
   */
  listUserStorageKeys: (userId: string): string[] => {
    try {
      const keys: string[] = [];
      const prefix = `${userId}_`;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keys.push(key.replace(prefix, ''));
        }
      }
      
      return keys;
    } catch (error) {
      console.error('Erro ao listar chaves:', error);
      return [];
    }
  },
  
  /**
   * Obtém todos os dados armazenados para um usuário específico
   * @param userId ID do usuário
   * @returns Um objeto com todos os dados do usuário
   */
  getAllUserData: (userId: string): Record<string, any> => {
    try {
      const data: Record<string, any> = {};
      const keys = storageService.listUserStorageKeys(userId);
      
      for (const key of keys) {
        const value = storageService.loadData(key, null, userId);
        data[key] = value;
      }
      
      return data;
    } catch (error) {
      console.error('Erro ao obter todos os dados do usuário:', error);
      return {};
    }
  }
}; 