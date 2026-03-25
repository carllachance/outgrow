const inspireLines = [
  'The pace can change without the progress disappearing.',
  'Better to keep it workable than make it stricter.',
  'Showing up counts, especially on ordinary days.',
  'You do not need to undo anything to begin again.',
  'Steady choices can be quiet and still be real.'
];

const handResponses = [
  'Let us make today smaller: choose one meal anchor and keep it simple.',
  'Try a gentle reset: water, one balanced plate, and no post-game analysis.',
  'Name one friction point and remove it before dinner tonight.',
  'Give yourself a low-pressure plan for the next 24 hours only.'
];

export const getInspireLine = () => inspireLines[Math.floor(Math.random() * inspireLines.length)];

export const getHandResponse = () => handResponses[Math.floor(Math.random() * handResponses.length)];
