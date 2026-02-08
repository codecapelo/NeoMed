import React from 'react';

type Importer<T extends React.ComponentType<any>> = () => Promise<{ default: T }>;

const CHUNK_RETRY_KEY = 'neomed_chunk_retry';

const isChunkLoadError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return /ChunkLoadError|Loading chunk .* failed|Failed to fetch dynamically imported module/i.test(
    error.message
  );
};

export default function lazyWithRetry<T extends React.ComponentType<any>>(importer: Importer<T>) {
  return React.lazy(async () => {
    const hasRetried = sessionStorage.getItem(CHUNK_RETRY_KEY) === 'true';

    try {
      const module = await importer();
      sessionStorage.setItem(CHUNK_RETRY_KEY, 'false');
      return module;
    } catch (error) {
      if (isChunkLoadError(error) && !hasRetried) {
        sessionStorage.setItem(CHUNK_RETRY_KEY, 'true');
        window.location.reload();
        return new Promise<never>(() => {
          // Wait indefinitely because page is reloading.
        });
      }

      throw error;
    }
  });
}
