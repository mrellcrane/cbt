import { supabase } from '@/lib/supabase';
import type { ChatMessage } from '../ai/types';

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('user_settings')
    .select(key)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!data) return null;
  const val = (data as Record<string, unknown>)[key];
  if (val === null || val === undefined) return null;
  return String(val);
}

export async function setSetting(key: string, value: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Convert string booleans to real booleans for boolean columns
  let typedValue: string | boolean = value;
  if (key === 'disclaimer_seen' || key === 'onboarding_complete') {
    typedValue = value === 'true';
  }

  await supabase.from('user_settings').upsert(
    {
      user_id: user.id,
      [key]: typedValue,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
}

// ─── Mood Entries ─────────────────────────────────────────────────────────────

export interface MoodEntry {
  id: string;
  score: number;
  note: string | null;
  created_at: string;
}

export async function insertMoodEntry(
  score: number,
  note?: string,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('mood_entries')
    .insert({ user_id: user!.id, score, note: note ?? null })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function getMoodEntries(limitDays = 30): Promise<MoodEntry[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - limitDays);

  const { data, error } = await supabase
    .from('mood_entries')
    .select('id, score, note, created_at')
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function hasDoneCheckInToday(): Promise<boolean> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('mood_entries')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startOfDay.toISOString());
  return (count ?? 0) > 0;
}

// ─── Thought Records ──────────────────────────────────────────────────────────

export interface ThoughtRecord {
  id: string;
  situation: string | null;
  automatic_thought: string | null;
  emotions: string | null;
  distortion: string | null;
  balanced_thought: string | null;
  status: 'in_progress' | 'complete';
  created_at: string;
  updated_at: string;
}

export async function insertThoughtRecord(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('thought_records')
    .insert({ user_id: user!.id, status: 'in_progress' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function completeThoughtRecord(
  id: string,
  record: {
    situation: string;
    automatic_thought: string;
    emotions: string;
    distortion: string;
    balanced_thought: string;
  },
): Promise<void> {
  const { error } = await supabase
    .from('thought_records')
    .update({ ...record, status: 'complete', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function getThoughtRecords(limit = 20): Promise<ThoughtRecord[]> {
  const { data, error } = await supabase
    .from('thought_records')
    .select('*')
    .eq('status', 'complete')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ─── Gratitude Entries ────────────────────────────────────────────────────────

export interface GratitudeEntry {
  id: string;
  items: string; // JSON string for backward-compat with existing render code
  created_at: string;
}

export async function insertGratitudeEntry(items: string[]): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('gratitude_entries')
    .insert({ user_id: user!.id, items });
  if (error) throw error;
}

export async function getGratitudeEntries(
  limit = 20,
): Promise<GratitudeEntry[]> {
  const { data, error } = await supabase
    .from('gratitude_entries')
    .select('id, items, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    // jsonb comes back as array; serialise for existing JSON.parse() calls
    items:
      typeof row.items === 'string' ? row.items : JSON.stringify(row.items),
  }));
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function saveMessage(msg: {
  role: 'user' | 'assistant';
  content: string;
  sessionId: string;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from('messages').insert({
    user_id: user!.id,
    role: msg.role,
    content: msg.content,
    session_id: msg.sessionId,
  });
  if (error) throw error;
}

export async function getMessages(
  sessionId: string,
  limit = 40,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, role, content, session_id, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    role: row.role as 'user' | 'assistant',
    content: row.content,
    sessionId: row.session_id,
    createdAt: row.created_at,
  }));
}

export async function getRecentSessionId(): Promise<string | null> {
  const { data } = await supabase
    .from('messages')
    .select('session_id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.session_id ?? null;
}

// Cloud accounts start fresh — no seed data needed.
export async function seedDemoDataIfNeeded(): Promise<void> {}
