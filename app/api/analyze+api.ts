import Anthropic from '@anthropic-ai/sdk';
import { DISTORTION_TYPES } from '../../lib/distortions';

// Server-side classifier for passive pattern detection. Takes a batch of the
// user's own chat messages and tags each with cognitive distortions, emotions,
// and life-area topics. Runs on a small/fast model — this is classification, not
// conversation. The ANTHROPIC_API_KEY never reaches the client.

const MODEL =
  process.env.ANTHROPIC_ANALYZE_MODEL ?? 'claude-haiku-4-5-20251001';

const DISTORTION_NAMES = DISTORTION_TYPES.map((d) => d.name);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface InMessage {
  id: string;
  content: string;
}

interface OutInsight {
  id: string;
  distortions: string[];
  emotions: string[];
  topics: string[];
}

function buildPrompt(messages: InMessage[]): string {
  return `You are a CBT analysis assistant. Analyze each of the user's own chat messages below and tag what is clearly present.

For EACH message, identify:
1. "distortions": cognitive distortions present — use ONLY these exact names, verbatim, or [] if none clearly apply:
${DISTORTION_NAMES.map((n) => `   - ${n}`).join('\n')}
2. "emotions": 0-3 simple lowercase emotion words the message expresses (e.g. "anxiety", "sadness", "frustration", "hope", "relief", "anger", "loneliness"). [] if none.
3. "topics": 0-3 short lowercase life areas / themes (e.g. "work", "relationships", "health", "money", "family", "self-worth", "future", "sleep"). [] if none.

Rules:
- Many messages are small talk, logistics, or one-word replies. Return empty arrays for those. Only tag what is genuinely present — do not over-interpret.
- Do NOT diagnose, and do NOT flag crisis content here; just classify thinking patterns.
- Include every id exactly once.

Respond with ONLY a JSON object, no prose and no code fences:
{"insights":[{"id":"<id>","distortions":[],"emotions":[],"topics":[]}]}

Messages:
${JSON.stringify(messages)}`;
}

function parseInsights(raw: string): OutInsight[] {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return [];
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    const arr = Array.isArray(parsed?.insights) ? parsed.insights : [];
    return arr
      .filter((x: any) => x && typeof x.id === 'string')
      .map((x: any) => ({
        id: x.id,
        distortions: Array.isArray(x.distortions) ? x.distortions : [],
        emotions: Array.isArray(x.emotions) ? x.emotions : [],
        topics: Array.isArray(x.topics) ? x.topics : [],
      }));
  } catch {
    return [];
  }
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({ error: 'ANTHROPIC_API_KEY is not configured.' }, 500);
  }

  let body: { messages?: InMessage[] };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const messages = (body.messages ?? [])
    .filter((m) => m && typeof m.id === 'string' && typeof m.content === 'string')
    .map((m) => ({ id: m.id, content: m.content.slice(0, 2000) }));

  if (messages.length === 0) {
    return json({ insights: [] });
  }

  const client = new Anthropic({ apiKey });

  try {
    const completion = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: buildPrompt(messages) }],
    });

    const text = completion.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    return json({ insights: parseInsights(text) });
  } catch (error) {
    console.error('[analyze+api] Anthropic error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: message }, 502);
  }
}
