import { scanBannedPhrases } from './bannedPhrases.js';

const SCORE_KEYS = [
  'toneFidelity',
  'specificity',
  'pressureDiscipline',
  'dignityPreservation',
  'practicalUsefulness',
  'inferenceDiscipline',
  'creepinessRisk',
];

const LABELS = ['A', 'B', 'C'];

const STYLE_PROFILES = {
  summary: [
    { key: 'restrained', label: 'Restrained', descriptor: 'calm and concise synthesis' },
    { key: 'warmer', label: 'Warmer', descriptor: 'supportive and human-forward' },
    { key: 'perspective', label: 'Perspective-driven', descriptor: 'zoomed out and meaning-first' },
  ],
  chef: [
    { key: 'simple', label: 'Simplest practical', descriptor: 'lowest friction execution' },
    { key: 'leftovers', label: 'Leftovers-first', descriptor: 'reuse and batch leverage' },
    { key: 'fresh', label: 'Slightly fresher', descriptor: 'more produce-forward while practical' },
  ],
  inspire: [
    { key: 'grounded', label: 'Grounded', descriptor: 'steady and realistic encouragement' },
    { key: 'elegant', label: 'Elegant', descriptor: 'graceful and reflective framing' },
    { key: 'direct', label: 'More direct', descriptor: 'plainspoken momentum cue' },
  ],
  nudge: [
    { key: 'minimal', label: 'Very minimal', descriptor: 'one-line lightweight nudge' },
    { key: 'warmer', label: 'Slightly warmer', descriptor: 'gentle emotional validation' },
    { key: 'practical', label: 'More practical', descriptor: 'immediate next-step oriented' },
  ],
};

const DEFAULT_STYLES = [
  { key: 'observational', label: 'Observational', descriptor: 'pattern and signal focused' },
  { key: 'coaching', label: 'Coaching', descriptor: 'next-action guidance focused' },
  { key: 'structured', label: 'Structured', descriptor: 'organized checklist style' },
];

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffle(items, rng) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pick(items, rng) {
  return items[Math.floor(rng() * items.length)];
}

function seededValue(seed, min = 1, max = 5) {
  const raw = Math.abs(Math.sin(seed) * 10000);
  return Math.floor(raw % (max - min + 1)) + min;
}

function scorePrefill(seedBase) {
  return SCORE_KEYS.reduce((acc, key, i) => {
    acc[key] = seededValue(seedBase + i * 13);
    return acc;
  }, {});
}

function scenarioCues(scenario) {
  return {
    mentionsTimeline: /week|month|timeline|wedding|trip|travel/i.test(scenario),
    mentionsSetback: /miss|skip|hard|drift|overeat|setback/i.test(scenario),
    shortContext: scenario.trim().slice(0, 90),
  };
}

function buildAgentOutput(agentType, style, scenario, cues, rng) {
  if (agentType === 'summary') {
    const blocks = {
      restrained: [
        `This period shows mixed adherence, not collapse. Signal: ${cues.shortContext}. Next move: protect one meal anchor and one low-friction routine tomorrow.`,
        `Net read: some routines held while load increased. For the next ${cues.mentionsTimeline ? '7 days' : '3 days'}, simplify decisions by repeating one dependable lunch and one default dinner.`,
      ],
      warmer: [
        `You stayed engaged through a non-ideal week, which matters. The drift points were specific, so the reset can be specific too: one reliable meal pattern and one gentle structure cue tonight.`,
        `This was a hard stretch, not a character failure. Carry forward what already worked, then add one supportive boundary around your toughest time window.`,
      ],
      perspective: [
        `From a wider lens, this week is useful data: effort remained present while context shifted. The strategic takeaway is to reduce choice load at the exact moment friction appears.`,
        `Bigger picture: consistency is being built in uneven conditions. The leverage point is not intensity; it is a repeatable fallback plan for days like this.`,
      ],
    };
    return pick(blocks[style.key] || blocks.restrained, rng);
  }

  if (agentType === 'chef') {
    const blocks = {
      simple: [
        `3 quick dinners: (1) egg + veggie scramble with toast, (2) rotisserie chicken wraps + bagged salad, (3) chickpea pasta + jarred sauce + spinach. Keep prep under 20 minutes each.`,
        `Fast practical plan: sheet-pan sausage + frozen veg, lentil soup + toast, and tuna rice bowls with cucumber. Minimal chopping, easy cleanup.`,
      ],
      leftovers: [
        `Cook once, eat twice: night 1 taco chicken bowls, night 2 leftover bowl wraps; night 3 turkey chili, night 4 chili baked potatoes. Build dinners around intentional carryover.`,
        `Leftovers-first setup: tray of roasted vegetables + protein now, then reuse in grain bowls, omelets, and wraps over 2-3 meals.`,
      ],
      fresh: [
        `Slightly fresher rotation: lemon-herb salmon + snap peas, tofu stir-fry with peppers, and yogurt-marinated chicken bowls with cucumber-tomato salad. Keep one frozen shortcut each night.`,
        `Fresh-but-practical: shrimp + zucchini skillet, white bean tomato skillet with greens, and turkey lettuce bowls with microwave rice.`,
      ],
    };
    return pick(blocks[style.key] || blocks.simple, rng);
  }

  if (agentType === 'inspire') {
    const blocks = {
      grounded: [
        `You do not need a dramatic reinvention. Repeated ordinary choices are enough to keep momentum real.`,
        `Progress here is quiet but legitimate. Showing up again is evidence of direction, not starting over.`,
      ],
      elegant: [
        `Sustainable change is often subtle: a steadier tone with yourself, then steadier choices. That is real forward movement.`,
        `Your effort is becoming more measured and therefore more durable. There is dignity in that pace.`,
      ],
      direct: [
        `Keep this simple: do the next supportive action, then stop negotiating with yourself for today.`,
        `You already know the next right move. Execute one concrete step in the next hour and count the day as progress.`,
      ],
    };
    return pick(blocks[style.key] || blocks.grounded, rng);
  }

  if (agentType === 'nudge') {
    const blocks = {
      minimal: [
        `One steady choice now is enough.`,
        `Reset the next hour, not the whole life.`,
      ],
      warmer: [
        `Yesterday happened. Today can still be kind and structured.`,
        `You are allowed to take a gentle reset: one calm meal, one calm decision.`,
      ],
      practical: [
        `Practical reset: water, protein-forward meal, and a default dinner plan. Keep it boring and easy.`,
        `Next step sequence: pause 60 seconds, choose your simplest meal option, and protect bedtime.`,
      ],
    };
    return pick(blocks[style.key] || blocks.minimal, rng);
  }

  const generic = {
    observational: [
      `Signal: ${cues.shortContext}. Pattern is context-driven, so use one pre-committed default at the friction point.`,
      `Useful trend: effort is present but transitions create drift. Reduce decisions during that transition window.`,
    ],
    coaching: [
      `Action plan: choose one anchor behavior, schedule it once daily, and keep scope intentionally small for the next ${cues.mentionsTimeline ? 'week' : 'few days'}.`,
      `Next move: define a minimum viable version of the routine and repeat it before adding complexity.`,
    ],
    structured: [
      `Try this structure:\n1) Identify the repeat friction moment.\n2) Attach one default response.\n3) Review after 3 days and adjust gently.`,
      `Simple framework:\n- Keep: one thing already working.\n- Remove: one avoidable friction point.\n- Add: one realistic support cue.`,
    ],
  };

  return pick(generic[style.key] || generic.observational, rng);
}

function styleProfilesFor(agentType) {
  return STYLE_PROFILES[agentType] || DEFAULT_STYLES;
}

export function generateCandidates(agentType, scenario, count = 3, seedInput = Date.now()) {
  const seed = hashString(`${agentType}|${scenario}|${seedInput}`);
  const rng = createRng(seed);
  const cues = scenarioCues(scenario);
  const selectedStyles = shuffle(styleProfilesFor(agentType), rng).slice(0, count);

  return selectedStyles.map((style, idx) => {
    const outputText = buildAgentOutput(agentType, style, scenario, cues, rng);
    const autoScores = scorePrefill(seed + idx * 17);
    return {
      id: `${agentType}-${idx}-${seed}`,
      label: LABELS[idx],
      styleLabel: style.label,
      styleDescription: style.descriptor,
      outputText,
      bannedPhrases: scanBannedPhrases(outputText),
      autoScores,
      manualScores: { ...autoScores },
      notes: '',
      verdict: 'revise',
      preferred: false,
    };
  });
}

export { SCORE_KEYS };
