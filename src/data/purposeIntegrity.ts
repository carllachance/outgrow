const HIGH_RISK_PATTERNS = [
  /punish/i,
  /starve|skip meals/i,
  /shame|humiliate/i,
  /compare.*body|body.*compare/i,
  /obsess|compulsive|track every/i,
  /worthless|disgusting/i,
  /self-harm|hurt myself/i
];

const MODERATE_RISK_PATTERNS = [
  /guilt|guilty/i,
  /control every/i,
  /failure/i,
  /binge.*compensate|compensate.*binge/i
];

const BLOCKED_RESPONSE =
  'This app is for supportive reflection, not punishment or harmful control. Try naming one kind next step instead.';

export type IntegrityResult = {
  status: 'allow' | 'review' | 'block';
  message: string;
};

export const evaluatePurposeIntegrity = (input: string): IntegrityResult => {
  const trimmed = input.trim();
  if (!trimmed) {
    return { status: 'review', message: 'Please add a little more detail before sharing.' };
  }

  if (HIGH_RISK_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return { status: 'block', message: BLOCKED_RESPONSE };
  }

  if (MODERATE_RISK_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return {
      status: 'review',
      message: 'Thanks for sharing. We saved this privately and did not publish it to protect community wellbeing.'
    };
  }

  return { status: 'allow', message: '' };
};

export const sanitizeForShare = (input: string) => input.trim().replace(/\s+/g, ' ').slice(0, 220);
