import React from 'react';
import { View, Text } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import dayjs from 'dayjs';
import { Colors } from '@/constants/colors';

// A tiny, non-interactive overlay in the top-left showing which build/update is
// running. `Updates.createdAt` is the publish time of the JS bundle currently
// running — it changes on every native build AND every over-the-air `eas update`
// publish, so it's the most reliable "which version am I on" signal. It's null
// in dev / Expo Go, where we fall back to "dev".
export function VersionBadge() {
  const version = Constants.expoConfig?.version ?? '?';

  let stamp = 'dev';
  try {
    if (Updates.createdAt) {
      stamp = dayjs(Updates.createdAt).format('MMM D · h:mma');
    }
  } catch {
    // Updates not available (e.g. dev client) — keep the "dev" fallback.
  }

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: (Constants.statusBarHeight ?? 20) + 2,
        left: 8,
        zIndex: 9999,
      }}
    >
      <Text style={{ fontSize: 9, fontWeight: '600', color: Colors.textMuted, opacity: 0.6 }}>
        v{version} · {stamp}
      </Text>
    </View>
  );
}
