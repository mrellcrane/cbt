// Patterns that trigger the crisis intercept.
// Kept broad enough to catch intent without being hair-trigger.
const CRISIS_PATTERNS = [
  /\bsuicid(e|al|ally)\b/i,
  /\bkill\s+(my)?self\b/i,
  /\bend\s+my\s+life\b/i,
  /\bwant\s+to\s+die\b/i,
  /\bnot\s+want\s+to\s+(be\s+)?alive\b/i,
  /\bself[- ]?harm\b/i,
  /\bcut(ting)?\s+(my)?self\b/i,
  /\bhurt(ing)?\s+(my)?self\b/i,
  /\boverdose\b/i,
  /\babuse\b/i,
  /\bbeing\s+(hit|hurt|beaten|abused)\b/i,
  /\bin\s+crisis\b/i,
  /\bemergency\b/i,
];

export function detectCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((re) => re.test(text));
}
