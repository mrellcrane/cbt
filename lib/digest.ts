import * as Notifications from 'expo-notifications';
import { getConversationPatterns } from './insights';
import { computeDistortionStats } from './distortions';
import { getSetting, setSetting } from './db/queries';

const DIGEST_ID_KEY = 'digest_notif_id';
const DIGEST_ENABLED_KEY = 'digest_enabled';

// Composes a short, warm summary of the past week's thinking patterns from the
// locally-stored conversation insights. Deterministic and offline: notification
// content is fixed at schedule time, so this must not depend on the network.

export interface WeeklyDigest {
  title: string;
  body: string;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function buildWeeklyDigest(): Promise<WeeklyDigest> {
  const convo = await getConversationPatterns(7);
  const topDistortion =
    computeDistortionStats(convo.distortionStrings).stats[0]?.name;
  const topEmotion = convo.emotions[0]?.name;
  const topTopic = convo.topics[0]?.name;

  const hasSignal =
    convo.analyzedCount > 0 && Boolean(topDistortion || topEmotion || topTopic);

  if (!hasSignal) {
    return {
      title: 'A moment to reflect',
      body: "It's been a quiet week here. Open Ember whenever you'd like to talk something through.",
    };
  }

  let body = '';
  if (topDistortion) {
    body += `Your thinking leaned toward ${topDistortion.toLowerCase()} this week. `;
  }
  const tail: string[] = [];
  if (topEmotion) tail.push(`${topEmotion.toLowerCase()} came up most`);
  if (topTopic) tail.push(`often around ${topTopic.toLowerCase()}`);
  if (tail.length > 0) body += cap(tail.join(', ')) + '. ';
  body += 'Tap to see your patterns.';

  return { title: 'Your week in patterns', body };
}

// ── Scheduling ────────────────────────────────────────────────────────────────
// The weekly digest is a LOCAL notification (all data is on-device). These
// helpers are called both at startup (to keep the content fresh) and from
// Settings (to honor the on/off toggle). Default is enabled.

export async function isDigestEnabled(): Promise<boolean> {
  return (await getSetting(DIGEST_ENABLED_KEY)) !== 'off';
}

export async function cancelWeeklyDigest(): Promise<void> {
  const prevId = await getSetting(DIGEST_ID_KEY);
  if (prevId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(prevId);
    } catch {
      // already fired or gone
    }
    await setSetting(DIGEST_ID_KEY, '');
  }
}

// Reschedule the weekly digest (Sunday ~7pm) with freshly computed content.
// No-ops when the toggle is off or notifications aren't permitted.
export async function scheduleWeeklyDigest(): Promise<void> {
  try {
    if (!(await isDigestEnabled())) {
      await cancelWeeklyDigest();
      return;
    }
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return; // PushRegistration handles asking

    await cancelWeeklyDigest();

    const digest = await buildWeeklyDigest();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: digest.title,
        body: digest.body,
        data: { type: 'digest' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // 1 = Sunday
        hour: 19,
        minute: 0,
      },
    });
    await setSetting(DIGEST_ID_KEY, id);
  } catch {
    // Best-effort — never block on this.
  }
}

export async function setDigestEnabled(enabled: boolean): Promise<void> {
  await setSetting(DIGEST_ENABLED_KEY, enabled ? 'on' : 'off');
  if (enabled) {
    await scheduleWeeklyDigest();
  } else {
    await cancelWeeklyDigest();
  }
}
