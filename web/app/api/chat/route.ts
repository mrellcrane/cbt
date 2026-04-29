import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';

export async function POST(request: Request): Promise<Response> {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body: {
    messages: { role: string; content: string }[];
    systemPromptText: string;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages, systemPromptText } = body;
  if (!Array.isArray(messages) || !systemPromptText) {
    return new Response(
      JSON.stringify({ error: 'messages and systemPromptText are required.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const client = new Anthropic({ apiKey });

  const apiMessages = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  const safeMessages =
    apiMessages.length > 0 && apiMessages[0].role === 'user'
      ? apiMessages
      : [{ role: 'user' as const, content: 'Hi' }, ...apiMessages];

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
              controller.enqueue(new TextEncoder().encode(event.delta.text));
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
