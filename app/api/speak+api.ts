// This file runs server-side — the DEEPGRAM_API_KEY is never sent to the client.
// It proxies text to Deepgram's Aura text-to-speech API and returns the audio as
// base64 so the React Native client can write it to a cache file and play it.
//
// In local dev, set DEEPGRAM_API_KEY in a .env file (no EXPO_PUBLIC_ prefix).
// In EAS builds, set it in eas.json under env or as an EAS secret.

const TTS_MODEL = process.env.DEEPGRAM_TTS_MODEL ?? 'aura-2-thalia-en';

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return json({ error: 'DEEPGRAM_API_KEY is not configured.' }, 500);
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
    const dgRes = await fetch(
      `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(
        TTS_MODEL,
      )}&encoding=mp3`,
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      },
    );

    if (!dgRes.ok) {
      const errText = await dgRes.text();
      console.error('[speak+api] Deepgram error:', dgRes.status, errText);
      return json({ error: `Deepgram error: ${errText}` }, 502);
    }

    const buf = await dgRes.arrayBuffer();
    const base64 = Buffer.from(buf).toString('base64');
    return json({ audio: base64, mime: 'audio/mpeg' }, 200);
  } catch (error) {
    console.error('[speak+api] error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: message }, 502);
  }
}
