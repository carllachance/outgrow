import { classifyHealthRisk, detectSafetyTier, runPostGenerationSafetyCheck, type RiskCategory } from './purposeIntegrity';
import { OUTGROW_AGENT_RESPONSE_CHECKLIST } from './agentInstructionPrompt';

const inspireLines = [
  'The pace can change without the progress disappearing.',
  'Better to keep it workable than make it stricter.',
  'Showing up counts, especially on ordinary days.',
  'You do not need to undo anything to begin again.',
  'Steady choices can be quiet and still be real.'
];

const LOW_RISK_RESPONSES = [
  'Let us make today smaller: pick one regular meal and one short check-in about how it felt.',
  'Try a gentle reset: water, a balanced plate, and one kind note to yourself tonight.',
  'Name one friction point and remove it before dinner tonight.',
  'Give yourself a low-pressure plan for the next 24 hours only.'
];

const APPROVED_REDIRECT_TEMPLATES: Record<RiskCategory, string> = {
  medical:
    'I can’t provide diagnosis or treatment advice. If you want, we can focus on a simple routine like regular meals, hydration, and a short reflection on what helps you feel steady.',
  compensatory:
    'I can’t help with compensatory eating or exercise. A safer next step is to pause, choose one balanced meal, and write one supportive sentence for yourself.',
  shame_or_punishment:
    'I can’t support shame, punishment, or restriction. Let’s switch to one gentle action: eat something steady, take one short walk for mood, and speak to yourself with respect.',
  dependency_or_deterministic:
    'I can’t interpret wearables as absolute rules or encourage dependence. We can use your data as a clue, then choose one flexible habit that feels sustainable today.',
  none:
    'Let’s keep this supportive and practical: pick one gentle step you can repeat today.'
};

export const getInspireLine = () => inspireLines[Math.floor(Math.random() * inspireLines.length)];

export const getHandResponse = (request: string) => {
  const tier = detectSafetyTier(request);
  if (tier >= 3) {
    return {
      response:
        'I can’t help with tracking or optimization right now. Let’s keep this to immediate safety and support: pause, breathe, and reach out to a trusted person or local crisis support if you might be in danger.',
      mode: 'supportive_redirective' as const,
      classification: classifyHealthRisk(request),
      checklist: OUTGROW_AGENT_RESPONSE_CHECKLIST
    };
  }

  if (tier === 2) {
    return {
      response:
        'I’m not going to intensify this. Let’s keep it simple: choose one grounding step (water, a regular meal, or a short pause) and step back from detailed tracking for now.',
      mode: 'supportive_redirective' as const,
      classification: classifyHealthRisk(request),
      checklist: OUTGROW_AGENT_RESPONSE_CHECKLIST
    };
  }

  const classification = classifyHealthRisk(request);
  const candidate =
    classification.requiresConstrainedPolicy || classification.riskLevel !== 'low'
      ? APPROVED_REDIRECT_TEMPLATES[classification.category]
      : LOW_RISK_RESPONSES[Math.floor(Math.random() * LOW_RISK_RESPONSES.length)];

  const postCheck = runPostGenerationSafetyCheck(candidate);
  if (!postCheck.isSafe) {
    return {
      response:
        'I want to keep this safe and kind. Let’s pause and choose one supportive next step you can do in the next hour.',
      mode: 'supportive_redirective' as const,
      classification,
      checklist: OUTGROW_AGENT_RESPONSE_CHECKLIST
    };
  }

  return {
    response: candidate,
    mode:
      classification.riskLevel === 'low' ? ('normal' as const) : ('supportive_redirective' as const),
    classification,
    checklist: OUTGROW_AGENT_RESPONSE_CHECKLIST
  };
};
