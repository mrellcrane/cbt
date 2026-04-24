import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

type LogErrorInput = {
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  source: string;
};

export async function logError(input: LogErrorInput): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[errorLog] Supabase not configured; skipping remote log');
    return;
  }

  const payload = {
    error_message: input.message,
    error_stack: input.stack ?? null,
    context: input.context ?? null,
    platform: Platform.OS,
    source: input.source,
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/app_errors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn('[errorLog] Supabase insert failed:', res.status, text);
    }
  } catch (err) {
    console.warn('[errorLog] Network error while logging:', err);
  }
}
