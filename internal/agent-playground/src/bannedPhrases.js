export const BANNED_PHRASES = [
  'cheat',
  'off track',
  'back on track',
  'crush it',
  'perfect week',
  'stay disciplined',
  'no excuses',
  'self-sabotage',
  'poor impulse control',
  "don't ruin your progress",
  'we noticed you usually',
  'behind schedule',
  'missed target',
  'downgrade',
  'reduced plan',
];

export function scanBannedPhrases(text) {
  const normalized = (text || '').toLowerCase();
  return BANNED_PHRASES.filter((phrase) => normalized.includes(phrase));
}
