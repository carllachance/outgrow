export const onboardingCopy = {
  stepOne: {
    heading: 'What are you trying to outgrow, or what would you like to feel easier?',
    helper: 'This can be meals, movement, sleep, reminders, snacks, routines, or one small habit.',
    placeholder: 'I want a short evening walk most days so I feel less stuck after work.',
    refinementIntro: 'Want an optional rewrite that keeps your meaning and voice?',
    refinementCta: 'Use this wording'
  },
  stepTwo: {
    heading: 'What would help next?',
    helper: 'Choose what feels right to start.',
    options: {
      stayOnTrack: 'Help me stay on track',
      buildFramework: 'Help me build a framework',
      startSimple: 'I’ll start simple'
    }
  }
} as const;

export type OnboardingFrameworkChoice = keyof typeof onboardingCopy.stepTwo.options;
