import Constants from 'expo-constants';

// React Native's fetch requires absolute URLs — a bare '/api/...' won't resolve
// on-device. Expo Router embeds the deployed server origin in the app config
// (extra.router.origin); we read it and prepend it to every API call. The
// hardcoded fallback is the EAS Hosting deployment, so it works even if the
// embedded value is ever missing.
const embeddedOrigin = (Constants.expoConfig?.extra as any)?.router?.origin as
  | string
  | undefined;

export const API_BASE = (embeddedOrigin && embeddedOrigin.startsWith('http')
  ? embeddedOrigin
  : 'https://cbt-companion.expo.app'
).replace(/\/$/, '');

export function apiUrl(path: string): string {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}
