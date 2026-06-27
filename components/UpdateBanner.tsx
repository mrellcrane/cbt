import React, { useCallback, useEffect, useState } from 'react';
import { TouchableOpacity, Text, AppState, StyleSheet } from 'react-native';
import * as Updates from 'expo-updates';
import { Colors } from '@/constants/colors';

// Watches for over-the-air updates and shows a tap-to-apply banner when one is
// ready. Checks on mount and every time the app returns to the foreground, so
// the user finds out a new version is available without waiting or guessing.
// `Updates.useUpdates()` exposes isUpdatePending (downloaded, ready to reload).
export function UpdateBanner() {
  const { isUpdatePending } = Updates.useUpdates();
  const [applying, setApplying] = useState(false);

  const checkAndFetch = useCallback(async () => {
    try {
      const res = await Updates.checkForUpdateAsync();
      if (res.isAvailable) await Updates.fetchUpdateAsync();
    } catch {
      // Updates disabled (dev / Expo Go) or offline — nothing to do.
    }
  }, []);

  useEffect(() => {
    checkAndFetch();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') checkAndFetch();
    });
    return () => sub.remove();
  }, [checkAndFetch]);

  const apply = useCallback(async () => {
    setApplying(true);
    try {
      await Updates.reloadAsync();
    } catch {
      setApplying(false);
    }
  }, []);

  if (!isUpdatePending) return null;

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={apply}
      activeOpacity={0.85}
      disabled={applying}
      accessibilityRole="button"
      accessibilityLabel="Apply the new app update"
    >
      <Text style={styles.text}>
        {applying ? 'Updating…' : '🔄  New update ready — tap to apply'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: Colors.primaryDark,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    zIndex: 10000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  text: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
