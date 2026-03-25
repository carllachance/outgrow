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

function templatesFor(agentType, scenario, variant) {
  const mentionsTimeline = /week|month|timeline|wedding|trip|travel/i.test(scenario);
  const mentionsSetback = /miss|skip|hard|drift|overeat|setback/i.test(scenario);

  const map = {
    summary: [
      `This week had both stability and friction. You held parts of your routine, and the drift points were specific: ${scenario.slice(0, 80)}. A practical next move is to protect one anchor meal and one low-friction activity tomorrow.`,
      `This looked like a harder week, not a failed one. Your data suggests energy and schedule load were the main constraints. For the next ${mentionsTimeline ? '7 days' : 'few days'}, focus on a short reset: repeat one dependable meal pattern and reduce decision load at dinner.`,
      `Mixed signal week: effort stayed present while conditions changed. The useful takeaway is not intensity, it is consistency in small anchors. If you want, we can define a two-step plan for tomorrow morning and dinner.`,
    ],
    reflection: [
      `Signal: your routine holds until a predictable stress window. Pattern: decision fatigue appears late in the day. Practical implication: pre-commit a default evening option so tired moments require less negotiation.`,
      `Clear signal: the challenge is context-driven, not character-driven. Likely pattern: transitions (work to home, social to solo) loosen structure. Practical implication: place one transition cue (snack + 5 minute pause) before dinner decisions.`,
      `What stands out is repeatability. You are noticing the same friction point, which is useful. A grounded next step is to script one response for that exact moment and test it for three days.`,
    ],
    nudge: [
      `Small, steady, and specific today. Choose one meal anchor and let that be enough.`,
      `You do not need a perfect day. Build one calm decision in the next hour.`,
      `Keep it gentle: reduce one point of friction and protect your energy.`,
    ],
    chef: [
      `Try a 3-meal rotation: sheet-pan salmon + frozen veg, chickpea pasta with spinach and pesto, and egg-fried rice with pre-cut vegetables. All are quick and reusable for leftovers.`,
      `Low-friction options: rotisserie chicken wraps, lentil soup + toast + side salad, and tofu stir-fry with microwave rice. Keep a two-sauce system so flavors vary without extra prep.`,
      `Refinement pass: pick one protein base, one fiber side, and one shortcut carb each night. Example: turkey meatballs, bagged salad, and microwave potatoes.`,
    ],
    onboarding: [
      `Start with a minimum viable week: two repeat breakfasts, one default lunch, and one flexible dinner template. Success metric is repeatability, not intensity.`,
      `Given your schedule variability, use a tiered plan: ideal day, busy day, and recovery day. This preserves momentum without all-or-nothing pressure.`,
      `For week one, keep logging lightweight and focus on one daily anchor habit. Build confidence through completion, then expand.`,
    ],
    reentry: [
      `Re-entry works best when friction is low. Day 1: restore one routine meal. Day 2: add a short planning check-in. Day 3: reintroduce movement at an easy baseline.`,
      `Treat this as continuation, not restart. Your next week can center on predictable defaults and gentle tracking. The goal is stability before ambition.`,
      `A practical re-entry plan: choose two “always available” meals, one grocery reset, and one bedtime boundary. That gives structure without overload.`,
    ],
    shopping: [
      `Build a 4-day basket: proteins (eggs, chicken thighs, Greek yogurt), produce (spinach, peppers, apples), carbs (rice, oats, tortillas), and convenience supports (frozen veg, canned beans).`,
      `No-cook leaning list: rotisserie chicken, hummus, whole-grain wraps, salad kits, microwave grains, cottage cheese, berries, nuts. Pair items into repeatable lunches and snacks.`,
      `Budget structure: 2 proteins, 3 vegetables, 2 fruits, 2 starches, 2 flavor boosters. This keeps costs predictable while supporting flexible meals.`,
    ],
    inspire: [
      `Progress can be quiet and still meaningful. The fact that you are observing patterns and returning to intention is real forward motion.`,
      `You are building a steadier relationship with effort, not chasing perfect outcomes. That usually lasts longer and feels better to live inside.`,
      `A grounded reminder: your trajectory is shaped by repeated small choices, especially on ordinary days. Ordinary days count.`,
    ],
  };

  const options = map[agentType] || map.summary;
  let response = options[variant % options.length];

  if (mentionsSetback && variant === 1) {
    response += ' Setbacks are information, so keep the next action simple and concrete.';
  }

  return response;
}

export function generateCandidates(agentType, scenario, count = 3) {
  const base = scenario.length + agentType.length;

  return LABELS.slice(0, count).map((label, idx) => {
    const outputText = templatesFor(agentType, scenario, idx);
    const autoScores = scorePrefill(base + idx * 17);
    return {
      id: `${agentType}-${idx}-${base}`,
      label,
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
