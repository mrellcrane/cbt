// This file runs server-side — the ELEVENLABS_API_KEY is never sent to the
// client. It proxies text to ElevenLabs' text-to-speech API and returns the
// audio as base64 so the React Native client can write it to a cache file and
// play it.
//
// In local dev, set ELEVENLABS_API_KEY in a .env file (no EXPO_PUBLIC_ prefix).
// In EAS builds, set it in eas.json under env or as an EAS secret.

// Default voice: "Rachel" — a calm, warm narration voice that suits Ember.
// Browse / preview voices at https://elevenlabs.io/app/voice-library
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM';
// Flash v2.5 keeps latency low enough for hands-free driving use.
const TTS_MODEL = process.env.ELEVENLABS_MODEL ?? 'eleven_flash_v2_5';

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return json({ error: 'ELEVENLABS_API_KEY is not configured.' }, 500);
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const text = (body.text ?? '').toString().trim();
  if (!text) {
    return json({ error: 'text is required.' }, 400);
  }

  try {
    const elRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
        VOICE_ID,
      )}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: TTS_MODEL,
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      },
    );

    if (!elRes.ok) {
      const errText = await elRes.text();
      console.error('[speak+api] ElevenLabs error:', elRes.status, errText);
      return json({ error: `ElevenLabs error: ${errText}` }, 502);
    }

    const buf = await elRes.arrayBuffer();
    const base64 = Buffer.from(buf).toString('base64');
    return json({ audio: base64, mime: 'audio/mpeg' }, 200);
  } catch (error) {
    console.error('[speak+api] error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: message }, 502);
  }
}
