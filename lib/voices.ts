// Curated ElevenLabs voices that work on the free tier (verified). The id must
// also be present in the allow-list in app/api/speak+api.ts.
export interface VoiceOption {
  id: string;
  name: string;
  description: string;
}

export const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';

export const VOICES: VoiceOption[] = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Warm, gentle' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', description: 'Friendly, warm' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', description: 'Clear, British' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', description: 'Calm, warm' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', description: 'Deep, soothing' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', description: 'Friendly, casual' },
];
