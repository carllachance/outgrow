const normalizeGoal = (goalText: string) => goalText.trim().toLowerCase();

export const inferStartingPointOptions = (goalText: string): string[] => {
  const normalized = normalizeGoal(goalText);
  const deferred = "I'll decide after I get started";

  if (!normalized) {
    return ['Pick one tiny next step you can repeat this week', deferred];
  }

  if (normalized.includes('sleep') || normalized.includes('bed') || normalized.includes('rest')) {
    return ['Set one consistent wind-down or bedtime cue this week', 'Keep your sleep goal visible with one reminder', deferred];
  }

  if (normalized.includes('walk') || normalized.includes('move') || normalized.includes('exercise')) {
    return ['Choose one realistic movement window this week', 'Set one backup movement option for busy days', deferred];
  }

  if (normalized.includes('meal') || normalized.includes('lunch') || normalized.includes('dinner') || normalized.includes('snack')) {
    return ['Choose one easy meal pattern you can repeat this week', 'Set one fallback food option for busy days', deferred];
  }

  if (normalized.includes('remind') || normalized.includes('routine') || normalized.includes('habit')) {
    return ['Pick one cue that makes this easier to remember', 'Choose one minimum version you can do on busy days', deferred];
  }

  return ['Pick one tiny next step you can repeat this week', 'Choose one backup option for busy days', deferred];
};
