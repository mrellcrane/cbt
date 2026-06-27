import { buildSystemPrompt } from './systemPrompt';
import type { ApiMessage, Mode } from './types';

// Shared streaming client for the /api/chat route. Both the main chat screen and
// the hands-free Driving Mode screen talk to Claude through this helper so the
// conversation engine lives in one place.
export async function streamChatReply(opts: {
  userName: string;
  mode: Mode;
  /** Conversation so far, including the latest user turn. */
  history: ApiMessage[];
  exerciseContext?: string;
  /** Called with the full accumulated text on each streamed chunk. */
  onDelta?: (fullText: string) => void;
  /** Return true to abort the stream early. */
  shouldAbort?: () => boolean;
}): Promise<string> {
  const systemPromptText = buildSystemPrompt(
    opts.userName,
    opts.mode,
    opts.exerciseContext,
  );

  // Keep the last 14 turns for context, matching the main chat screen.
  const contextWindow = opts.history.slice(-14).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: contextWindow, systemPromptText }),
  });

  if (!response.ok || !response.body) {
    const errText = await response.text();
    throw new Error(errText || 'API error');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    if (opts.shouldAbort?.()) {
      reader.cancel();
      break;
    }
    const { done, value } = await reader.read();
    if (done) break;
    fullText += decoder.decode(value, { stream: true });
    opts.onDelta?.(fullText);
  }

  return fullText;
}

// Strip the structured [[...]] marker blocks the model may embed so they are
// never displayed or spoken aloud.
export function stripMarkers(raw: string): string {
  return raw.replace(/\[\[[\s\S]*?\]\]/g, '').trim();
}
