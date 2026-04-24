export const Colors = {
  primary: '#4A9B8F',
  primaryLight: '#7FBFB8',
  primaryDark: '#2D7A70',
  background: '#F7F5F2',
  surface: '#FFFFFF',
  surfaceAlt: '#F0EDE8',
  text: '#2C2C3E',
  textSecondary: '#6B6B80',
  textMuted: '#9999AA',
  accent: '#E8A561',
  accentLight: '#F2C98A',
  danger: '#E05252',
  success: '#52B788',
  border: '#E0DDD8',
  bubbleUser: '#4A9B8F',
  bubbleBot: '#FFFFFF',
  bubbleUserText: '#FFFFFF',
  bubbleBotText: '#2C2C3E',
  // Mood gradient: 1 (red) → 5 (amber) → 10 (green)
  moodLow: '#E05252',
  moodMid: '#E8A561',
  moodHigh: '#52B788',
} as const;

export function moodColor(score: number): string {
  if (score <= 3) return Colors.moodLow;
  if (score <= 6) return Colors.moodMid;
  return Colors.moodHigh;
}
