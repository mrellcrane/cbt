import React, { useEffect, useState } from 'react';
import { Tabs, router } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { getSetting } from '@/lib/db/queries';
import { DisclaimerModal } from '@/components/DisclaimerModal';
import { setSetting } from '@/lib/db/queries';
import { Colors } from '@/constants/colors';

function TabIcon({
  label,
  focused,
  glyph,
}: {
  label: string;
  focused: boolean;
  glyph: string;
}) {
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.glyph, focused && styles.glyphActive]}>{glyph}</Text>
      <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const [disclaimerVisible, setDisclaimerVisible] = useState(false);

  useEffect(() => {
    // Check whether user has seen the disclaimer and completed onboarding.
    (async () => {
      const onboarded = await getSetting('onboarding_complete');
      const disclaimerSeen = await getSetting('disclaimer_seen');

      if (!onboarded) {
        router.replace('/onboarding');
        return;
      }
      if (!disclaimerSeen) {
        setDisclaimerVisible(true);
      }
    })();
  }, []);

  const handleAcceptDisclaimer = async () => {
    await setSetting('disclaimer_seen', 'true');
    setDisclaimerVisible(false);
  };

  return (
    <>
      <DisclaimerModal
        visible={disclaimerVisible}
        onAccept={handleAcceptDisclaimer}
      />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="chat"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon label="Chat" focused={focused} glyph="💬" />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon label="History" focused={focused} glyph="📈" />
            ),
          }}
        />
        <Tabs.Screen
          name="lessons"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon label="Learn" focused={focused} glyph="📖" />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon label="Settings" focused={focused} glyph="⚙️" />
            ),
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    height: 80,
    paddingBottom: 12,
    paddingTop: 8,
  },
  iconWrap: { alignItems: 'center', gap: 2 },
  glyph: { fontSize: 22, opacity: 0.5 },
  glyphActive: { opacity: 1 },
  label: { fontSize: 10, color: Colors.textMuted },
  labelActive: { color: Colors.primary, fontWeight: '600' },
});
