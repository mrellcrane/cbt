import { useCallback, useRef, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export type DictationState = 'idle' | 'listening';

// On-device speech-to-text wrapped around expo-speech-recognition.
// `continuous: false` makes recognition stop automatically on a natural pause,
// which gives us hands-free turn-taking: the user talks, stops, and the final
// transcript is delivered via onFinalResult.
export function useDictation(opts: { onFinalResult: (text: string) => void }) {
  const [state, setState] = useState<DictationState>('idle');
  const [partial, setPartial] = useState('');
  const latestRef = useRef('');
  const activeRef = useRef(false);
  const onFinalRef = useRef(opts.onFinalResult);
  onFinalRef.current = opts.onFinalResult;

  useSpeechRecognitionEvent('start', () => setState('listening'));

  useSpeechRecognitionEvent('result', (e) => {
    const transcript = e.results?.[0]?.transcript ?? '';
    latestRef.current = transcript;
    setPartial(transcript);
  });

  useSpeechRecognitionEvent('end', () => {
    setState('idle');
    setPartial('');
    const text = latestRef.current.trim();
    latestRef.current = '';
    const wasActive = activeRef.current;
    activeRef.current = false;
    if (wasActive && text) onFinalRef.current(text);
  });

  useSpeechRecognitionEvent('error', () => {
    setState('idle');
    setPartial('');
    activeRef.current = false;
  });

  const start = useCallback(async (): Promise<boolean> => {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) return false;
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) return false;

    latestRef.current = '';
    setPartial('');
    activeRef.current = true;
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: false,
      requiresOnDeviceRecognition: true,
    });
    return true;
  }, []);

  // Stop and keep the transcript (fires the 'end' handler → onFinalResult).
  const stop = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  // Cancel without delivering a result.
  const abort = useCallback(() => {
    activeRef.current = false;
    ExpoSpeechRecognitionModule.abort();
    setState('idle');
    setPartial('');
    latestRef.current = '';
  }, []);

  return { state, partial, start, stop, abort };
}
