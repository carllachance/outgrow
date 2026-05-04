const BROAD_GOAL_PATTERNS = [
  /\bfeel better\b/,
  /\bhealthier habits?\b/,
  /\bmore present\b/,
  /\bmore consistency\b/,
  /\bconsisten[ct]\w*\b/,
  /\bbetter habits?\b/,
  /\bdo better\b/
];
const ACTION_CUE_PATTERN = /\b(stop|start|plan|prep|track|walk|eat|sleep|drink|move|stretch|cook|pack|practice|limit|reduce|increase)\b/;
const CONTEXT_CUE_PATTERN = /\b(daily|every day|weekdays|after|before|morning|evening|tonight|this week|at)\b/;

const DOMAIN_KEYWORDS: Array<{ label: string; patterns: RegExp[] }> = [
  { label: 'meals', patterns: [/\bmeal(s)?\b/, /\beat(ing)?\b/, /\bfood\b/] },
  { label: 'lunch', patterns: [/\blunch\b/] },
  { label: 'dinner', patterns: [/\bdinner\b/] },
  { label: 'breakfast', patterns: [/\bbreakfast\b/] },
  { label: 'snacks', patterns: [/\bsnack(s)?\b/] },
  { label: 'movement', patterns: [/\bmove(ment)?\b/, /\bwalk(ing)?\b/, /\bexercise\b/, /\bworkout\b/] },
  { label: 'sleep', patterns: [/\bsleep\b/, /\bbed(time)?\b/, /\brest\b/] },
  { label: 'routine', patterns: [/\broutine(s)?\b/, /\bhabit(s)?\b/, /\bconsisten[ct]\w*\b/] },
  { label: 'presence', patterns: [/\bpresent\b/, /\bmindful\b/, /\bpresence\b/] },
  { label: 'energy', patterns: [/\benergy\b/, /\btired\b/, /\bsluggish\b/, /\bexhausted\b/] },
  { label: 'after work', patterns: [/\bafter work\b/, /\bend of (the )?day\b/] },
  {
    label: 'remembering',
    patterns: [
      /\bremember(ing)?\b/,
      /\bkeep track\b/,
      /\blose track\b/,
      /\bdropping things\b/,
      /\bfollow(?:ing)?[ -]?through\b/,
      /\bfinish(?:ing)?\b/,
      /\bprocrastinat(?:e|ing|ion)\b/,
      /\bforget(ting)?\b/,
      /\bopen loops?\b/
    ]
  }
];

export interface ClarificationChoice {
  value: string;
  label: string;
}

export interface ClarificationPrompt {
  prompt: string;
  helper: string;
  choices: ClarificationChoice[];
}

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const matchDomains = (value: string): string[] => {
  const normalized = normalize(value);
  if (!normalized) return [];
  return DOMAIN_KEYWORDS
    .filter((domain) => domain.patterns.some((pattern) => pattern.test(normalized)))
    .map((domain) => domain.label);
};

export const shouldAskIntentClarification = (rawIntent: string): boolean => {
  const normalized = normalize(rawIntent);
  if (!normalized) return false;
  const isBroad = BROAD_GOAL_PATTERNS.some((pattern) => pattern.test(normalized));
  const matchedDomains = matchDomains(normalized);
  const hasDomainSignal = matchedDomains.length > 0;
  const hasActionCue = ACTION_CUE_PATTERN.test(normalized);
  const hasContextCue = CONTEXT_CUE_PATTERN.test(normalized);

  if (normalized.split(' ').length >= 9) return false;
  if (hasActionCue && hasDomainSignal) return false;
  if (hasActionCue && hasContextCue) return false;
  if (isBroad) return true;
  if (normalized.length < 24) return !hasActionCue && !hasDomainSignal;
  return false;
};

export const buildClarificationPrompt = (rawIntent: string): ClarificationPrompt => {
  const existingMatches = matchDomains(rawIntent);
  const primaryMatch = existingMatches[0];
  const relatedSuggestionsByDomain: Record<string, string[]> = {
    meals: ['lunch', 'routine', 'energy'],
    lunch: ['meals', 'routine', 'energy'],
    dinner: ['meals', 'routine', 'sleep'],
    breakfast: ['meals', 'energy', 'routine'],
    snacks: ['meals', 'routine', 'energy'],
    movement: ['movement', 'energy', 'routine'],
    sleep: ['sleep', 'energy', 'routine'],
    routine: ['routine', 'meals', 'sleep'],
    presence: ['presence', 'after work', 'routine'],
    energy: ['energy', 'sleep', 'meals'],
    'after work': ['after work', 'presence', 'routine'],
    remembering: ['remembering', 'routine', 'reminders']
  };
  const rememberingPrompt = /\bremember(ing)?\b|\bfollow[ -]?through\b|\bforget(ting)?\b/.test(normalize(rawIntent));
  if (rememberingPrompt) {
    return {
      prompt: 'Where do you feel the friction most often?',
      helper: 'Pick what feels closest right now. You can change this later.',
      choices: [
        { value: 'forgetting small things', label: 'Forgetting small things' },
        { value: 'starting but not finishing', label: 'Starting but not finishing' },
        { value: 'avoiding things until urgent', label: 'Avoiding until urgent' },
        { value: 'losing track when busy', label: 'Losing track when busy' },
        { value: 'needing better reminders', label: 'Needing better reminders' },
        { value: 'deciding what matters', label: 'Deciding what matters' }
      ]
    };
  }

  const candidateSuggestions = [
    ...existingMatches,
    ...(primaryMatch ? relatedSuggestionsByDomain[primaryMatch] ?? [] : []),
    'meals',
    'routine',
    'sleep'
  ];
  const suggestions = candidateSuggestions
    .filter((entry) => entry !== 'energy' || !existingMatches.includes('sleep'))
    .slice(0, 3);
  const dedupedSuggestions = Array.from(new Set(suggestions)).slice(0, 3);

  return {
    prompt: 'What would that look like in real life?',
    helper: 'If helpful, pick one area to start with. You can change this anytime.',
    choices: [...dedupedSuggestions.map((value) => ({ value, label: value })), { value: 'something_else', label: "I'd describe it differently" }]
  };
};

export const deriveRefinedIntentText = (rawIntent: string, clarificationValue: string): string | undefined => {
  const trimmedRaw = rawIntent.trim();
  if (!trimmedRaw) return undefined;
  const normalizedClarification = clarificationValue.trim().toLowerCase();
  if (!normalizedClarification || normalizedClarification === 'something_else') return undefined;
  if (normalize(trimmedRaw).includes(normalizedClarification)) return undefined;
  return `${trimmedRaw} (starting with ${normalizedClarification}).`;
};

export const seedFocusAreaLabels = (rawIntent: string, clarificationValue?: string): string[] => {
  const combined = [rawIntent, clarificationValue].filter(Boolean).join(' ');
  const normalized = normalize(combined);
  if (!normalized) return [];

  const seeded = matchDomains(combined);
  if (clarificationValue && clarificationValue !== 'something_else' && !seeded.includes(clarificationValue)) {
    seeded.unshift(clarificationValue);
  }

  if (!seeded.length && /\bbetter\b/.test(normalized)) {
    seeded.push('routine');
  }
  if (/(remembering|follow through|follow-through|forget)/.test(normalized)) {
    seeded.unshift('remembering');
  }

  return Array.from(new Set(seeded)).slice(0, 3);
};
