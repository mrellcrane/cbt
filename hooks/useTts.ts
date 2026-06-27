import { useCallback, useRef, useState } from 'react';
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Speech from 'expo-speech';

// Ember's voice. Primary path: Deepgram Aura (synthesized server-side, played
// from a cached file). Fallback: the device's built-in TTS, so Driving Mode is
// never left silent if Deepgram is unavailable or no key is configured.
let fileCounter = 0;

export function useTts() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);
  const cancelledRef = useRef(false);

  const cleanupPlayer = useCallback(() => {
    try {
      playerRef.current?.remove();
    } catch {
      // already removed
    }
    playerRef.current = null;
  }, []);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    cleanupPlayer();
    Speech.stop();
    setIsSpeaking(false);
  }, [cleanupPlayer]);

  const speakWithDevice = useCallback((text: string) => {
    return new Promise<void>((resolve) => {
      Speech.speak(text, {
        onDone: () => resolve(),
        onStopped: () => resolve(),
        onError: () => resolve(),
      });
    });
  }, []);

  // Returns once speech has finished (or was cancelled / failed).
  const speak = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text) return;

      cancelledRef.current = false;
      setIsSpeaking(true);

      try {
        const res = await fetch('/api/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error(`speak http ${res.status}`);

        const { audio } = (await res.json()) as { audio?: string };
        if (!audio) throw new Error('empty audio');
        if (cancelledRef.current) return;

        const uri = `${FileSystem.cacheDirectory}ember-tts-${fileCounter++}.mp3`;
        await FileSystem.writeAsStringAsync(uri, audio, {
          encoding: 'base64',
        });
        if (cancelledRef.current) return;

        // playsInSilentMode so Ember is audible even with the ringer off — the
        // common case in a car.
        await setAudioModeAsync({ playsInSilentMode: true });

        const player = createAudioPlayer({ uri });
        playerRef.current = player;

        await new Promise<void>((resolve) => {
          const sub = player.addListener('playbackStatusUpdate', (status) => {
            if (status.didJustFinish || cancelledRef.current) {
              sub.remove();
              resolve();
            }
          });
          player.play();
        });

        cleanupPlayer();
      } catch (err) {
        // Deepgram failed — fall back to on-device TTS unless we were cancelled.
        if (!cancelledRef.current) {
          await speakWithDevice(text);
        }
      } finally {
        if (!cancelledRef.current) setIsSpeaking(false);
      }
    },
    [cleanupPlayer, speakWithDevice],
  );

  return { speak, stop, isSpeaking };
}
