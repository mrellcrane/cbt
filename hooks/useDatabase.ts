import { useState, useEffect } from 'react';
import { getDb } from '@/lib/db/schema';
import { seedDemoDataIfNeeded } from '@/lib/db/queries';

export function useDatabase() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    getDb()
      .then(() => seedDemoDataIfNeeded())
      .then(() => setIsReady(true))
      .catch((e) => setError(e instanceof Error ? e : new Error(String(e))));
  }, []);

  return { isReady, error };
}
