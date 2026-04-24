// Supabase Edge Function — proxies chat requests to Anthropic.
// Keeps ANTHROPIC_API_KEY off the client by running on Supabase.
// Deploy: supabase functions deploy chat --no-verify-jwt
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// The client posts { messages, systemPromptText }; this function streams the
// reply as plain text. Errors are logged into the app_errors table using the
// service role key (also set via supabase secrets).

// deno-lint-ignore-file no-explicit-any

const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-6';
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
};

async function logServerError(input: {
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
}) {
  if (!SUPABASE_URL || !SERVICE_ROLE) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/app_errors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        error_message: input.message,
        error_stack: input.stack ?? null,
        context: input.context ?? null,
        platform: 'edge',
        source: 'supabase/functions/chat',
      }),
    });
  } catch {
    // swallow — never let logging break the request
  }
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!ANTHROPIC_API_KEY) {
    await logServerError({ message: 'ANTHROPIC_API_KEY not configured on edge function' });
    return json({ error: 'Server misconfigured: missing ANTHROPIC_API_KEY' }, 500);
  }

  let body: { messages?: { role: string; content: string }[]; systemPromptText?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { messages, systemPromptText } = body;
  if (!Array.isArray(messages) || !systemPromptText) {
    return json({ error: 'messages and systemPromptText are required' }, 400);
  }

  const apiMessages = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  const safeMessages =
    apiMessages.length > 0 && apiMessages[0].role === 'user'
      ? apiMessages
      : [{ role: 'user' as const, content: 'Hi' }, ...apiMessages];

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: systemPromptText,
        messages: safeMessages,
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      await logServerError({
        message: `Anthropic upstream error ${upstream.status}`,
        context: { body: text.slice(0, 1000), model: MODEL },
      });
      return json({ error: `Anthropic error ${upstream.status}: ${text}` }, 502);
    }

    // Parse SSE stream from Anthropic and emit just the text deltas.
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = '';

    const out = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split('\n\n');
            buffer = events.pop() ?? '';
            for (const evt of events) {
              const dataLine = evt.split('\n').find((l) => l.startsWith('data:'));
              if (!dataLine) continue;
              const payload = dataLine.slice(5).trim();
              if (!payload || payload === '[DONE]') continue;
              try {
                const parsed = JSON.parse(payload);
                if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                  controller.enqueue(encoder.encode(parsed.delta.text));
                }
              } catch {
                // ignore malformed event
              }
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(out, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        ...CORS_HEADERS,
      },
    });
  } catch (error: any) {
    const message = error?.message ?? 'Unknown error';
    await logServerError({
      message,
      stack: error?.stack,
      context: { stage: 'anthropic_request', model: MODEL },
    });
    return json({ error: message }, 502);
  }
});
