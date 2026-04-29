'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import dayjs from 'dayjs';

interface MoodEntry {
  id: string;
  score: number;
  note: string | null;
  created_at: string;
}

interface ThoughtRecord {
  id: string;
  situation: string | null;
  automatic_thought: string | null;
  emotions: string | null;
  distortion: string | null;
  balanced_thought: string | null;
  created_at: string;
}

interface GratitudeEntry {
  id: string;
  items: string[] | string;
  created_at: string;
}

type Tab = 'mood' | 'thoughts' | 'gratitude';

function moodColor(score: number) {
  if (score <= 3) return '#E05252';
  if (score <= 6) return '#E8A561';
  return '#52B788';
}

export default function HistoryPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>('mood');
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [thoughts, setThoughts] = useState<ThoughtRecord[]>([]);
  const [gratitude, setGratitude] = useState<GratitudeEntry[]>([]);
  const [selectedThought, setSelectedThought] = useState<ThoughtRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);

      const [moodRes, thoughtRes, gratRes] = await Promise.all([
        supabase
          .from('mood_entries')
          .select('*')
          .gte('created_at', cutoff.toISOString())
          .order('created_at', { ascending: true }),
        supabase
          .from('thought_records')
          .select('*')
          .eq('status', 'complete')
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('gratitude_entries')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30),
      ]);

      setMoodEntries(moodRes.data ?? []);
      setThoughts(thoughtRes.data ?? []);
      setGratitude(gratRes.data ?? []);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const avgMood =
    moodEntries.length > 0
      ? (moodEntries.reduce((s, e) => s + e.score, 0) / moodEntries.length).toFixed(1)
      : '—';

  const goodDays = moodEntries.filter((e) => e.score >= 7).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-surface border-b border-border">
        <h1 className="text-2xl font-extrabold text-text-main">History</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-6 py-3 bg-surface border-b border-border">
        {(['mood', 'thoughts', 'gratitude'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              tab === t
                ? 'bg-primary text-white border-primary'
                : 'bg-background text-text-secondary border-border hover:border-primary'
            }`}
          >
            {t === 'mood' ? 'Mood' : t === 'thoughts' ? 'Thoughts' : 'Gratitude'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <p className="text-text-muted text-sm">Loading…</p>
        ) : (
          <>
            {/* ── Mood tab ───────────────────────────────────────────────────── */}
            {tab === 'mood' && (
              <div className="max-w-2xl space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Avg mood', value: avgMood, color: moodColor(Number(avgMood)) },
                    { label: 'Check-ins', value: moodEntries.length },
                    { label: 'Good days', value: goodDays, color: '#52B788' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-surface rounded-xl p-4 border border-border text-center">
                      <p className="text-2xl font-extrabold" style={{ color: color ?? '#2C2C3E' }}>
                        {value}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Entry list */}
                <p className="font-bold text-text-main">Recent entries</p>
                {moodEntries.length === 0 ? (
                  <p className="text-text-muted text-sm italic">
                    No mood entries yet. Start a daily check-in in Chat!
                  </p>
                ) : (
                  [...moodEntries].reverse().slice(0, 14).map((e) => (
                    <div key={e.id} className="flex items-center gap-3 bg-surface rounded-xl p-3 border border-border">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: moodColor(e.score) }}
                      >
                        <span className="text-white font-extrabold text-sm">{e.score}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-main">
                          {dayjs(e.created_at).format('ddd, MMM D')}
                        </p>
                        {e.note && (
                          <p className="text-xs text-text-muted truncate">{e.note}</p>
                        )}
                      </div>
                      <p className="text-xs text-text-muted shrink-0">
                        {dayjs(e.created_at).format('h:mm a')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Thoughts tab ───────────────────────────────────────────────── */}
            {tab === 'thoughts' && (
              <div className="max-w-2xl space-y-3">
                <p className="font-bold text-text-main">
                  {thoughts.length} completed thought record{thoughts.length !== 1 ? 's' : ''}
                </p>
                {thoughts.length === 0 ? (
                  <p className="text-text-muted text-sm italic">
                    Complete a thought record in Chat to see it here.
                  </p>
                ) : (
                  thoughts.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedThought(t)}
                      className="w-full text-left bg-surface rounded-xl p-4 border border-border hover:border-primary transition-colors space-y-1"
                    >
                      <p className="text-xs text-text-muted">{dayjs(t.created_at).format('MMM D, YYYY')}</p>
                      <p className="text-sm font-semibold text-text-main line-clamp-2">
                        {t.situation ?? 'No situation recorded'}
                      </p>
                      <p className="text-xs text-text-secondary">🪤 {t.distortion ?? 'Unknown distortion'}</p>
                      <p className="text-xs text-primary font-semibold">View full record →</p>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* ── Gratitude tab ──────────────────────────────────────────────── */}
            {tab === 'gratitude' && (
              <div className="max-w-2xl space-y-3">
                <p className="font-bold text-text-main">
                  {gratitude.length} gratitude entr{gratitude.length !== 1 ? 'ies' : 'y'}
                </p>
                {gratitude.length === 0 ? (
                  <p className="text-text-muted text-sm italic">
                    Start a gratitude session in Chat to see your entries here.
                  </p>
                ) : (
                  gratitude.map((g) => {
                    const items: string[] = Array.isArray(g.items)
                      ? g.items
                      : (() => { try { return JSON.parse(g.items as string); } catch { return [g.items as string]; } })();
                    return (
                      <div key={g.id} className="bg-surface rounded-xl p-4 border border-border space-y-1.5">
                        <p className="text-xs text-text-muted">
                          {dayjs(g.created_at).format('ddd, MMM D')}
                        </p>
                        {items.map((item, i) => (
                          <p key={i} className="text-sm text-text-main">🌱 {item}</p>
                        ))}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Thought record detail modal */}
      {selectedThought && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-extrabold text-text-main text-lg">Thought Record</h2>
              <button
                onClick={() => setSelectedThought(null)}
                className="text-primary font-bold text-sm"
              >
                Done
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-3">
              <p className="text-xs text-text-muted">
                {dayjs(selectedThought.created_at).format('MMMM D, YYYY')}
              </p>
              {[
                { label: 'Situation', value: selectedThought.situation },
                { label: 'Automatic thought', value: selectedThought.automatic_thought },
                { label: 'Emotions', value: selectedThought.emotions },
                { label: 'Thinking pattern', value: selectedThought.distortion },
                { label: 'Balanced thought', value: selectedThought.balanced_thought },
              ].map(({ label, value }) => (
                <div key={label} className="bg-background rounded-xl p-4 border border-border">
                  <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-sm text-text-main">{value ?? '—'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
