import '../global.css';
import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useDatabase } from '@/hooks/useDatabase';
import { Colors } from '@/constants/colors';
import { VersionBadge } from '@/components/VersionBadge';
import { UpdateBanner } from '@/components/UpdateBanner';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isReady } = useDatabase();

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync();
  }, [isReady]);

  if (!isReady) {
    return (
      <View
        style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}
      >
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="driving" options={{ animation: 'fade' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <VersionBadge />
      <UpdateBanner />
    </>
  );
}
