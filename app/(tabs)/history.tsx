import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MoodChart } from '@/components/MoodChart';
import { useMoodHistory } from '@/hooks/useMoodHistory';
import {
  getThoughtRecords,
  getGratitudeEntries,
  getAllDistortions,
  type ThoughtRecord,
  type GratitudeEntry,
} from '@/lib/db/queries';
import { computeDistortionStats, type DistortionStat } from '@/lib/distortions';
import { Colors, moodColor } from '@/constants/colors';
import dayjs from 'dayjs';

type Tab = 'mood' | 'thoughts' | 'gratitude' | 'patterns';

export default function HistoryScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('mood');
  const [chartDays, setChartDays] = useState<7 | 30>(7);
  const { entries, reload } = useMoodHistory(30);
  const [thoughts, setThoughts] = useState<ThoughtRecord[]>([]);
  const [gratitude, setGratitude] = useState<GratitudeEntry[]>([]);
  const [selectedThought, setSelectedThought] = useState<ThoughtRecord | null>(
    null,
  );
  const [distortions, setDistortions] = useState<{
    stats: DistortionStat[];
    total: number;
  }>({ stats: [], total: 0 });

  useFocusEffect(
    useCallback(() => {
      reload();
      getThoughtRecords(30).then(setThoughts);
      getGratitudeEntries(30).then(setGratitude);
      getAllDistortions().then((d) => setDistortions(computeDistortionStats(d)));
    }, [reload]),
  );

  const recentEntries = entries.slice(-chartDays);

  const avgMood =
    entries.length > 0
      ? (entries.reduce((s, e) => s + e.score, 0) / entries.length).toFixed(1)
      : '—';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      {/* Tab switcher */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabRow}
        contentContainerStyle={styles.tabRowContent}
      >
        {(['mood', 'thoughts', 'gratitude', 'patterns'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.tabText, activeTab === t && styles.tabTextActive]}
            >
              {t === 'mood'
                ? 'Mood'
                : t === 'thoughts'
                  ? 'Thoughts'
                  : t === 'gratitude'
                    ? 'Gratitude'
                    : 'Patterns'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'mood' && (
          <>
            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: moodColor(Number(avgMood)) }]}>
                  {avgMood}
                </Text>
                <Text style={styles.statLabel}>Avg mood</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{entries.length}</Text>
                <Text style={styles.statLabel}>Check-ins</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: Colors.success }]}>
                  {entries.filter((e) => e.score >= 7).length}
                </Text>
                <Text style={styles.statLabel}>Good days</Text>
              </View>
            </View>

            {/* Chart range toggle */}
            <View style={styles.rangeRow}>
              {([7, 30] as const).map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.rangeBtn,
                    chartDays === d && styles.rangeBtnActive,
                  ]}
                  onPress={() => setChartDays(d)}
                >
                  <Text
                    style={[
                      styles.rangeBtnText,
                      chartDays === d && styles.rangeBtnTextActive,
                    ]}
                  >
                    {d === 7 ? '7 days' : '30 days'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <MoodChart entries={recentEntries} days={chartDays} />

            {/* Recent entries list */}
            <Text style={styles.sectionTitle}>Recent entries</Text>
            {entries.length === 0 ? (
              <Text style={styles.empty}>
                No mood entries yet. Start a daily check-in!
              </Text>
            ) : (
              [...entries].reverse().slice(0, 14).map((e) => (
                <View key={e.id} style={styles.moodRow}>
                  <View
                    style={[
                      styles.moodDot,
                      { backgroundColor: moodColor(e.score) },
                    ]}
                  >
                    <Text style={styles.moodDotText}>{e.score}</Text>
                  </View>
                  <View style={styles.moodInfo}>
                    <Text style={styles.moodDate}>
                      {dayjs(e.created_at).format('ddd, MMM D')}
                    </Text>
                    {e.note ? (
                      <Text style={styles.moodNote} numberOfLines={1}>
                        {e.note}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.moodTime}>
                    {dayjs(e.created_at).format('h:mm a')}
                  </Text>
                </View>
              ))
            )}
          </>
        )}

        {activeTab === 'thoughts' && (
          <>
            <Text style={styles.sectionTitle}>
              {thoughts.length} completed thought record
              {thoughts.length !== 1 ? 's' : ''}
            </Text>
            {thoughts.length === 0 ? (
              <Text style={styles.empty}>
                Complete a thought record in Chat to see it here.
              </Text>
            ) : (
              thoughts.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.thoughtCard}
                  onPress={() => setSelectedThought(t)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.thoughtDate}>
                    {dayjs(t.created_at).format('MMM D, YYYY')}
                  </Text>
                  <Text style={styles.thoughtSituation} numberOfLines={2}>
                    {t.situation ?? 'No situation recorded'}
                  </Text>
                  <Text style={styles.thoughtDistortion}>
                    🪤 {t.distortion ?? 'Unknown distortion'}
                  </Text>
                  <Text style={styles.thoughtArrow}>View full record →</Text>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {activeTab === 'gratitude' && (
          <>
            <Text style={styles.sectionTitle}>
              {gratitude.length} gratitude entr
              {gratitude.length !== 1 ? 'ies' : 'y'}
            </Text>
            {gratitude.length === 0 ? (
              <Text style={styles.empty}>
                Start a gratitude session in Chat to see your entries here.
              </Text>
            ) : (
              gratitude.map((g) => {
                let items: string[] = [];
                try {
                  items = JSON.parse(g.items);
                } catch {
                  items = [g.items];
                }
                return (
                  <View key={g.id} style={styles.gratCard}>
                    <Text style={styles.gratDate}>
                      {dayjs(g.created_at).format('ddd, MMM D')}
                    </Text>
                    {items.map((item, i) => (
                      <Text key={i} style={styles.gratItem}>
                        🌱 {item}
                      </Text>
                    ))}
                  </View>
                );
              })
            )}
          </>
        )}

        {activeTab === 'patterns' && (
          <>
            <Text style={styles.sectionTitle}>Cognitive distortion patterns</Text>
            {distortions.total === 0 ? (
              <Text style={styles.empty}>
                Complete a few thought records in Chat to see which thinking
                patterns show up most often.
              </Text>
            ) : (
              <>
                <Text style={styles.patternsIntro}>
                  Across {distortions.total} thought record
                  {distortions.total !== 1 ? 's' : ''}, here's how often each
                  distortion came up:
                </Text>
                {distortions.stats.map((s) => {
                  const max = distortions.stats[0]?.count || 1;
                  const pct = Math.max(6, Math.round((s.count / max) * 100));
                  return (
                    <View key={s.name} style={styles.distRow}>
                      <View style={styles.distHeader}>
                        <Text style={styles.distName}>{s.name}</Text>
                        <Text style={styles.distCount}>{s.count}</Text>
                      </View>
                      <View style={styles.distBarTrack}>
                        <View
                          style={[styles.distBarFill, { width: `${pct}%` }]}
                        />
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Thought record detail modal */}
      <Modal
        visible={!!selectedThought}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedThought && (
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thought Record</Text>
              <TouchableOpacity onPress={() => setSelectedThought(null)}>
                <Text style={styles.modalClose}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.modalContent}
            >
              <Text style={styles.modalDate}>
                {dayjs(selectedThought.created_at).format('MMMM D, YYYY')}
              </Text>
              {[
                { label: 'Situation', value: selectedThought.situation },
                {
                  label: 'Automatic thought',
                  value: selectedThought.automatic_thought,
                },
                { label: 'Emotions', value: selectedThought.emotions },
                {
                  label: 'Thinking pattern',
                  value: selectedThought.distortion,
                },
                {
                  label: 'Balanced thought',
                  value: selectedThought.balanced_thought,
                },
              ].map(({ label, value }) => (
                <View key={label} style={styles.recordField}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <Text style={styles.fieldValue}>
                    {value ?? '—'}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
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
  tabRow: {
    flexGrow: 0,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabRowContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 40 },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rangeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rangeBtnActive: {
    backgroundColor: Colors.primaryLight + '33',
    borderColor: Colors.primary,
  },
  rangeBtnText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  rangeBtnTextActive: { color: Colors.primaryDark },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 6,
  },
  empty: {
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 24,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  moodDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodDotText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  moodInfo: { flex: 1 },
  moodDate: { fontSize: 14, fontWeight: '600', color: Colors.text },
  moodNote: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  moodTime: { fontSize: 12, color: Colors.textMuted },
  thoughtCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  thoughtDate: { fontSize: 12, color: Colors.textMuted },
  thoughtSituation: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 21,
  },
  thoughtDistortion: { fontSize: 13, color: Colors.textSecondary },
  thoughtArrow: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  gratCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  gratDate: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  gratItem: { fontSize: 15, color: Colors.text, lineHeight: 22 },
  patternsIntro: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  distRow: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  distHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distName: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1 },
  distCount: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  distBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.surfaceAlt,
    overflow: 'hidden',
  },
  distBarFill: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  // Modal
  modalSafe: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  modalClose: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  modalContent: { padding: 20, gap: 16, paddingBottom: 40 },
  modalDate: { fontSize: 14, color: Colors.textMuted, marginBottom: 4 },
  recordField: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: { fontSize: 15, color: Colors.text, lineHeight: 22 },
});
