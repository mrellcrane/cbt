import { getDb } from './schema';
import type { ChatMessage } from '../ai/types';

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value],
  );
}

// ─── Mood Entries ─────────────────────────────────────────────────────────────

export interface MoodEntry {
  id: number;
  score: number;
  note: string | null;
  created_at: string;
}

export async function insertMoodEntry(
  score: number,
  note?: string,
): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO mood_entries (score, note) VALUES (?, ?)',
    [score, note ?? null],
  );
  return result.lastInsertRowId;
}

export async function getMoodEntries(limitDays = 30): Promise<MoodEntry[]> {
  const db = await getDb();
  return db.getAllAsync<MoodEntry>(
    `SELECT * FROM mood_entries
     WHERE created_at >= datetime('now', ?)
     ORDER BY created_at ASC`,
    [`-${limitDays} days`],
  );
}

export async function hasDoneCheckInToday(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM mood_entries
     WHERE created_at >= datetime('now', 'start of day')`,
  );
  return (row?.count ?? 0) > 0;
}

// ─── Thought Records ──────────────────────────────────────────────────────────

export interface ThoughtRecord {
  id: number;
  situation: string | null;
  automatic_thought: string | null;
  emotions: string | null;
  distortion: string | null;
  balanced_thought: string | null;
  status: 'in_progress' | 'complete';
  created_at: string;
  updated_at: string;
}

export async function insertThoughtRecord(): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO thought_records (status) VALUES ('in_progress')`,
  );
  return result.lastInsertRowId;
}

export async function completeThoughtRecord(
  id: number,
  data: {
    situation: string;
    automatic_thought: string;
    emotions: string;
    distortion: string;
    balanced_thought: string;
  },
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE thought_records
     SET situation = ?, automatic_thought = ?, emotions = ?,
         distortion = ?, balanced_thought = ?,
         status = 'complete', updated_at = datetime('now')
     WHERE id = ?`,
    [
      data.situation,
      data.automatic_thought,
      data.emotions,
      data.distortion,
      data.balanced_thought,
      id,
    ],
  );
}

export async function getThoughtRecords(limit = 20): Promise<ThoughtRecord[]> {
  const db = await getDb();
  return db.getAllAsync<ThoughtRecord>(
    `SELECT * FROM thought_records
     WHERE status = 'complete'
     ORDER BY created_at DESC
     LIMIT ?`,
    [limit],
  );
}

// All recorded cognitive-distortion classifications across completed thought
// records, used to compute how often each distortion shows up.
export async function getAllDistortions(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ distortion: string | null }>(
    `SELECT distortion FROM thought_records
     WHERE status = 'complete'
       AND distortion IS NOT NULL
       AND TRIM(distortion) != ''`,
  );
  return rows.map((r) => r.distortion ?? '').filter((s) => s.trim().length > 0);
}

// ─── Gratitude Entries ────────────────────────────────────────────────────────

export interface GratitudeEntry {
  id: number;
  items: string; // JSON array
  created_at: string;
}

export async function insertGratitudeEntry(items: string[]): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO gratitude_entries (items) VALUES (?)',
    [JSON.stringify(items)],
  );
}

export async function getGratitudeEntries(limit = 20): Promise<GratitudeEntry[]> {
  const db = await getDb();
  return db.getAllAsync<GratitudeEntry>(
    'SELECT * FROM gratitude_entries ORDER BY created_at DESC LIMIT ?',
    [limit],
  );
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function saveMessage(msg: {
  role: 'user' | 'assistant';
  content: string;
  sessionId: string;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO messages (role, content, session_id) VALUES (?, ?, ?)',
    [msg.role, msg.content, msg.sessionId],
  );
}

export async function getMessages(
  sessionId: string,
  limit = 40,
): Promise<ChatMessage[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: number;
    role: string;
    content: string;
    session_id: string;
    created_at: string;
  }>(
    `SELECT * FROM messages
     WHERE session_id = ?
     ORDER BY created_at ASC
     LIMIT ?`,
    [sessionId, limit],
  );
  return rows.map((r) => ({
    id: String(r.id),
    role: r.role as 'user' | 'assistant',
    content: r.content,
    sessionId: r.session_id,
    createdAt: r.created_at,
  }));
}

export async function getRecentSessionId(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ session_id: string }>(
    `SELECT session_id FROM messages
     ORDER BY created_at DESC
     LIMIT 1`,
  );
  return row?.session_id ?? null;
}

// ─── Seed data (first launch) ─────────────────────────────────────────────────

export async function seedDemoDataIfNeeded(): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM mood_entries',
  );
  if ((row?.count ?? 0) > 0) return; // already seeded

  const scores = [5, 6, 4, 7, 6, 8, 5, 7, 6, 8, 7, 9, 6, 7];
  const notes = [
    'Feeling a bit flat today.',
    null,
    'Anxious about the week ahead.',
    'Had a good chat with a friend.',
    null,
    'Morning run helped.',
    'Tired but okay.',
    null,
    null,
    'Really good day.',
    null,
    'Feeling proud of myself.',
    null,
    null,
  ];

  for (let i = 0; i < scores.length; i++) {
    const daysAgo = scores.length - 1 - i;
    await db.runAsync(
      `INSERT INTO mood_entries (score, note, created_at)
       VALUES (?, ?, datetime('now', ?))`,
      [scores[i], notes[i], `-${daysAgo} days`],
    );
  }
}
