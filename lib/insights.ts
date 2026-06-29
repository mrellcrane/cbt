import { fetch } from 'expo/fetch';
import { apiUrl } from './api';
import {
  getUnanalyzedUserMessages,
  saveMessageInsight,
  getMessageInsights,
} from './db/queries';

// Passive pattern detection. After conversations happen (free chat or driving
// mode), the user's own messages get classified server-side and stored, so the
// Patterns tab reflects the whole of someone's thinking — not just the formal
// thought records they completed.

let analyzing = false;

interface ApiInsight {
  id: string;
  distortions?: string[];
  emotions?: string[];
  topics?: string[];
}

function clean(arr?: string[]): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((s) => String(s).trim())
    .filter((s) => s.length > 0)
    .slice(0, 5);
}

// Find user messages that haven't been analyzed, classify a batch, and store
// the results. Safe to call on every Patterns-tab focus: it no-ops when there's
// nothing pending or a pass is already in flight, and silently leaves messages
// unanalyzed (for a later retry) if the network call fails. Returns how many
// messages were analyzed this pass.
export async function analyzePendingMessages(maxBatch = 40): Promise<number> {
  if (analyzing) return 0;
  analyzing = true;
  try {
    const pending = await getUnanalyzedUserMessages(maxBatch);
    if (pending.length === 0) return 0;

    const res = await fetch(apiUrl('/api/analyze'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: pending.map((p) => ({ id: String(p.id), content: p.content })),
      }),
    });
    if (!res.ok) throw new Error(`analyze http ${res.status}`);

    const data = (await res.json()) as { insights?: ApiInsight[] };
    const byId = new Map((data.insights ?? []).map((i) => [i.id, i]));

    // Store a row for every pending message — even ones the model returned
    // nothing for — so trivial turns are marked analyzed and never re-sent.
    let count = 0;
    for (const p of pending) {
      const ins = byId.get(String(p.id));
      await saveMessageInsight({
        messageId: p.id,
        sessionId: p.session_id,
        distortions: clean(ins?.distortions),
        emotions: clean(ins?.emotions),
        topics: clean(ins?.topics),
      });
      count++;
    }
    return count;
  } catch {
    return 0;
  } finally {
    analyzing = false;
  }
}

export interface TallyItem {
  name: string;
  count: number;
}

function normalize(s: string): string {
  const t = s.trim().toLowerCase();
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function tally(items: string[]): TallyItem[] {
  const counts: Record<string, number> = {};
  for (const raw of items) {
    const key = normalize(raw);
    if (!key) continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export interface ConversationPatterns {
  // Raw distortion-name strings, to be merged with thought-record distortions
  // and counted through the shared computeDistortionStats helper.
  distortionStrings: string[];
  emotions: TallyItem[];
  topics: TallyItem[];
  // Number of user messages analyzed so far (for "based on N messages" copy).
  analyzedCount: number;
}

export async function getConversationPatterns(
  sinceDays?: number,
): Promise<ConversationPatterns> {
  const insights = await getMessageInsights(sinceDays);
  return {
    distortionStrings: insights.flatMap((i) => i.distortions),
    emotions: tally(insights.flatMap((i) => i.emotions)),
    topics: tally(insights.flatMap((i) => i.topics)),
    analyzedCount: insights.length,
  };
}
