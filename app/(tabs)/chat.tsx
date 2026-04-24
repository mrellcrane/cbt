import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ChatBubble } from '@/components/ChatBubble';
import { ChatInput } from '@/components/ChatInput';
import { MoodSlider } from '@/components/MoodSlider';
import { CrisisCard } from '@/components/CrisisCard';
import { buildSystemPrompt } from '@/lib/ai/systemPrompt';
import { detectCrisis } from '@/lib/crisis';
import {
  saveMessage,
  getMessages,
  getRecentSessionId,
  insertMoodEntry,
  hasDoneCheckInToday,
  getSetting,
  insertThoughtRecord,
  completeThoughtRecord,
  insertGratitudeEntry,
} from '@/lib/db/queries';
import type { ChatMessage, Mode } from '@/lib/ai/types';
import { Colors } from '@/constants/colors';
import { LESSONS } from '@/lib/lessons';
import { router } from 'expo-router';
import { logError } from '@/lib/errorLog';

// Strip the [[THOUGHT_RECORD_COMPLETE]] and [[GRATITUDE_COMPLETE]] blocks from
// display text while returning the raw payload for DB persistence.
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
    try {
      thoughtRecord = JSON.parse(trMatch[1]);
    } catch {
      // malformed — ignore
    }
  }

  const grMatch = raw.match(
    /\[\[GRATITUDE_COMPLETE\]\]\s*([\s\S]*?)\s*\[\[END\]\]/,
  );
  if (grMatch) {
    display = display.replace(grMatch[0], '').trim();
    try {
      const parsed = JSON.parse(grMatch[1]);
      gratitudeItems = Array.isArray(parsed?.items) ? parsed.items : null;
    } catch {
      // malformed — ignore
    }
  }

  return { display, thoughtRecord, gratitudeItems };
}

function makeSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

type QuickAction = {
  id: Mode;
  label: string;
  icon: string;
  subtitle: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'check_in',
    label: 'Daily check-in',
    icon: '☀️',
    subtitle: 'Log your mood',
  },
  {
    id: 'thought_record',
    label: 'Thought record',
    icon: '🧩',
    subtitle: 'Work through a thought',
  },
  {
    id: 'gratitude',
    label: 'Gratitude',
    icon: '🌱',
    subtitle: "What's good today?",
  },
];

export default function ChatScreen() {
  const params = useLocalSearchParams<{ lessonId?: string }>();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [mode, setMode] = useState<Mode>('free_chat');
  const [exerciseContext, setExerciseContext] = useState('');
  const [sessionId, setSessionId] = useState<string>('');
  const [userName, setUserName] = useState('');
  const [showMoodSlider, setShowMoodSlider] = useState(false);
  const [showCrisisCard, setShowCrisisCard] = useState(false);
  const [activeThoughtRecordId, setActiveThoughtRecordId] = useState<
    number | null
  >(null);
  const [checkedInToday, setCheckedInToday] = useState(false);
  // Track which lesson we've already auto-started so we don't repeat it.
  const handledLessonRef = useRef<string | null>(null);

  const listRef = useRef<FlatList>(null);
  const abortRef = useRef<boolean>(false);

  // Load data when tab is focused
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const name = (await getSetting('user_name')) ?? '';
        setUserName(name);

        const doneToday = await hasDoneCheckInToday();
        setCheckedInToday(doneToday);

        const existingSession = await getRecentSessionId();
        const sid = existingSession ?? makeSessionId();
        setSessionId(sid);

        const history = await getMessages(sid, 40);
        setMessages(history);
      })();
    }, []),
  );

  const scrollToBottom = () => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  };

  useEffect(() => {
    if (messages.length > 0 || isStreaming) scrollToBottom();
  }, [messages.length, streamingText]);

  // Core send function — handles streaming, DB persistence, and structured data.
  const sendMessage = useCallback(
    async (userText: string, overrideMode?: Mode, overrideContext?: string) => {
      if (isStreaming) return;

      const currentMode = overrideMode ?? mode;
      const currentContext = overrideContext ?? exerciseContext;
      const sid = sessionId || makeSessionId();
      if (!sessionId) setSessionId(sid);

      // Crisis gate
      if (detectCrisis(userText)) {
        setShowCrisisCard(true);
        // Still add the user message so conversation feels natural
      }

      const userMsg: ChatMessage = {
        id: `u_${Date.now()}`,
        role: 'user',
        content: userText,
        sessionId: sid,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      await saveMessage({ role: 'user', content: userText, sessionId: sid });

      const systemPromptText = buildSystemPrompt(
        userName,
        currentMode,
        currentContext,
      );

      // Build messages array for the API (last 14 turns for context)
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

        if (!response.ok) {
          const errText = await response.text();
          console.error('[chat] API responded with error:', response.status, errText);
          throw new Error(`HTTP ${response.status}: ${errText || 'API error'}`);
        }

        // React Native fetch doesn't expose response.body as a ReadableStream,
        // so fall back to response.text() (full reply at once) when streaming
        // isn't available. Web keeps the incremental streaming UX.
        if (!response.body || typeof response.body.getReader !== 'function') {
          fullText = await response.text();
          setStreamingText(fullText);
        } else {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          while (true) {
            if (abortRef.current) {
              reader.cancel();
              break;
            }
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;
            setStreamingText(fullText);
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const errStack = err instanceof Error && err.stack ? err.stack : '';
        console.error('[chat] fetch failed:', errMsg, errStack);
        logError({
          message: errMsg,
          stack: errStack || undefined,
          source: 'chat.sendMessage',
          context: {
            mode: currentMode,
            sessionId: sid,
            messageCount: contextWindow.length,
          },
        });
        fullText = "Sorry, I couldn't connect right now. Check your API key and network, then try again.";
        setStreamingText(fullText);
      }

      // Process structured markers
      const { display, thoughtRecord, gratitudeItems } =
        extractAndStrip(fullText);

      const assistantMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: display,
        sessionId: sid,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      await saveMessage({
        role: 'assistant',
        content: display,
        sessionId: sid,
      });

      // Persist thought record if complete
      if (thoughtRecord && activeThoughtRecordId) {
        await completeThoughtRecord(activeThoughtRecordId, {
          situation: thoughtRecord.situation ?? '',
          automatic_thought: thoughtRecord.automatic_thought ?? '',
          emotions: thoughtRecord.emotions ?? '',
          distortion: thoughtRecord.distortion ?? '',
          balanced_thought: thoughtRecord.balanced_thought ?? '',
        });
        setActiveThoughtRecordId(null);
        setMode('free_chat');
      }

      // Persist gratitude entry if complete
      if (gratitudeItems && gratitudeItems.length > 0) {
        await insertGratitudeEntry(gratitudeItems);
        setMode('free_chat');
      }

      setIsStreaming(false);
      setStreamingText('');
    },
    [isStreaming, mode, exerciseContext, sessionId, userName, messages, activeThoughtRecordId],
  );

  // ── Quick action handlers ──────────────────────────────────────────────────

  const startCheckIn = () => {
    setMode('check_in');
    setShowMoodSlider(true);
  };

  const handleMoodSubmit = async (score: number, note: string) => {
    setShowMoodSlider(false);
    await insertMoodEntry(score, note || undefined);
    setCheckedInToday(true);
    const ctx = `Mood logged: ${score}/10.${note ? ` Note: "${note}"` : ''}`;
    setExerciseContext(ctx);
    await sendMessage(
      `I just logged my mood as ${score}/10.${note ? ` ${note}` : ''}`,
      'check_in',
      ctx,
    );
  };

  const startThoughtRecord = async () => {
    const trId = await insertThoughtRecord();
    setActiveThoughtRecordId(trId);
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
    await sendMessage(
      "I'd like to do a gratitude check-in.",
      'gratitude',
      'just starting',
    );
  };

  const startLesson = async (lessonId: string) => {
    const lesson = LESSONS.find((l) => l.id === lessonId);
    if (!lesson) return;
    setMode('lesson');
    setExerciseContext(lesson.promptContext);
    await sendMessage(
      `I'd like to learn about: ${lesson.title}`,
      'lesson',
      lesson.promptContext,
    );
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.id === 'check_in') startCheckIn();
    else if (action.id === 'thought_record') startThoughtRecord();
    else if (action.id === 'gratitude') startGratitude();
  };

  // Auto-start a lesson when navigated here from the Lessons tab.
  useEffect(() => {
    const lid = params.lessonId;
    if (lid && lid !== handledLessonRef.current && !isStreaming) {
      handledLessonRef.current = lid;
      startLesson(lid);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.lessonId]);

  const startNewChat = () => {
    abortRef.current = true;
    setMessages([]);
    setStreamingText('');
    setIsStreaming(false);
    setMode('free_chat');
    setExerciseContext('');
    setShowMoodSlider(false);
    setShowCrisisCard(false);
    setActiveThoughtRecordId(null);
    setSessionId(makeSessionId());
    handledLessonRef.current = null;
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const allDisplayMessages = messages;
  const showQuickActions = messages.length === 0 && !showMoodSlider && !isStreaming;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarSmallText}>E</Text>
          </View>
          <View>
            <Text style={styles.headerName}>Ember</Text>
            <Text style={styles.headerSub}>CBT Companion</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {mode !== 'free_chat' && (
            <View style={styles.modeBadge}>
              <Text style={styles.modeBadgeText}>{mode.replace('_', ' ')}</Text>
            </View>
          )}
          {messages.length > 0 && (
            <TouchableOpacity onPress={startNewChat} activeOpacity={0.75}>
              <Text style={styles.newChatBtn}>New</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {showCrisisCard && (
          <CrisisCard onDismiss={() => setShowCrisisCard(false)} />
        )}

        {showMoodSlider ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={{ paddingTop: 16 }}
          >
            <MoodSlider onSubmit={handleMoodSubmit} />
          </ScrollView>
        ) : (
          <FlatList
            ref={listRef}
            data={allDisplayMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatBubble role={item.role} content={item.content} />
            )}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              showQuickActions ? (
                <View style={styles.welcome}>
                  <Text style={styles.welcomeGreeting}>
                    Hey{userName ? `, ${userName}` : ''} 👋
                  </Text>
                  <Text style={styles.welcomeSub}>
                    What would you like to work on today?
                  </Text>
                  <View style={styles.quickGrid}>
                    {QUICK_ACTIONS.map((a) => (
                      <TouchableOpacity
                        key={a.id}
                        style={[
                          styles.quickCard,
                          a.id === 'check_in' && checkedInToday
                            ? styles.quickCardDone
                            : null,
                        ]}
                        onPress={() => handleQuickAction(a)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.quickIcon}>{a.icon}</Text>
                        <Text style={styles.quickLabel}>{a.label}</Text>
                        <Text style={styles.quickSub}>{a.subtitle}</Text>
                        {a.id === 'check_in' && checkedInToday && (
                          <Text style={styles.doneBadge}>✓ Done</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.orJust}>or just say hello below</Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              isStreaming ? (
                <ChatBubble
                  role="assistant"
                  content={streamingText}
                  isStreaming
                />
              ) : null
            }
          />
        )}

        {!showMoodSlider && (
          <ChatInput
            onSend={(text) => {
              if (mode === 'free_chat' || mode === 'check_in') {
                sendMessage(text);
              } else {
                sendMessage(text);
              }
            }}
            disabled={isStreaming || showMoodSlider}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  newChatBtn: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmallText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerName: { fontSize: 17, fontWeight: '700', color: Colors.text },
  headerSub: { fontSize: 12, color: Colors.textMuted },
  modeBadge: {
    backgroundColor: Colors.primaryLight + '33',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  modeBadgeText: {
    fontSize: 12,
    color: Colors.primaryDark,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  listContent: {
    paddingBottom: 12,
    flexGrow: 1,
  },
  welcome: {
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },
  welcomeGreeting: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
  },
  welcomeSub: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    width: '100%',
  },
  quickCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    width: '44%',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  quickCardDone: {
    borderColor: Colors.success,
    backgroundColor: Colors.success + '11',
  },
  quickIcon: { fontSize: 28, marginBottom: 4 },
  quickLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  quickSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  doneBadge: {
    marginTop: 6,
    fontSize: 11,
    color: Colors.success,
    fontWeight: '700',
  },
  orJust: {
    marginTop: 16,
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});
