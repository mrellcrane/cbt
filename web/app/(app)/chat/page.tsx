'use client';

export const dynamic = 'force-dynamic';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ChatBubble } from '@/components/ChatBubble';
import { ChatInput } from '@/components/ChatInput';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  session_id: string;
  created_at: string;
}

function makeSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function extractAndStrip(raw: string): {
  display: string;
  thoughtRecord: Record<string, string> | null;
  gratitudeItems: string[] | null;
} {
  let display = raw;
  let thoughtRecord: Record<string, string> | null = null;
  let gratitudeItems: string[] | null = null;

  const trMatch = raw.match(
    /\[\[THOUGHT_RECORD_COMPLETE\]\]\s*([\s\S]*?)\s*\[\[END\]\]/,
  );
  if (trMatch) {
    display = display.replace(trMatch[0], '').trim();
    try { thoughtRecord = JSON.parse(trMatch[1]); } catch {}
  }

  const grMatch = raw.match(
    /\[\[GRATITUDE_COMPLETE\]\]\s*([\s\S]*?)\s*\[\[END\]\]/,
  );
  if (grMatch) {
    display = display.replace(grMatch[0], '').trim();
    try {
      const parsed = JSON.parse(grMatch[1]);
      gratitudeItems = Array.isArray(parsed?.items) ? parsed.items : null;
    } catch {}
  }

  return { display, thoughtRecord, gratitudeItems };
}

const QUICK_ACTIONS = [
  { id: 'check_in', label: 'Daily check-in', icon: '☀️', sub: 'Log your mood' },
  { id: 'thought_record', label: 'Thought record', icon: '🧩', sub: 'Work through a thought' },
  { id: 'gratitude', label: 'Gratitude', icon: '🌱', sub: "What's good today?" },
];

type Mode = 'free_chat' | 'check_in' | 'thought_record' | 'gratitude';

export default function ChatPage() {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [userName, setUserName] = useState('');
  const [mode, setMode] = useState<Mode>('free_chat');
  const [exerciseContext, setExerciseContext] = useState('');
  const [activeThoughtRecordId, setActiveThoughtRecordId] = useState<string | null>(null);
  const [moodInput, setMoodInput] = useState(false);
  const [moodScore, setMoodScore] = useState(5);
  const [moodNote, setMoodNote] = useState('');
  const abortRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load session and user settings on mount
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user name from settings
      const { data: settings } = await supabase
        .from('user_settings')
        .select('user_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (settings?.user_name) setUserName(settings.user_name);

      // Load most recent session
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('session_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const sid = lastMsg?.session_id ?? makeSessionId();
      setSessionId(sid);

      if (lastMsg?.session_id) {
        const { data: history } = await supabase
          .from('messages')
          .select('*')
          .eq('session_id', sid)
          .order('created_at', { ascending: true })
          .limit(40);
        setMessages((history as Message[]) ?? []);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingText]);

  const buildSystemPrompt = useCallback(
    (currentMode: Mode, context: string) => {
      const name = userName ? `, ${userName}` : '';
      const base = `You are Ember, a warm and professional CBT-based AI companion. You guide users through evidence-based Cognitive Behavioral Therapy exercises. You are empathetic, non-judgmental, and encouraging. Always prioritise safety — if a user expresses thoughts of self-harm or suicide, gently acknowledge their pain and provide crisis resources (988 Lifeline).`;

      const modeInstructions: Record<Mode, string> = {
        free_chat: `You are in a supportive free chat. Respond warmly to ${userName || 'the user'}${name}. You can gently suggest exercises when appropriate.`,
        check_in: `You are conducting a daily mood check-in with the user. Context: ${context}. Ask thoughtful reflection questions about their day and emotions.`,
        thought_record: `You are guiding ${userName || 'the user'} through a 6-step CBT thought record. Context: ${context}. Work through: situation, automatic thought, emotions, cognitive distortion, balanced thought, then close. When complete, output: [[THOUGHT_RECORD_COMPLETE]]{"situation":"...","automatic_thought":"...","emotions":"...","distortion":"...","balanced_thought":"..."}[[END]]`,
        gratitude: `You are facilitating a gratitude journaling session. Context: ${context}. Ask for 1-3 things the user is grateful for today, then reflect warmly. When complete, output: [[GRATITUDE_COMPLETE]]{"items":["item1","item2"]}[[END]]`,
      };

      return `${base}\n\n${modeInstructions[currentMode]}`;
    },
    [userName],
  );

  const sendMessage = useCallback(
    async (
      userText: string,
      overrideMode?: Mode,
      overrideContext?: string,
    ) => {
      if (isStreaming) return;
      const currentMode = overrideMode ?? mode;
      const currentContext = overrideContext ?? exerciseContext;
      const sid = sessionId || makeSessionId();
      if (!sessionId) setSessionId(sid);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const userMsg: Message = {
        id: `u_${Date.now()}`,
        role: 'user',
        content: userText,
        session_id: sid,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Persist to Supabase
      await supabase.from('messages').insert({
        user_id: user.id,
        role: 'user',
        content: userText,
        session_id: sid,
      });

      const systemPromptText = buildSystemPrompt(currentMode, currentContext);
      const contextWindow = [...messages, userMsg].slice(-14).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setIsStreaming(true);
      setStreamingText('');
      abortRef.current = false;

      let fullText = '';
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: contextWindow, systemPromptText }),
        });

        if (!response.ok || !response.body) {
          throw new Error(await response.text());
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          if (abortRef.current) { reader.cancel(); break; }
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
          setStreamingText(fullText);
        }
      } catch {
        fullText = "Sorry, I couldn't connect right now. Check your API key and network, then try again.";
        setStreamingText(fullText);
      }

      const { display, thoughtRecord, gratitudeItems } = extractAndStrip(fullText);

      const assistantMsg: Message = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: display,
        session_id: sid,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      await supabase.from('messages').insert({
        user_id: user.id,
        role: 'assistant',
        content: display,
        session_id: sid,
      });

      // Persist structured data
      if (thoughtRecord && activeThoughtRecordId) {
        await supabase
          .from('thought_records')
          .update({
            ...thoughtRecord,
            status: 'complete',
            updated_at: new Date().toISOString(),
          })
          .eq('id', activeThoughtRecordId);
        setActiveThoughtRecordId(null);
        setMode('free_chat');
      }

      if (gratitudeItems?.length) {
        await supabase.from('gratitude_entries').insert({
          user_id: user.id,
          items: gratitudeItems,
        });
        setMode('free_chat');
      }

      setIsStreaming(false);
      setStreamingText('');
    },
    [isStreaming, mode, exerciseContext, sessionId, messages, buildSystemPrompt, activeThoughtRecordId, supabase],
  );

  const handleMoodSubmit = async () => {
    setMoodInput(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('mood_entries').insert({
        user_id: user.id,
        score: moodScore,
        note: moodNote.trim() || null,
      });
    }
    const ctx = `Mood logged: ${moodScore}/10.${moodNote.trim() ? ` Note: "${moodNote.trim()}"` : ''}`;
    setExerciseContext(ctx);
    await sendMessage(
      `I just logged my mood as ${moodScore}/10.${moodNote.trim() ? ` ${moodNote.trim()}` : ''}`,
      'check_in',
      ctx,
    );
    setMoodNote('');
  };

  const startThoughtRecord = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('thought_records')
      .insert({ user_id: user.id, status: 'in_progress' })
      .select('id')
      .single();
    if (data) setActiveThoughtRecordId(data.id);
    setMode('thought_record');
    setExerciseContext('just starting — begin at Step 1');
    await sendMessage(
      "I'd like to work through a thought that's been bothering me.",
      'thought_record',
      'just starting — begin at Step 1',
    );
  };

  const startGratitude = async () => {
    setMode('gratitude');
    setExerciseContext('just starting');
    await sendMessage("I'd like to do a gratitude check-in.", 'gratitude', 'just starting');
  };

  const startNewChat = () => {
    abortRef.current = true;
    setMessages([]);
    setStreamingText('');
    setIsStreaming(false);
    setMode('free_chat');
    setExerciseContext('');
    setMoodInput(false);
    setActiveThoughtRecordId(null);
    setSessionId(makeSessionId());
  };

  const handleQuickAction = (id: string) => {
    if (id === 'check_in') setMoodInput(true);
    else if (id === 'thought_record') startThoughtRecord();
    else if (id === 'gratitude') startGratitude();
  };

  const showQuickActions = messages.length === 0 && !moodInput && !isStreaming;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-surface border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white text-sm font-bold">E</span>
          </div>
          <div>
            <p className="font-bold text-text-main text-sm leading-tight">Ember</p>
            <p className="text-xs text-text-muted leading-tight">CBT Companion</p>
          </div>
          {mode !== 'free_chat' && (
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary-dark border border-primary/20 font-semibold">
              {mode.replace('_', ' ')}
            </span>
          )}
        </div>
        {messages.length > 0 && (
          <button
            onClick={startNewChat}
            className="text-sm text-primary font-semibold hover:text-primary-dark"
          >
            New chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-3xl mx-auto">
          {showQuickActions && (
            <div className="flex flex-col items-center py-12">
              <h2 className="text-2xl font-extrabold text-text-main mb-2">
                Hey{userName ? `, ${userName}` : ''} 👋
              </h2>
              <p className="text-text-secondary mb-8">
                What would you like to work on today?
              </p>
              <div className="grid grid-cols-3 gap-3 w-full max-w-lg">
                {QUICK_ACTIONS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => handleQuickAction(a.id)}
                    className="flex flex-col items-center gap-1.5 p-4 rounded-xl border border-border bg-surface hover:border-primary hover:shadow-sm transition-all text-center"
                  >
                    <span className="text-3xl">{a.icon}</span>
                    <span className="text-sm font-bold text-text-main">{a.label}</span>
                    <span className="text-xs text-text-secondary">{a.sub}</span>
                  </button>
                ))}
              </div>
              <p className="mt-6 text-sm text-text-muted italic">or just say hello below</p>
            </div>
          )}

          {/* Mood check-in widget */}
          {moodInput && (
            <div className="max-w-sm mx-auto my-8 p-5 rounded-2xl bg-surface border border-border shadow-sm">
              <h3 className="font-bold text-text-main mb-4">How are you feeling? (1–10)</h3>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm text-text-muted">1</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={moodScore}
                  onChange={(e) => setMoodScore(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="text-sm text-text-muted">10</span>
                <span className="w-8 text-center font-bold text-primary">{moodScore}</span>
              </div>
              <input
                type="text"
                value={moodNote}
                onChange={(e) => setMoodNote(e.target.value)}
                placeholder="Optional note…"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleMoodSubmit}
                  className="flex-1 rounded-xl bg-primary text-white py-2 text-sm font-bold hover:bg-primary-dark transition-colors"
                >
                  Log mood
                </button>
                <button
                  onClick={() => setMoodInput(false)}
                  className="px-4 rounded-xl border border-border text-text-secondary text-sm hover:bg-background transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <ChatBubble key={msg.id} role={msg.role} content={msg.content} />
          ))}

          {isStreaming && (
            <ChatBubble role="assistant" content={streamingText} isStreaming />
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      {!moodInput && (
        <ChatInput
          onSend={(text) => sendMessage(text)}
          disabled={isStreaming || moodInput}
        />
      )}
    </div>
  );
}
