import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onboardingCopy } from '../content/onboardingCopy';
import { useStore } from '../state/AppStoreContext';
import { buildClarificationPrompt, seedFocusAreaLabels, shouldAskIntentClarification } from '../state/onboardingGrow';

export const OnboardingScreen = () => {
  const { state, updateOnboarding, completeOnboardingWithGrowthIntent } = useStore();
  const navigate = useNavigate();
  const [goalDraft, setGoalDraft] = useState(state.growthIntents.find((intent) => intent.active)?.rawText ?? state.goal?.active_display_text ?? '');
  const [clarificationChoice, setClarificationChoice] = useState('');

  const needsClarification = useMemo(() => shouldAskIntentClarification(goalDraft), [goalDraft]);
  const stepSequence: Array<1 | 2 | 3> = needsClarification ? [1, 2, 3] : [1, 3];
  const activeStep: 1 | 2 | 3 = stepSequence.includes(state.onboarding.activeStep)
    ? state.onboarding.activeStep
    : 3;
  const visibleStep = stepSequence.indexOf(activeStep) + 1;
  const suggestedFocusAreas = useMemo(() => seedFocusAreaLabels(goalDraft, clarificationChoice), [goalDraft, clarificationChoice]);
  const clarificationPrompt = useMemo(() => buildClarificationPrompt(goalDraft), [goalDraft]);
  const totalSteps = stepSequence.length;

  const goToStep = (step: 1 | 2 | 3) => {
    updateOnboarding({ activeStep: step });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = completeOnboardingWithGrowthIntent(goalDraft, clarificationChoice || undefined);
    if (!result.ok) return;
    navigate('/today');
  };

  return (
    <div className="screen onboarding-screen">
      <div className="onboarding-progress" aria-live="polite">
        Step {visibleStep} of {totalSteps}
      </div>
      <form onSubmit={onSubmit} className="stack">
        {activeStep === 1 ? (
          <section className="chapter" aria-labelledby="onboarding-step-one">
            <p className="panel-kicker">Step one</p>
            <h2 id="onboarding-step-one">{onboardingCopy.stepOne.heading}</h2>
            <textarea
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
              placeholder={onboardingCopy.stepOne.placeholder}
            />
            <p>{onboardingCopy.stepOne.helper}</p>
            <button
              type="button"
              className="primary-cta"
              onClick={() => {
                if (!goalDraft.trim()) return;
                goToStep(needsClarification ? 2 : 3);
              }}
            >
              Continue
            </button>
          </section>
        ) : null}

        {activeStep === 2 && needsClarification ? (
          <section className="chapter" aria-labelledby="onboarding-clarification-step">
            <p className="panel-kicker">Step two</p>
            <h2 id="onboarding-clarification-step">{clarificationPrompt.prompt}</h2>
            <p>{clarificationPrompt.helper}</p>
            <div className="choices">
              {clarificationPrompt.choices.map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  className={`choice-chip ${clarificationChoice === choice.value ? 'active' : ''}`}
                  onClick={() => setClarificationChoice(choice.value)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
            <div className="inline-actions">
              <button type="button" onClick={() => goToStep(1)}>Back</button>
              <button type="button" className="primary-cta" onClick={() => goToStep(3)}>
                {clarificationChoice ? 'Continue' : onboardingCopy.clarification.continueLabel}
              </button>
            </div>
          </section>
        ) : null}

        {activeStep === 3 ? (
          <section className="chapter" aria-labelledby="onboarding-focus-step">
            <p className="panel-kicker">{needsClarification ? 'Step three' : 'Step two'}</p>
            <h2 id="onboarding-focus-step">{onboardingCopy.focusAreas.heading}</h2>
            <p>{onboardingCopy.focusAreas.helper}</p>
            {suggestedFocusAreas.length ? (
              <div className="choices" aria-label="Suggested focus areas">
                {suggestedFocusAreas.map((area) => (
                  <span key={area} className="choice-chip active">{area}</span>
                ))}
              </div>
            ) : (
              <p>We’ll start with {onboardingCopy.focusAreas.fallback} and keep it simple.</p>
            )}
            <div className="inline-actions">
              <button type="button" onClick={() => goToStep(needsClarification ? 2 : 1)}>Back</button>
              <button className="primary-cta" type="submit">Start</button>
            </div>
          </section>
        ) : null}
      </form>
    </div>
  );
};
