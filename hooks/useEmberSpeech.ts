import { useCallback, useEffect, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import { getSetting, setSetting } from '@/lib/db/queries';

const SETTING_KEY = 'tts_enabled';

export function useEmberSpeech() {
  const [enabled, setEnabledState] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const speakingRef = useRef(false);

  useEffect(() => {
    (async () => {
      const stored = await getSetting(SETTING_KEY);
      setEnabledState(stored === '1');
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const setEnabled = useCallback(async (next: boolean) => {
    setEnabledState(next);
    await setSetting(SETTING_KEY, next ? '1' : '0');
    if (!next) Speech.stop();
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!enabled || !text.trim()) return;
      Speech.stop();
      speakingRef.current = true;
      Speech.speak(text, {
        rate: 1.0,
        pitch: 1.0,
        onDone: () => {
          speakingRef.current = false;
        },
        onStopped: () => {
          speakingRef.current = false;
        },
        onError: () => {
          speakingRef.current = false;
        },
      });
    },
    [enabled],
  );

  const stop = useCallback(() => {
    Speech.stop();
    speakingRef.current = false;
  }, []);

  return { enabled, setEnabled, speak, stop, hydrated };
}
