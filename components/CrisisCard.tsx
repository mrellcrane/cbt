import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from 'react-native';
import { Colors } from '@/constants/colors';

interface Props {
  onDismiss: () => void;
}

export function CrisisCard({ onDismiss }: Props) {
  const dial988 = () => Linking.openURL('tel:988');
  const text988 = () => Linking.openURL('sms:988');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>You're not alone.</Text>
      <Text style={styles.body}>
        It sounds like things feel really heavy right now. I'm glad you're
        here, and I want to make sure you have the right support.
      </Text>
      <Text style={styles.body}>
        The{' '}
        <Text style={styles.bold}>988 Suicide & Crisis Lifeline</Text> is
        available 24/7 — call or text, free and confidential.
      </Text>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: Colors.primary }]}
        onPress={dial988}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>📞 Call 988</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: Colors.surfaceAlt, marginTop: 10 },
        ]}
        onPress={text988}
        activeOpacity={0.85}
      >
        <Text style={[styles.buttonText, { color: Colors.text }]}>
          💬 Text 988
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onDismiss} style={styles.dismissRow}>
        <Text style={styles.dismissText}>I'm okay — continue the app</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 22,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: Colors.danger,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 10,
  },
  bold: { fontWeight: '700', color: Colors.text },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  dismissRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 14,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});
