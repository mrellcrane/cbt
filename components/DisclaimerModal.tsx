import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Colors } from '@/constants/colors';

interface Props {
  visible: boolean;
  onAccept: () => void;
}

export function DisclaimerModal({ visible, onAccept }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.55)',
          justifyContent: 'flex-end',
        }}
      >
        <SafeAreaView style={{ backgroundColor: Colors.surface }}>
          <View style={{ padding: 28, paddingBottom: 20 }}>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '700',
                color: Colors.text,
                marginBottom: 14,
              }}
            >
              Before we start 👋
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: Colors.textSecondary,
                lineHeight: 24,
                marginBottom: 20,
              }}
            >
              This app is a supportive tool built on cognitive behavioral
              therapy techniques. It is{' '}
              <Text style={{ fontWeight: '700', color: Colors.text }}>
                not a substitute for professional mental health care.
              </Text>
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: Colors.textSecondary,
                lineHeight: 24,
                marginBottom: 28,
              }}
            >
              If you're in crisis or need immediate help, please call or text{' '}
              <Text style={{ fontWeight: '700', color: Colors.primary }}>
                988
              </Text>{' '}
              (Suicide & Crisis Lifeline, available 24/7).
            </Text>
            <TouchableOpacity
              onPress={onAccept}
              activeOpacity={0.85}
              style={{
                backgroundColor: Colors.primary,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
              }}
            >
              <Text
                style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}
              >
                I understand — let's go
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
