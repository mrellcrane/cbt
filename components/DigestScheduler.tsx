import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { scheduleWeeklyDigest } from '@/lib/digest';

// Keeps the weekly on-device "insight digest" notification scheduled and fresh.
// Reschedules on every launch (so the content reflects the latest week) and
// routes a tapped digest to the History/Patterns view. The actual scheduling
// rules (enabled toggle, permission, content) live in lib/digest.

export function DigestScheduler() {
  useEffect(() => {
    scheduleWeeklyDigest();

    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data as
        | { type?: string }
        | undefined;
      if (data?.type === 'digest') {
        router.push('/(tabs)/history');
      }
    });
    return () => sub.remove();
  }, []);

  return null;
}
