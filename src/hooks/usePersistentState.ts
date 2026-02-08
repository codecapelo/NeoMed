import { useEffect, useRef, useState, Dispatch, SetStateAction } from 'react';
import { saveData, loadData, hasData } from '../services/storageService';
import { useAuth } from '../context/AuthContext';

function usePersistentState<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid || 'anonymous';
  const skipNextSaveRef = useRef(false);

  const readStoredValue = (activeUserId: string): T => {
    try {
      if (hasData(activeUserId, key)) {
        const savedValue = loadData(activeUserId, key);
        return savedValue !== null ? (savedValue as T) : initialValue;
      }

      return initialValue;
    } catch {
      return initialValue;
    }
  };

  const [value, setValue] = useState<T>(() => readStoredValue(userId));

  useEffect(() => {
    skipNextSaveRef.current = true;
    setValue(readStoredValue(userId));
  }, [key, userId]);

  useEffect(() => {
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    try {
      saveData(userId, key, value);
    } catch {
      // Keep local state available even if persistence fails.
    }
  }, [key, value, userId]);

  return [value, setValue];
}

export default usePersistentState;
