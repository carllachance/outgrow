export interface FrameworkCategorySuggestion {
  label: string;
  description: string;
}

interface Rule {
  label: string;
  description: string;
  terms: string[];
}

const RULES: Rule[] = [
  {
    label: 'Meals',
    description: 'Keep weekday meals simple and repeatable.',
    terms: ['lunch', 'meal', 'eat', 'food', 'takeout']
  },
  {
    label: 'Snacks',
    description: 'Add easy backup options before hunger spikes.',
    terms: ['snack', 'impulse', 'junk', 'garbage', 'craving']
  },
  {
    label: 'Movement',
    description: 'Set light movement prompts that fit your day.',
    terms: ['move', 'walk', 'activity', 'sit', 'exercise']
  },
  {
    label: 'Sleep',
    description: 'Support steadier energy with a consistent wind-down.',
    terms: ['sleep', 'rest', 'tired', 'exhausted', 'sluggish', 'energy']
  },
  {
    label: 'Routine',
    description: 'Lower friction with one predictable daily pattern.',
    terms: ['routine', 'consistent', 'follow-through', 'schedule', 'time']
  },
  {
    label: 'Friction reduction',
    description: 'Make good choices easier in your real environment.',
    terms: ['work', 'busy', 'environment', 'friction', 'harder']
  }
];

export const inferFrameworkFromGoal = (goalText: string): FrameworkCategorySuggestion[] => {
  const normalizedGoal = goalText.toLowerCase();
  if (!normalizedGoal.trim()) {
    return [{ label: 'Routine', description: 'Start with one repeatable action that lowers friction.' }];
  }

  const matches = RULES.filter((rule) => rule.terms.some((term) => normalizedGoal.includes(term)));
  if (!matches.length) {
    return [{ label: 'Routine', description: 'Start with one repeatable action that lowers friction.' }];
  }

  return matches.slice(0, 3).map((rule) => ({ label: rule.label, description: rule.description }));
};
