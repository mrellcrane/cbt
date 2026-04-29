import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    }
    // On success, AuthContext listener navigates to onboarding
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topSection}>
            <View style={styles.logoMark}>
              <Text style={styles.logoEmber}>E</Text>
            </View>
            <Text style={styles.heading}>Create account</Text>
            <Text style={styles.subheading}>
              Start your CBT journey with Ember
            </Text>
          </View>

          <View style={styles.formSection}>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              value={email}
              onChangeText={(t) => { setEmail(t); setError(''); }}
              placeholder="Email"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              value={password}
              onChangeText={(t) => { setPassword(t); setError(''); }}
              placeholder="Password (6+ characters)"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              returnKeyType="next"
            />
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              value={confirm}
              onChangeText={(t) => { setConfirm(t); setError(''); }}
              placeholder="Confirm password"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSignup}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSignup}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Create account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.75}
            >
              <Text style={styles.switchText}>
                Already have an account?{' '}
                <Text style={styles.switchLink}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.disclaimer}>
            This is a supportive tool, not a substitute for professional mental
            health care. In a crisis, call or text{' '}
            <Text style={{ fontWeight: '700' }}>988</Text>.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingVertical: 20,
    gap: 32,
  },
  topSection: { alignItems: 'center', paddingTop: 24 },
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
  },
  formSection: { gap: 12 },
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
  switchText: {
    textAlign: 'center',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  switchLink: { color: Colors.primary, fontWeight: '700' },
  disclaimer: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingBottom: 8,
  },
});
