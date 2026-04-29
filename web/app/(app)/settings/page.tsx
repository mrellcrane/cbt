'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? '');

      const { data } = await supabase
        .from('user_settings')
        .select('user_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data?.user_name) setUserName(data.user_name);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveName = async () => {
    const trimmed = draftName.trim();
    if (!trimmed) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('user_settings')
      .upsert(
        { user_id: user.id, user_name: trimmed, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
    setUserName(trimmed);
    setEditingName(false);
    setSaveMsg('Name saved!');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const clearAllData = async () => {
    if (!confirm('Delete all your mood history, thought records, gratitude entries, and conversations? This cannot be undone.')) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await Promise.all([
      supabase.from('mood_entries').delete().eq('user_id', user.id),
      supabase.from('thought_records').delete().eq('user_id', user.id),
      supabase.from('gratitude_entries').delete().eq('user_id', user.id),
      supabase.from('messages').delete().eq('user_id', user.id),
    ]);
    alert('All data cleared.');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-6 py-4 bg-surface border-b border-border">
        <h1 className="text-2xl font-extrabold text-text-main">Settings</h1>
      </div>

      <div className="max-w-lg mx-auto w-full px-6 py-6 space-y-6">
        {/* Profile */}
        <section className="space-y-2">
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest px-1">Profile</p>
          <div className="bg-surface rounded-xl border border-border divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-text-main">Your name</span>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveName()}
                    maxLength={30}
                    className="border border-primary rounded-lg px-2 py-1 text-sm text-text-main focus:outline-none w-28"
                  />
                  <button onClick={saveName} className="text-primary text-sm font-bold">Save</button>
                  <button onClick={() => setEditingName(false)} className="text-text-muted text-sm">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => { setDraftName(userName); setEditingName(true); }}
                  className="text-primary text-sm font-semibold"
                >
                  {userName || 'Set name'}
                </button>
              )}
            </div>
            {email && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium text-text-main">Email</span>
                <span className="text-sm text-text-muted">{email}</span>
              </div>
            )}
          </div>
          {saveMsg && <p className="text-xs text-success px-1">{saveMsg}</p>}
        </section>

        {/* About */}
        <section className="space-y-2">
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest px-1">About</p>
          <div className="bg-surface rounded-xl border border-border p-4 space-y-2">
            <p className="font-extrabold text-text-main">CBT Companion</p>
            <p className="text-sm text-text-secondary">
              A supportive tool for Cognitive Behavioral Therapy exercises.
            </p>
            <hr className="border-border" />
            <p className="text-xs text-text-muted leading-relaxed">
              This app is not a substitute for professional mental health care. If
              you're in crisis, call or text{' '}
              <strong className="text-primary">988</strong> (Suicide & Crisis
              Lifeline, 24/7).
            </p>
          </div>
        </section>

        {/* Data */}
        <section className="space-y-2">
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest px-1">Data</p>
          <button
            onClick={clearAllData}
            className="w-full rounded-xl bg-surface border border-danger/30 p-4 text-danger font-semibold text-sm hover:bg-red-50 transition-colors"
          >
            Clear all data
          </button>
        </section>

        {/* Account */}
        <section className="space-y-2">
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest px-1">Account</p>
          <button
            onClick={handleSignOut}
            className="w-full rounded-xl bg-surface border border-danger/30 p-4 text-danger font-semibold text-sm hover:bg-red-50 transition-colors"
          >
            Sign out
          </button>
        </section>
      </div>
    </div>
  );
}
