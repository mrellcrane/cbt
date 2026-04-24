import { useState, useEffect, useCallback } from 'react';
import { getMoodEntries, type MoodEntry } from '@/lib/db/queries';

export function useMoodHistory(limitDays = 30) {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getMoodEntries(limitDays);
      setEntries(data);
    } finally {
      setIsLoading(false);
    }
  }, [limitDays]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { entries, isLoading, reload };
}
