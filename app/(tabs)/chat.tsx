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
  Switch,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetch } from 'expo/fetch';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import { apiUrl } from '@/lib/api';
import { useTts } from '@/hooks/useTts';
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
  setSetting,
  insertThoughtRecord,
  completeThoughtRecord,
  insertGratitudeEntry,
} from '@/lib/db/queries';
import type { ChatMessage, Mode } from '@/lib/ai/types';
import { Colors } from '@/constants/colors';
import { LESSONS } from '@/lib/lessons';
import { router } from 'expo-router';

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

  // Tap-to-play audio for Ember's messages. One TTS engine; playingId tracks
  // which message is currently being read aloud.
  const tts = useTts();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const playMessage = useCallback(
    (id: string, text: string) => {
      setPlayingId(id);
      tts.speak(text).finally(() => {
        setPlayingId((curr) => (curr === id ? null : curr));
      });
    },
    [tts],
  );
  const handleTogglePlay = useCallback(
    (id: string, text: string) => {
      tts.stop();
      if (playingId === id) {
        setPlayingId(null);
        return;
      }
      playMessage(id, text);
    },
    [playingId, tts, playMessage],
  );

  // Auto-play setting: when on, Ember's replies are read aloud automatically.
  const [autoPlay, setAutoPlay] = useState(false);
  const autoPlayRef = useRef(false);
  autoPlayRef.current = autoPlay;
  const toggleAutoPlay = useCallback(
    (next: boolean) => {
      setAutoPlay(next);
      setSetting('autoplay', next ? 'on' : 'off');
      if (!next) {
        tts.stop();
        setPlayingId(null);
      }
    },
    [tts],
  );

  // Feedback modal — submissions are stored server-side (GitHub issue).
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackError, setFeedbackError] = useState(false);
  const openFeedback = useCallback(() => {
    setFeedbackError(false);
    setFeedbackSent(false);
    setShowFeedback(true);
  }, []);
  const submitFeedback = useCallback(async () => {
    const text = feedbackText.trim();
    if (!text || sendingFeedback) return;
    setSendingFeedback(true);
    setFeedbackError(false);
    try {
      const res = await fetch(apiUrl('/api/feedback'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          appVersion: Constants.expoConfig?.version ?? '',
          platform: Platform.OS,
          when: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(`feedback http ${res.status}`);
      setFeedbackSent(true);
      setFeedbackText('');
      setTimeout(() => {
        setShowFeedback(false);
        setFeedbackSent(false);
      }, 1200);
    } catch {
      setFeedbackError(true);
    } finally {
      setSendingFeedback(false);
    }
  }, [feedbackText, sendingFeedback]);

  // Load data when tab is focused
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const name = (await getSetting('user_name')) ?? '';
        setUserName(name);

        const ap = (await getSetting('autoplay')) === 'on';
        setAutoPlay(ap);

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
        const response = await fetch(apiUrl('/api/chat'), {
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
      } catch (err) {
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

      // Auto-play Ember's reply aloud when the setting is on.
      if (autoPlayRef.current && display) {
        playMessage(assistantMsg.id, display);
      }

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
          <TouchableOpacity
            onPress={() => router.push('/driving')}
            activeOpacity={0.75}
            hitSlop={8}
          >
            <Text style={styles.driveBtn}>🚗</Text>
          </TouchableOpacity>
          {messages.length > 0 && (
            <TouchableOpacity onPress={startNewChat} activeOpacity={0.75}>
              <Text style={styles.newChatBtn}>New</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Control bar: auto-play toggle + feedback */}
      <View style={styles.controlBar}>
        <View style={styles.autoPlayWrap}>
          <Text style={styles.controlLabel}>🔊 Auto-play replies</Text>
          <Switch
            value={autoPlay}
            onValueChange={toggleAutoPlay}
            trackColor={{ false: Colors.border, true: Colors.primaryLight }}
            thumbColor={autoPlay ? Colors.primary : '#f4f3f4'}
          />
        </View>
        <TouchableOpacity
          style={styles.feedbackBtn}
          onPress={openFeedback}
          activeOpacity={0.8}
          hitSlop={8}
        >
          <Text style={styles.feedbackBtnText}>✏️ Feedback</Text>
        </TouchableOpacity>
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
              <ChatBubble
                role={item.role}
                content={item.content}
                isPlaying={playingId === item.id}
                onTogglePlay={
                  item.role === 'assistant'
                    ? () => handleTogglePlay(item.id, item.content)
                    : undefined
                }
              />
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
                  <TouchableOpacity
                    style={styles.driveCard}
                    onPress={() => router.push('/driving')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.driveCardIcon}>🚗</Text>
                    <View style={styles.driveCardTextWrap}>
                      <Text style={styles.driveCardLabel}>Driving mode</Text>
                      <Text style={styles.driveCardSub}>
                        Talk hands-free — Ember listens and replies out loud
                      </Text>
                    </View>
                  </TouchableOpacity>
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

      <Modal
        visible={showFeedback}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFeedback(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Send feedback</Text>
            <Text style={styles.modalSub}>
              Tell me what to improve, what's broken, or any idea. It goes
              straight to the developer.
            </Text>
            <TextInput
              style={styles.feedbackInput}
              placeholder="What's working, what's not, ideas…"
              placeholderTextColor={Colors.textMuted}
              value={feedbackText}
              onChangeText={setFeedbackText}
              multiline
              autoFocus
              editable={!sendingFeedback && !feedbackSent}
            />
            {feedbackError && (
              <Text style={styles.feedbackErr}>
                Couldn't send. Check your connection and try again.
              </Text>
            )}
            {feedbackSent ? (
              <Text style={styles.feedbackOk}>✓ Thanks! Feedback sent.</Text>
            ) : (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancel]}
                  onPress={() => setShowFeedback(false)}
                  disabled={sendingFeedback}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalBtn,
                    styles.modalSend,
                    (!feedbackText.trim() || sendingFeedback) &&
                      styles.modalSendDisabled,
                  ]}
                  onPress={submitFeedback}
                  disabled={!feedbackText.trim() || sendingFeedback}
                  activeOpacity={0.8}
                >
                  {sendingFeedback ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalSendText}>Send</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  autoPlayWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  controlLabel: { fontSize: 14, color: Colors.text, fontWeight: '600' },
  feedbackBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  feedbackBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 22,
    paddingBottom: 36,
    gap: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  modalSub: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  feedbackInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    textAlignVertical: 'top',
    backgroundColor: Colors.background,
  },
  feedbackErr: { color: Colors.danger, fontSize: 14 },
  feedbackOk: {
    color: Colors.success,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 10,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancel: { backgroundColor: Colors.surfaceAlt },
  modalCancelText: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  modalSend: { backgroundColor: Colors.primary },
  modalSendDisabled: { opacity: 0.5 },
  modalSendText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  newChatBtn: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  driveBtn: { fontSize: 20, paddingHorizontal: 4 },
  driveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginTop: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  driveCardIcon: { fontSize: 30 },
  driveCardTextWrap: { flex: 1 },
  driveCardLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  driveCardSub: {
    color: '#EAF5F2',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
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
