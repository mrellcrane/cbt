import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Colors, moodColor } from '@/constants/colors';

interface Props {
  onSubmit: (score: number, note: string) => void;
}

const MOOD_LABELS: Record<number, string> = {
  1: 'Really rough',
  2: 'Pretty low',
  3: 'Not great',
  4: 'A bit down',
  5: 'Okay',
  6: 'Alright',
  7: 'Pretty good',
  8: 'Good',
  9: 'Really good',
  10: 'Fantastic',
};

export function MoodSlider({ onSubmit }: Props) {
  const [score, setScore] = useState(5);
  const [note, setNote] = useState('');

  return (
    <View style={styles.card}>
      <Text style={styles.title}>How are you feeling today?</Text>

      <View style={styles.scoreRow}>
        <Text style={[styles.scoreNumber, { color: moodColor(score) }]}>
          {score}
        </Text>
        <Text style={styles.scoreLabel}>{MOOD_LABELS[score]}</Text>
      </View>

      <Slider
        style={styles.slider}
        minimumValue={1}
        maximumValue={10}
        step={1}
        value={score}
        onValueChange={(v) => setScore(Math.round(v))}
        minimumTrackTintColor={moodColor(score)}
        maximumTrackTintColor={Colors.border}
        thumbTintColor={moodColor(score)}
      />

      <View style={styles.sliderLabels}>
        <Text style={styles.sliderEdge}>1</Text>
        <Text style={styles.sliderEdge}>10</Text>
      </View>

      <TextInput
        style={styles.noteInput}
        value={note}
        onChangeText={setNote}
        placeholder="Anything else on your mind? (optional)"
        placeholderTextColor={Colors.textMuted}
        multiline
        maxLength={300}
      />

      <TouchableOpacity
        style={styles.submitBtn}
        onPress={() => onSubmit(score, note)}
        activeOpacity={0.85}
      >
        <Text style={styles.submitText}>Log mood</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    marginHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 18,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  slider: { width: '100%', height: 40 },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -6,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  sliderEdge: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  noteInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
    minHeight: 60,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
