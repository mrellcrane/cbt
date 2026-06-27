import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { getSetting, setSetting } from '@/lib/db/queries';
import { apiUrl } from '@/lib/api';

// Show notifications while the app is foregrounded too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Registers this device for push so the developer can notify the user when a
// new OTA update ships. Gets the Expo push token and sends it to the server
// (which records it) only when it's new, to avoid duplicate registrations.
export function PushRegistration() {
  useEffect(() => {
    (async () => {
      try {
        if (!Device.isDevice) return; // push only works on physical devices

        const existing = await Notifications.getPermissionsAsync();
        let granted = existing.granted;
        if (!granted) {
          const req = await Notifications.requestPermissionsAsync();
          granted = req.granted;
        }
        if (!granted) return;

        const projectId = (Constants.expoConfig?.extra as any)?.eas?.projectId;
        if (!projectId) return;
        const token = (await Notifications.getExpoPushTokenAsync({ projectId }))
          .data;

        const last = await getSetting('push_token');
        if (token && token !== last) {
          const res = await fetch(apiUrl('/api/register-push'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token,
              platform: Platform.OS,
              appVersion: Constants.expoConfig?.version ?? '',
            }),
          });
          if (res.ok) await setSetting('push_token', token);
        }
      } catch {
        // Best-effort — notifications should never block app startup.
      }
    })();
  }, []);

  return null;
}
