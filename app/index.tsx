import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { getSetting } from '@/lib/db/queries';
import { Colors } from '@/constants/colors';

// Entry route for "/". Without this file Expo Router has nothing to match on
// launch and falls through to +not-found ("This screen doesn't exist").
// Here we decide where a freshly-opened app should land.
type Target = '/onboarding' | '/(tabs)/chat';

export default function Index() {
  const [target, setTarget] = useState<Target | null>(null);

  useEffect(() => {
    (async () => {
      const onboarded = await getSetting('onboarding_complete');
      setTarget(onboarded === 'true' ? '/(tabs)/chat' : '/onboarding');
    })();
  }, []);

  if (!target) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return <Redirect href={target} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
