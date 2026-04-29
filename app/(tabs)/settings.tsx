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
import { useFocusEffect } from 'expo-router';
import { getSetting, setSetting } from '@/lib/db/queries';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import { Colors } from '@/constants/colors';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [userName, setUserName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');

  useFocusEffect(
    useCallback(() => {
      getSetting('user_name').then((n) => {
        if (n) setUserName(n);
      });
    }, []),
  );

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
            if (!user) return;
            await Promise.all([
              supabase.from('mood_entries').delete().eq('user_id', user.id),
              supabase.from('thought_records').delete().eq('user_id', user.id),
              supabase.from('gratitude_entries').delete().eq('user_id', user.id),
              supabase.from('messages').delete().eq('user_id', user.id),
            ]);
            Alert.alert('Done', 'All data has been cleared.');
          },
        },
      ],
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You will need to sign in again to access your data.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
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
          {user?.email ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Email</Text>
              <Text style={styles.rowValueMuted}>{user.email}</Text>
            </View>
          ) : null}
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
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <TouchableOpacity
            style={styles.destructiveRow}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <Text style={styles.destructiveText}>Sign out</Text>
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
  rowValueMuted: { fontSize: 15, color: Colors.textMuted },
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
