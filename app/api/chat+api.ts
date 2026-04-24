import Anthropic from '@anthropic-ai/sdk';

// This file runs server-side — the ANTHROPIC_API_KEY is never sent to the client.
// In local dev, set it in a .env file (no EXPO_PUBLIC_ prefix).
// In EAS builds, set it in eas.json under env or as an EAS secret.

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';

async function logServerError(params: {
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
}) {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/rest/v1/app_errors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        error_message: params.message,
        error_stack: params.stack ?? null,
        context: params.context ?? null,
        platform: 'server',
        source: 'api/chat',
      }),
    });
  } catch {
    // swallow — don't let logging fail the request
  }
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    await logServerError({
      message: 'ANTHROPIC_API_KEY is not configured',
      context: { stage: 'env_check' },
    });
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body: { messages: { role: string; content: string }[]; systemPromptText: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { messages, systemPromptText } = body;
  if (!Array.isArray(messages) || !systemPromptText) {
    return new Response(
      JSON.stringify({ error: 'messages and systemPromptText are required.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const client = new Anthropic({ apiKey });

  // Only pass valid roles to the API
  const apiMessages = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  // Anthropic requires the message array to start with a user turn.
  // Guard against empty or assistant-first arrays.
  const safeMessages =
    apiMessages.length > 0 && apiMessages[0].role === 'user'
      ? apiMessages
      : [{ role: 'user' as const, content: "Hi" }, ...apiMessages];

  try {
    const stream = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPromptText,
      messages: safeMessages,
      stream: true,
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(
                new TextEncoder().encode(event.delta.text),
              );
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error('[chat+api] Anthropic error:', error);
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;
    await logServerError({
      message,
      stack,
      context: {
        stage: 'anthropic_request',
        model: MODEL,
        messageCount: safeMessages.length,
      },
    });
    return new Response(
      JSON.stringify({ error: message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
