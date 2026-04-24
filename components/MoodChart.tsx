import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Path,
  Circle,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import dayjs from 'dayjs';
import { Colors, moodColor } from '@/constants/colors';
import type { MoodEntry } from '@/lib/db/queries';

interface Props {
  entries: MoodEntry[];
  days?: 7 | 30;
}

const CHART_HEIGHT = 180;
const V_PADDING = 20;
const USABLE_HEIGHT = CHART_HEIGHT - V_PADDING * 2;

export function MoodChart({ entries, days = 7 }: Props) {
  const width = Dimensions.get('window').width - 48; // card padding

  const points = useMemo(() => {
    if (entries.length === 0) return [];

    const cutoff = dayjs().subtract(days, 'day');
    const filtered = entries.filter((e) => dayjs(e.created_at).isAfter(cutoff));
    if (filtered.length === 0) return [];

    const span = days;
    return filtered.map((e) => {
      const daysAgo = dayjs().diff(dayjs(e.created_at), 'day');
      const x = ((span - daysAgo) / span) * (width - 32) + 16;
      const y =
        V_PADDING + USABLE_HEIGHT - ((e.score - 1) / 9) * USABLE_HEIGHT;
      return { x, y, score: e.score, date: e.created_at };
    });
  }, [entries, days, width]);

  const pathD = useMemo(() => {
    if (points.length < 2) return '';
    const pts = [...points].sort((a, b) => a.x - b.x);
    const d: string[] = [];
    pts.forEach((p, i) => {
      if (i === 0) {
        d.push(`M ${p.x} ${p.y}`);
      } else {
        const prev = pts[i - 1];
        const cpx = (prev.x + p.x) / 2;
        d.push(`C ${cpx} ${prev.y} ${cpx} ${p.y} ${p.x} ${p.y}`);
      }
    });
    return d.join(' ');
  }, [points]);

  const yLabels = [1, 3, 5, 7, 10];

  if (entries.length === 0) {
    return (
      <View style={[styles.container, styles.empty]}>
        <Text style={styles.emptyText}>
          No mood entries yet. Log your first check-in!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Svg width={width} height={CHART_HEIGHT}>
        <Defs>
          <LinearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={Colors.moodLow} />
            <Stop offset="0.5" stopColor={Colors.moodMid} />
            <Stop offset="1" stopColor={Colors.moodHigh} />
          </LinearGradient>
        </Defs>

        {/* Y-axis gridlines */}
        {yLabels.map((v) => {
          const y =
            V_PADDING + USABLE_HEIGHT - ((v - 1) / 9) * USABLE_HEIGHT;
          return (
            <React.Fragment key={v}>
              <Line
                x1={32}
                y1={y}
                x2={width - 8}
                y2={y}
                stroke={Colors.border}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <SvgText
                x={24}
                y={y + 4}
                fontSize={10}
                fill={Colors.textMuted}
                textAnchor="end"
              >
                {v}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Trend line */}
        {pathD ? (
          <Path
            d={pathD}
            stroke="url(#lineGrad)"
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {/* Data points */}
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={5}
            fill={moodColor(p.score)}
            stroke="#fff"
            strokeWidth={2}
          />
        ))}
      </Svg>

      {/* X-axis label */}
      <View style={styles.xAxisRow}>
        <Text style={styles.xLabel}>{days} days ago</Text>
        <Text style={styles.xLabel}>Today</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  empty: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 8,
  },
  xLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
