import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onboardingCopy } from '../content/onboardingCopy';
import { useStore } from '../state/AppStoreContext';
import { buildGoalRefinementSuggestions } from '../state/goalRefinement';
import { inferStartingPointOptions } from '../state/onboardingStartingPoints';

const supportStyleOptions = [
  { value: 'Active', label: 'Coach me actively' },
  { value: 'Maintenance', label: 'Keep it steady and light-touch' },
  { value: 'Just in Case', label: 'Only when I ask' }
] as const;

export const OnboardingScreen = () => {
  const {
    state,
    updateOnboarding,
    setGoalText,
    addPlanItem
  } = useStore();
  const navigate = useNavigate();
  const activeStep = state.onboarding.activeStep;
  const totalSteps = 3;
  const [goalDraft, setGoalDraft] = useState(state.goal?.active_display_text ?? '');
  const [selectedStartingPoint, setSelectedStartingPoint] = useState('');
  const [weeklyPlanDraft, setWeeklyPlanDraft] = useState('');

  const goToStep = (step: 1 | 2 | 3) => {
    updateOnboarding({ activeStep: step });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setGoalText(goalDraft, 'migration');
    if (selectedStartingPoint.trim()) {
      addPlanItem(selectedStartingPoint, 'routine', 'onboarding_seeded');
    }
    if (weeklyPlanDraft.trim()) {
      addPlanItem(weeklyPlanDraft, 'routine', 'onboarding_seeded');
    }
    updateOnboarding({ hasCompleted: true, activeStep: 3 });
    navigate('/today');
  };

  const visibleGoalSuggestions = useMemo(() => buildGoalRefinementSuggestions(goalDraft), [goalDraft]);
  const startingPointOptions = useMemo(() => inferStartingPointOptions(goalDraft), [goalDraft]);

  return (
    <div className="screen onboarding-screen">
      {activeStep > 1 ? (
        <div className="onboarding-progress" aria-live="polite">
          Step {activeStep} of {totalSteps}
        </div>
      ) : null}
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
          {visibleGoalSuggestions.length ? (
            <div>
              <p>{onboardingCopy.stepOne.refinementIntro}</p>
              <div className="stack compact">
                {visibleGoalSuggestions.map((suggestion) => (
                  <div key={suggestion.suggestedText}>
                    <p><strong>{suggestion.suggestedText}</strong></p>
                    <p>{suggestion.rationaleShort}</p>
                    <button
                      type="button"
                      onClick={() => setGoalDraft(suggestion.suggestedText)}
                    >
                      {onboardingCopy.stepOne.refinementCta}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <button
            type="button"
            className="primary-cta"
            onClick={() => {
              setGoalText(goalDraft, 'migration');
              goToStep(2);
            }}
          >
            Continue
          </button>
        </section>
        ) : null}

        {activeStep === 2 ? (
          <section className="chapter" aria-labelledby="onboarding-friction-step">
          <p className="panel-kicker">Step two</p>
          <h2 id="onboarding-friction-step">{onboardingCopy.stepTwo.heading}</h2>
          <p>{onboardingCopy.stepTwo.helper}</p>
          <div className="choices">
            <button
              type="button"
              className={`choice-chip ${state.onboarding.frameworkChoice === 'stayOnTrack' ? 'active' : ''}`}
              onClick={() => updateOnboarding({ frameworkChoice: 'stayOnTrack' })}
            >
              {onboardingCopy.stepTwo.options.stayOnTrack}
            </button>
            <button
              type="button"
              className={`choice-chip ${state.onboarding.frameworkChoice === 'buildFramework' ? 'active' : ''}`}
              onClick={() => updateOnboarding({ frameworkChoice: 'buildFramework' })}
            >
              {onboardingCopy.stepTwo.options.buildFramework}
            </button>
            <button
              type="button"
              className={`choice-chip ${state.onboarding.frameworkChoice === 'startSimple' ? 'active' : ''}`}
              onClick={() => updateOnboarding({ frameworkChoice: 'startSimple' })}
            >
              {onboardingCopy.stepTwo.options.startSimple}
            </button>
          </div>
          <div className="inline-actions">
            <button type="button" onClick={() => goToStep(1)}>Back</button>
            <button type="button" className="primary-cta" onClick={() => goToStep(3)}>Continue</button>
          </div>
        </section>
        ) : null}

        {activeStep === 3 ? (
          <section className="chapter" aria-labelledby="onboarding-support-style-step">
          <p className="panel-kicker">Step three</p>
          <h2 id="onboarding-support-style-step">
            {state.onboarding.frameworkChoice === 'buildFramework'
              ? 'Let’s build a small realistic framework for this week.'
              : state.onboarding.frameworkChoice === 'stayOnTrack'
                ? 'Let’s keep you on track with one grounded starting move.'
                : 'Start simple with one small step you can revisit anytime.'}
          </h2>
          <p>Short, grounded, and built for real planning.</p>
          <div className="choices">
            {supportStyleOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`choice-chip ${state.onboarding.supportTier === option.value ? 'active' : ''}`}
                onClick={() => updateOnboarding({ supportTier: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="inline-actions">
            <button type="button" onClick={() => goToStep(2)}>Back</button>
          </div>
          <h3 id="onboarding-focus-step">Practical starting point this week</h3>
          <div className="choices">
            {startingPointOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`choice-chip ${selectedStartingPoint === option ? 'active' : ''}`}
                onClick={() => setSelectedStartingPoint(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <textarea
            value={weeklyPlanDraft}
            onChange={(e) => setWeeklyPlanDraft(e.target.value)}
            placeholder="This week I’ll plan two easy dinners before my busiest days and keep one fallback meal ready."
          />
          <button type="button" onClick={() => goToStep(2)}>Back</button>
          <button className="primary-cta" type="submit">
            Enter Today
          </button>
        </section>
        ) : null}
      </form>
    </div>
  );
};
