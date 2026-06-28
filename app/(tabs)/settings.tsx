import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { getSetting, setSetting } from '@/lib/db/queries';
import { getDb } from '@/lib/db/schema';
import { useTts } from '@/hooks/useTts';
import { VOICES, DEFAULT_VOICE_ID } from '@/lib/voices';
import { Colors } from '@/constants/colors';

export default function SettingsScreen() {
  const [userName, setUserName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [voiceId, setVoiceId] = useState<string>(DEFAULT_VOICE_ID);
  const tts = useTts();

  useFocusEffect(
    useCallback(() => {
      getSetting('user_name').then((n) => {
        if (n) setUserName(n);
      });
      getSetting('voice_id').then((v) => setVoiceId(v ?? DEFAULT_VOICE_ID));
    }, []),
  );

  const selectVoice = async (id: string) => {
    setVoiceId(id);
    await setSetting('voice_id', id);
  };
  const previewVoice = (id: string) => {
    tts.stop();
    tts.speak("Hi, I'm Ember. This is how I sound.", 1, id);
  };

  const saveName = async () => {
    const trimmed = draftName.trim();
    if (trimmed.length < 1) return;
    await setSetting('user_name', trimmed);
    setUserName(trimmed);
    setEditingName(false);
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear all data?',
      'This will delete your mood history, thought records, gratitude entries, and conversation history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            const db = await getDb();
            await db.execAsync(`
              DELETE FROM mood_entries;
              DELETE FROM thought_records;
              DELETE FROM gratitude_entries;
              DELETE FROM messages;
              DELETE FROM settings WHERE key != 'onboarding_complete';
            `);
            Alert.alert('Done', 'All data has been cleared.');
          },
        },
      ],
    );
  };

  const resetOnboarding = () => {
    Alert.alert(
      'Reset app?',
      'This will reset the app to the first-launch state, including onboarding.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const db = await getDb();
            await db.execAsync(`DELETE FROM settings;`);
            router.replace('/onboarding');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Profile</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Your name</Text>
            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  style={styles.nameInput}
                  value={draftName}
                  onChangeText={setDraftName}
                  autoFocus
                  maxLength={30}
                  onSubmitEditing={saveName}
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={saveName}>
                  <Text style={styles.saveBtn}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingName(false)}>
                  <Text style={styles.cancelBtn}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setDraftName(userName);
                  setEditingName(true);
                }}
              >
                <Text style={styles.rowValue}>{userName || '—'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Voice */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Ember's voice</Text>
          {VOICES.map((v) => {
            const selected = v.id === voiceId;
            return (
              <View
                key={v.id}
                style={[styles.voiceRow, selected && styles.voiceRowSelected]}
              >
                <TouchableOpacity
                  style={styles.voiceMain}
                  onPress={() => selectVoice(v.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.voiceCheck}>{selected ? '✓' : ''}</Text>
                  <View>
                    <Text style={styles.voiceName}>{v.name}</Text>
                    <Text style={styles.voiceDesc}>{v.description}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.voicePreview}
                  onPress={() => previewVoice(v.id)}
                  hitSlop={8}
                  activeOpacity={0.8}
                >
                  <Text style={styles.voicePreviewText}>▶</Text>
                </TouchableOpacity>
              </View>
            );
          })}
          <Text style={styles.voiceHint}>
            Tap a name to select it, ▶ to preview. Uses the ElevenLabs voice.
          </Text>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>About</Text>
          <View style={styles.infoCard}>
            <Text style={styles.appName}>CBT Companion</Text>
            <Text style={styles.appSubtitle}>
              A supportive tool for cognitive behavioral therapy exercises.
            </Text>
            <View style={styles.divider} />
            <Text style={styles.infoText}>
              This app is not a substitute for professional mental health care.
              If you're in crisis, call or text{' '}
              <Text style={{ fontWeight: '700', color: Colors.primary }}>
                988
              </Text>{' '}
              (Suicide & Crisis Lifeline, 24/7).
            </Text>
          </View>
        </View>

        {/* Data */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Data</Text>
          <TouchableOpacity
            style={styles.destructiveRow}
            onPress={clearAllData}
            activeOpacity={0.8}
          >
            <Text style={styles.destructiveText}>Clear all data</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.destructiveRow, { marginTop: 8 }]}
            onPress={resetOnboarding}
            activeOpacity={0.8}
          >
            <Text style={styles.destructiveText}>Reset app (re-run onboarding)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text },
  content: { padding: 16, gap: 16, paddingBottom: 60 },
  section: { gap: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowLabel: { fontSize: 15, color: Colors.text, fontWeight: '500' },
  rowValue: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    color: Colors.text,
    minWidth: 100,
  },
  saveBtn: { fontSize: 15, color: Colors.primary, fontWeight: '700' },
  cancelBtn: { fontSize: 15, color: Colors.textMuted },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  voiceRowSelected: { borderColor: Colors.primary, borderWidth: 2 },
  voiceMain: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  voiceCheck: {
    width: 18,
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  voiceName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  voiceDesc: { fontSize: 13, color: Colors.textSecondary },
  voicePreview: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voicePreviewText: { fontSize: 16, color: Colors.primary, marginLeft: 2 },
  voiceHint: {
    fontSize: 12,
    color: Colors.textMuted,
    paddingHorizontal: 4,
    lineHeight: 17,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  appName: { fontSize: 18, fontWeight: '800', color: Colors.text },
  appSubtitle: { fontSize: 14, color: Colors.textSecondary },
  divider: { height: 1, backgroundColor: Colors.border },
  infoText: { fontSize: 13, color: Colors.textMuted, lineHeight: 19 },
  destructiveRow: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.danger + '44',
  },
  destructiveText: {
    fontSize: 15,
    color: Colors.danger,
    fontWeight: '600',
    textAlign: 'center',
  },
});
