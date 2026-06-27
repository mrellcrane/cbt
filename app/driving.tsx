import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useDictation } from '@/hooks/useDictation';
import { useTts } from '@/hooks/useTts';
import { streamChatReply, stripMarkers } from '@/lib/ai/chatClient';
import { detectCrisis } from '@/lib/crisis';
import {
  getSetting,
  getMessages,
  getRecentSessionId,
  saveMessage,
} from '@/lib/db/queries';
import type { ApiMessage } from '@/lib/ai/types';
import { Colors } from '@/constants/colors';

type Status = 'idle' | 'listening' | 'thinking' | 'speaking';

function makeSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// High-contrast dark palette — easier on the eyes and less glare while driving.
const DRIVE = {
  bg: '#16161F',
  surface: '#23232F',
  text: '#F4F2EE',
  textDim: '#A0A0B0',
};

const STATUS_LABEL: Record<Status, string> = {
  idle: 'Tap to talk',
  listening: 'Listening…',
  thinking: 'Thinking…',
  speaking: 'Tap to interrupt',
};

export default function DrivingScreen() {
  const [status, setStatus] = useState<Status>('idle');
  const [autoListen, setAutoListen] = useState(true);
  const [lastUser, setLastUser] = useState('');
  const [emberText, setEmberText] = useState('');
  const [error, setError] = useState('');
  const [crisis, setCrisis] = useState(false);

  const userNameRef = useRef('');
  const sessionRef = useRef('');
  const historyRef = useRef<ApiMessage[]>([]);
  const mountedRef = useRef(true);
  const autoListenRef = useRef(true);
  autoListenRef.current = autoListen;

  const tts = useTts();
  const statusRef = useRef<Status>('idle');
  const setStatusSafe = useCallback((s: Status) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  // ── Conversation turn ──────────────────────────────────────────────────────
  const handleTurn = useCallback(
    async (text: string) => {
      setLastUser(text);
      setEmberText('');

      const isCrisis = detectCrisis(text);
      if (isCrisis) {
        setCrisis(true);
        setAutoListen(false);
      }

      const sid = sessionRef.current;
      historyRef.current = [...historyRef.current, { role: 'user', content: text }];
      await saveMessage({ role: 'user', content: text, sessionId: sid });

      setStatusSafe('thinking');

      let full = '';
      try {
        full = await streamChatReply({
          userName: userNameRef.current,
          mode: 'free_chat',
          history: historyRef.current,
          onDelta: (t) => {
            if (mountedRef.current) setEmberText(stripMarkers(t));
          },
          shouldAbort: () => !mountedRef.current,
        });
      } catch {
        full =
          "Sorry, I couldn't connect just now. Check your network and try again.";
      }

      if (!mountedRef.current) return;

      const display = stripMarkers(full);
      setEmberText(display);
      historyRef.current = [
        ...historyRef.current,
        { role: 'assistant', content: display },
      ];
      await saveMessage({
        role: 'assistant',
        content: display,
        sessionId: sid,
      });

      setStatusSafe('speaking');
      await tts.speak(display);

      if (!mountedRef.current) return;
      setStatusSafe('idle');

      // Hands-free loop: reopen the mic once Ember finishes — unless auto-listen
      // is off or we're in a crisis flow.
      if (autoListenRef.current && !isCrisis) {
        beginListening();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setStatusSafe, tts],
  );

  const dictation = useDictation({ onFinalResult: handleTurn });
  const dictationRef = useRef(dictation);
  dictationRef.current = dictation;

  const beginListening = useCallback(async () => {
    if (!mountedRef.current) return;
    setError('');
    setStatusSafe('listening');
    const ok = await dictationRef.current.start();
    if (!ok) {
      setStatusSafe('idle');
      setError(
        'Speech recognition needs microphone & speech permission. Enable them in Settings to talk hands-free.',
      );
    }
  }, [setStatusSafe]);

  // ── Mount / unmount ────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      userNameRef.current = (await getSetting('user_name')) ?? '';
      const existing = await getRecentSessionId();
      const sid = existing ?? makeSessionId();
      sessionRef.current = sid;
      const history = await getMessages(sid, 14);
      historyRef.current = history.map((m) => ({
        role: m.role,
        content: m.content,
      }));
    })();
    return () => {
      mountedRef.current = false;
      dictationRef.current.abort();
      tts.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Big-button tap ─────────────────────────────────────────────────────────
  const handleMainPress = useCallback(() => {
    switch (statusRef.current) {
      case 'idle':
        beginListening();
        break;
      case 'listening':
        // Finalize the current utterance now.
        dictationRef.current.stop();
        break;
      case 'speaking':
        // Interrupt Ember and start listening immediately.
        tts.stop();
        setStatusSafe('idle');
        beginListening();
        break;
      case 'thinking':
        // Let it finish.
        break;
    }
  }, [beginListening, setStatusSafe, tts]);

  const handleExit = useCallback(() => {
    mountedRef.current = false;
    dictationRef.current.abort();
    tts.stop();
    router.back();
  }, [tts]);

  // ── Pulse animation while listening / speaking ─────────────────────────────
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (status === 'listening' || status === 'speaking') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.12,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    pulse.setValue(1);
  }, [status, pulse]);

  const buttonColor =
    status === 'listening'
      ? Colors.accent
      : status === 'thinking'
        ? DRIVE.surface
        : status === 'speaking'
          ? Colors.primaryDark
          : Colors.primary;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleExit}
          hitSlop={16}
          style={styles.exitBtn}
        >
          <Text style={styles.exitText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Driving Mode</Text>
        <TouchableOpacity
          onPress={() => setAutoListen((v) => !v)}
          hitSlop={12}
          style={styles.autoToggle}
        >
          <Text
            style={[
              styles.autoToggleText,
              autoListen && styles.autoToggleOn,
            ]}
          >
            {autoListen ? '🔁 Auto' : '⏸ Manual'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Transcript area */}
      <ScrollView
        style={styles.transcript}
        contentContainerStyle={styles.transcriptContent}
      >
        {lastUser ? (
          <Text style={styles.youText}>“{lastUser}”</Text>
        ) : (
          <Text style={styles.hint}>
            Tap the button and talk to Ember. It listens, replies out loud, then
            listens again — no need to touch your phone.
          </Text>
        )}
        {status === 'listening' && dictation.partial ? (
          <Text style={styles.partialText}>{dictation.partial}</Text>
        ) : null}
        {emberText ? <Text style={styles.emberText}>{emberText}</Text> : null}
        {crisis ? (
          <View style={styles.crisisBox}>
            <Text style={styles.crisisTitle}>You're not alone.</Text>
            <Text style={styles.crisisBody}>
              The 988 Suicide & Crisis Lifeline is available 24/7 — call or text.
            </Text>
            <TouchableOpacity
              style={styles.crisisBtn}
              onPress={() => Linking.openURL('tel:988')}
            >
              <Text style={styles.crisisBtnText}>📞 Call 988</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      {/* Big control */}
      <View style={styles.controlArea}>
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleMainPress}
            style={[styles.bigButton, { backgroundColor: buttonColor }]}
          >
            {status === 'thinking' ? (
              <ActivityIndicator color={DRIVE.text} size="large" />
            ) : (
              <Text style={styles.bigButtonIcon}>
                {status === 'listening'
                  ? '🎙️'
                  : status === 'speaking'
                    ? '🔊'
                    : '🎤'}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
        <Text style={styles.statusLabel}>{STATUS_LABEL[status]}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DRIVE.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  exitBtn: { width: 60 },
  exitText: { color: DRIVE.textDim, fontSize: 24, fontWeight: '600' },
  title: { color: DRIVE.text, fontSize: 18, fontWeight: '700' },
  autoToggle: { width: 90, alignItems: 'flex-end' },
  autoToggleText: { color: DRIVE.textDim, fontSize: 14, fontWeight: '600' },
  autoToggleOn: { color: Colors.primaryLight },
  transcript: { flex: 1 },
  transcriptContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 16,
  },
  hint: {
    color: DRIVE.textDim,
    fontSize: 18,
    lineHeight: 27,
    textAlign: 'center',
    marginTop: 24,
  },
  youText: {
    color: DRIVE.textDim,
    fontSize: 20,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  partialText: {
    color: Colors.accentLight,
    fontSize: 20,
    textAlign: 'center',
  },
  emberText: {
    color: DRIVE.text,
    fontSize: 26,
    lineHeight: 36,
    fontWeight: '600',
    textAlign: 'center',
  },
  crisisBox: {
    backgroundColor: DRIVE.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: Colors.danger,
    gap: 10,
  },
  crisisTitle: { color: DRIVE.text, fontSize: 18, fontWeight: '700' },
  crisisBody: { color: DRIVE.textDim, fontSize: 15, lineHeight: 22 },
  crisisBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  crisisBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  errorText: {
    color: Colors.accentLight,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  controlArea: {
    alignItems: 'center',
    paddingBottom: 32,
    paddingTop: 8,
    gap: 16,
  },
  bigButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  bigButtonIcon: { fontSize: 56 },
  statusLabel: {
    color: DRIVE.text,
    fontSize: 20,
    fontWeight: '600',
  },
});
