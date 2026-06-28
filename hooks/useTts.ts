import { useCallback, useRef, useState } from 'react';
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Speech from 'expo-speech';
import { apiUrl } from '@/lib/api';

// Ember's voice. Primary path: ElevenLabs (synthesized server-side, played
// from a cached file). Fallback: the device's built-in TTS, so Driving Mode is
// never left silent if the TTS service is unavailable or no key is configured.
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

  const speakWithDevice = useCallback((text: string, rate: number) => {
    return new Promise<void>((resolve) => {
      Speech.speak(text, {
        rate,
        onDone: () => resolve(),
        onStopped: () => resolve(),
        onError: () => resolve(),
      });
    });
  }, []);

  // Returns once speech has finished (or was cancelled / failed).
  // `rate` is the playback speed multiplier (1 = normal, 1.5, 2, …).
  const speak = useCallback(
    async (rawText: string, rate: number = 1) => {
      const text = rawText.trim();
      if (!text) return;

      cancelledRef.current = false;
      setIsSpeaking(true);

      // Configure the audio session up front so BOTH the ElevenLabs player and
      // the device-TTS fallback are audible even when the ringer switch is off.
      try {
        await setAudioModeAsync({ playsInSilentMode: true });
      } catch {
        // non-fatal — playback may still work with the default session
      }

      try {
        const res = await fetch(apiUrl('/api/speak'), {
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

        const player = createAudioPlayer({ uri });
        playerRef.current = player;
        // Apply playback speed with pitch correction so the voice stays natural.
        try {
          player.shouldCorrectPitch = true;
          player.setPlaybackRate(rate, 'high');
        } catch {
          // older runtime without rate support — play at normal speed
        }

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
        // ElevenLabs failed — fall back to on-device TTS unless we were cancelled.
        if (!cancelledRef.current) {
          await speakWithDevice(text, rate);
        }
      } finally {
        if (!cancelledRef.current) setIsSpeaking(false);
      }
    },
    [cleanupPlayer, speakWithDevice],
  );

  return { speak, stop, isSpeaking };
}
