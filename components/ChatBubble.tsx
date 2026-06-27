import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors } from '@/constants/colors';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  /** When provided (Ember messages), shows a tap-to-play audio button. */
  onTogglePlay?: () => void;
  isPlaying?: boolean;
}

export function ChatBubble({
  role,
  content,
  isStreaming = false,
  onTogglePlay,
  isPlaying = false,
}: Props) {
  const isUser = role === 'user';
  const showPlay =
    !isUser && !!onTogglePlay && !isStreaming && content.length > 0;

  return (
    <View
      style={[
        styles.row,
        isUser ? styles.rowUser : styles.rowBot,
      ]}
    >
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>E</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleBot,
          isUser ? styles.bubbleUserRadius : styles.bubbleBotRadius,
        ]}
      >
        {isStreaming && content.length === 0 ? (
          <View style={styles.typingRow}>
            <ActivityIndicator
              size="small"
              color={Colors.textMuted}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.text, { color: Colors.textMuted }]}>
              Thinking…
            </Text>
          </View>
        ) : (
          <Text
            style={[
              styles.text,
              isUser ? styles.textUser : styles.textBot,
            ]}
          >
            {content}
            {isStreaming && (
              <Text style={{ color: Colors.primary }}>▌</Text>
            )}
          </Text>
        )}
      </View>
      {showPlay && (
        <TouchableOpacity
          onPress={onTogglePlay}
          style={[styles.playBtn, isPlaying && styles.playBtnActive]}
          hitSlop={12}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Stop playback' : 'Play message aloud'}
        >
          <Text style={styles.playIcon}>{isPlaying ? '◼' : '▶'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 5,
    paddingHorizontal: 14,
    alignItems: 'flex-end',
  },
  rowUser: { justifyContent: 'flex-end' },
  rowBot: { justifyContent: 'flex-start' },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  avatarText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  bubble: {
    maxWidth: '78%',
    paddingVertical: 11,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  bubbleUser: { backgroundColor: Colors.bubbleUser },
  bubbleBot: {
    backgroundColor: Colors.bubbleBot,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleUserRadius: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  bubbleBotRadius: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  text: { fontSize: 16, lineHeight: 23 },
  textUser: { color: Colors.bubbleUserText },
  textBot: { color: Colors.bubbleBotText },
  typingRow: { flexDirection: 'row', alignItems: 'center' },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  playBtnActive: { backgroundColor: Colors.primaryDark },
  playIcon: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 2,
    fontWeight: '700',
  },
});
