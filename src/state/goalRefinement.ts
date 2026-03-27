export interface GoalSuggestionDraft {
  suggestedText: string;
  rationaleShort: string;
}

const collapseWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

export const buildGoalRefinementSuggestions = (goalText: string): GoalSuggestionDraft[] => {
  const normalized = collapseWhitespace(goalText);
  if (!normalized) return [];
  const lower = normalized.toLowerCase();
  const suggestions: GoalSuggestionDraft[] = [];

  const add = (suggestedText: string, rationaleShort: string) => {
    const trimmed = collapseWhitespace(suggestedText);
    if (!trimmed) return;
    if (trimmed.toLowerCase() === lower) return;
    if (suggestions.some((entry) => entry.suggestedText.toLowerCase() === trimmed.toLowerCase())) return;
    suggestions.push({ suggestedText: trimmed, rationaleShort });
  };

  if (lower.includes('work')) {
    add(`${normalized} (especially on workdays).`, 'Keeps your wording and lightly clarifies context.');
  }

  if (lower.includes('move') || lower.includes('walk') || lower.includes('sit')) {
    add(`${normalized} (more consistently during the day).`, 'Keeps your voice and clarifies cadence.');
  }

  if (lower.includes('lunch') || lower.includes('meal') || lower.includes('food') || lower.includes('eat')) {
    add(`${normalized} (with simpler weekday meals).`, 'Keeps intent while making the wording easier to act on.');
  }

  if (lower.includes('sluggish') || lower.includes('energy') || lower.includes('tired') || lower.includes('exhausted')) {
    add(`${normalized} (so energy feels steadier through the day).`, 'Keeps your wording and clarifies desired outcome.');
  }

  if (!suggestions.length) {
    add(`${normalized} (in a way that feels manageable this week).`, 'Keeps your meaning while gently clarifying scope.');
  }

  return suggestions.slice(0, 3);
};
