import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { setSetting } from '@/lib/db/queries';
import { Colors } from '@/constants/colors';

export default function OnboardingScreen() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleContinue = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 1) {
      setError('Please enter a name so Ember knows what to call you.');
      return;
    }
    await setSetting('user_name', trimmed);
    await setSetting('onboarding_complete', 'true');
    router.replace('/(tabs)/chat');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <View style={styles.topSection}>
            <View style={styles.logoMark}>
              <Text style={styles.logoEmber}>E</Text>
            </View>
            <Text style={styles.heading}>Meet Ember</Text>
            <Text style={styles.subheading}>
              Your pocket companion for the moments when your mind needs a
              little support.
            </Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>What should Ember call you?</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              value={name}
              onChangeText={(t) => {
                setName(t);
                setError('');
              }}
              placeholder="Your first name"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[
                styles.btn,
                name.trim().length === 0 && styles.btnDisabled,
              ]}
              onPress={handleContinue}
              activeOpacity={0.85}
              disabled={name.trim().length === 0}
            >
              <Text style={styles.btnText}>Let's go →</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.disclaimer}>
            This is a supportive tool, not a substitute for professional mental
            health care. In a crisis, call or text{' '}
            <Text style={{ fontWeight: '700' }}>988</Text>.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  topSection: { alignItems: 'center', paddingTop: 40 },
  logoMark: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoEmber: { color: '#fff', fontSize: 36, fontWeight: '800' },
  heading: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
  },
  subheading: {
    fontSize: 17,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 25,
  },
  formSection: { gap: 10 },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    fontSize: 17,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputError: { borderColor: Colors.danger },
  errorText: { fontSize: 13, color: Colors.danger },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { backgroundColor: Colors.border },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  disclaimer: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingBottom: 8,
  },
});
