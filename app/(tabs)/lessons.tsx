import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LESSONS } from '@/lib/lessons';
import { Colors } from '@/constants/colors';

export default function LessonsScreen() {
  const handleStartLesson = (lessonId: string, title: string) => {
    Alert.alert(
      `Start "${title}"?`,
      'This will open the Chat tab and Ember will guide you through this lesson.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Let\'s go',
          onPress: () => {
            // Navigate to chat and pass lesson intent via navigation state
            router.push({
              pathname: '/(tabs)/chat',
              params: { lessonId },
            });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Learn</Text>
        <Text style={styles.subtitle}>
          Bite-sized CBT concepts, one conversation at a time.
        </Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {LESSONS.map((lesson) => (
          <TouchableOpacity
            key={lesson.id}
            style={styles.card}
            onPress={() => handleStartLesson(lesson.id, lesson.title)}
            activeOpacity={0.8}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.icon}>{lesson.icon}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.lessonTitle}>{lesson.title}</Text>
              <Text style={styles.lessonSubtitle}>{lesson.subtitle}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.duration}>⏱ ~{lesson.durationMin} min</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            These micro-lessons are based on established CBT principles. They're
            educational tools, not clinical treatment. For professional support,
            speak with a licensed therapist.
          </Text>
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
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 19,
  },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 14,
  },
  cardLeft: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 26 },
  cardBody: { flex: 1, gap: 4 },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 21,
  },
  lessonSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  metaRow: { flexDirection: 'row', marginTop: 4 },
  duration: { fontSize: 12, color: Colors.textMuted },
  chevron: { fontSize: 24, color: Colors.textMuted },
  disclaimer: {
    marginTop: 8,
    padding: 16,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
    textAlign: 'center',
  },
});
