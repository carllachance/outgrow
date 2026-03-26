const HIGH_RISK_PATTERNS = [
  /\bdiagnos(e|is|ing)\b/i,
  /\btreat(ment|ing)?\b/i,
  /\bmed(ication|s)?\b|\bdos(e|age)\b/i,
  /\bpunish|penance|make up for\b/i,
  /\bstarve|skip meals|fast (for|to)\b/i,
  /\bshame|humiliat(e|ing)|fat[- ]?sham(e|ing)\b/i,
  /\bbinge.*compensat(e|ing)|compensat(e|ing).*(binge|eat)\b/i,
  /\bdeterministic|my wearable says|watch says i must\b/i,
  /\bworthless|disgusting\b/i,
  /\bself-harm|hurt myself\b/i
];

const ELEVATED_RISK_PATTERNS = [
  /\bguilt|guilty\b/i,
  /\bcontrol every\b/i,
  /\bfailure\b/i,
  /\bovereat|binge\b/i,
  /\bburn it off|earn(ed)? food\b/i,
  /\bscale ruined my day|weight ruined my day\b/i
];

const POST_CHECK_RED_FLAGS = [
  /\bpunish|penalty|pay for\b/i,
  /\brestrict|cut out all|no food\b/i,
  /\byou should be ashamed|you failed\b/i,
  /\bthis definitely means|certainly indicates\b/i,
  /\bi'm all you need|don't talk to anyone else\b/i
];

const BLOCKED_RESPONSE =
  'I can’t help with punishment, restriction, diagnosis, medication, or compensatory advice. Let’s choose one gentle, safe next step.';

const REVIEW_RESPONSE =
  'Thanks for sharing this. I can only offer supportive, non-medical guidance. Let’s keep this to one kind and practical next step.';

export type RiskCategory =
  | 'medical'
  | 'compensatory'
  | 'shame_or_punishment'
  | 'dependency_or_deterministic'
  | 'none';

export type RiskLevel = 'low' | 'elevated' | 'high';
export type SafetyTier = 0 | 1 | 2 | 3;

export type IntegrityResult = {
  status: 'allow' | 'review' | 'block';
  message: string;
};

export type RiskClassification = {
  riskLevel: RiskLevel;
  category: RiskCategory;
  requiresConstrainedPolicy: boolean;
};

export type PostGenerationCheck = {
  isSafe: boolean;
  reasons: string[];
};

export const classifyHealthRisk = (input: string): RiskClassification => {
  const trimmed = input.trim();
  if (!trimmed) {
    return { riskLevel: 'elevated', category: 'none', requiresConstrainedPolicy: true };
  }

  if (/\bdiagnos(e|is|ing)|treat(ment|ing)?|med(ication|s)?|dos(e|age)\b/i.test(trimmed)) {
    return { riskLevel: 'high', category: 'medical', requiresConstrainedPolicy: true };
  }

  if (/\bbinge.*compensat(e|ing)|compensat(e|ing).*(binge|eat)|burn it off|earn(ed)? food\b/i.test(trimmed)) {
    return { riskLevel: 'high', category: 'compensatory', requiresConstrainedPolicy: true };
  }

  if (/\bpunish|penance|starve|skip meals|shame|humiliat(e|ing)|fat[- ]?sham(e|ing)\b/i.test(trimmed)) {
    return { riskLevel: 'high', category: 'shame_or_punishment', requiresConstrainedPolicy: true };
  }

  if (/\bmy wearable says i must|deterministic|i only need this app|don't leave me\b/i.test(trimmed)) {
    return { riskLevel: 'high', category: 'dependency_or_deterministic', requiresConstrainedPolicy: true };
  }

  if (ELEVATED_RISK_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return { riskLevel: 'elevated', category: 'none', requiresConstrainedPolicy: true };
  }

  return { riskLevel: 'low', category: 'none', requiresConstrainedPolicy: false };
};

const TIER3_PATTERNS = [
  /\bself-harm|hurt myself|kill myself|suicid(e|al)\b/i,
  /\bpurge|throw up food|starve myself\b/i,
  /\bno food for \d+|zero calories\b/i,
  /\bpunish me|be harsh|tough love|humiliate me\b/i
];

const TIER2_PATTERNS = [
  /\bearn food|burn it off|make up for eating\b/i,
  /\bcheck every hour|log everything|never miss tracking\b/i,
  /\bi need this app to control me|don't let me stop\b/i
];

const TIER1_PATTERNS = [
  /\bguilt|guilty|bad day|failed day\b/i,
  /\bperfect streak|all or nothing\b/i,
  /\bcompare myself\b/i
];

export const detectSafetyTier = (input: string): SafetyTier => {
  const trimmed = input.trim();
  if (!trimmed) return 0;
  if (TIER3_PATTERNS.some((pattern) => pattern.test(trimmed))) return 3;
  if (TIER2_PATTERNS.some((pattern) => pattern.test(trimmed))) return 2;
  if (TIER1_PATTERNS.some((pattern) => pattern.test(trimmed))) return 1;
  return 0;
};

export const runPostGenerationSafetyCheck = (output: string): PostGenerationCheck => {
  const reasons = POST_CHECK_RED_FLAGS.filter((pattern) => pattern.test(output)).map((pattern) => pattern.source);
  return { isSafe: reasons.length === 0, reasons };
};

export const evaluatePurposeIntegrity = (input: string): IntegrityResult => {
  const trimmed = input.trim();
  if (!trimmed) {
    return { status: 'review', message: 'Please add a little more detail before sharing.' };
  }

  if (HIGH_RISK_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return { status: 'block', message: BLOCKED_RESPONSE };
  }

  if (ELEVATED_RISK_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return { status: 'review', message: REVIEW_RESPONSE };
  }

  return { status: 'allow', message: '' };
};

export const sanitizeForShare = (input: string) => input.trim().replace(/\s+/g, ' ').slice(0, 220);
