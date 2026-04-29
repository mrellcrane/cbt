import '../global.css';
import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/lib/auth/AuthContext';
import { getSetting } from '@/lib/db/queries';
import { Colors } from '@/constants/colors';

SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    SplashScreen.hideAsync();

    if (!session) {
      router.replace('/auth/login');
      return;
    }

    getSetting('onboarding_complete').then((done) => {
      if (!done || done === 'false') {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)/chat');
      }
    });
  }, [session, isLoading]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutInner />
    </AuthProvider>
  );
}
