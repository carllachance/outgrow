import type { CompositionTag, MealContext, MealLogEntry, SafetyState } from '../types';

export interface WeeklyMealSummary {
  totalEntries: number;
  treatCount: number;
  heavyFeelCount: number;
  stressContextCount: number;
  proteinProduceConsistency: 'high' | 'medium' | 'low';
  dominantContexts: MealContext[];
  dominantCompositionThemes: CompositionTag[];
  lines: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

const getDominantValues = <T extends string>(counts: Map<T, number>, maxItems: number): T[] => {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, count], index, all) => index < maxItems && count > 0 && (index === 0 || count >= all[0][1] - 1))
    .map(([value]) => value);
};

export const canUseMealLogging = (safety: SafetyState) => safety.flags.tracking_enabled;
export const canViewMealHistory = (safety: SafetyState) => safety.flags.progress_visible;

export const buildWeeklyMealSummary = (entries: MealLogEntry[], nowIso: string = new Date().toISOString()): WeeklyMealSummary => {
  const now = Date.parse(nowIso);
  const weekEntries = entries.filter((entry) => {
    const timestamp = Date.parse(entry.timestamp);
    return Number.isFinite(timestamp) && now - timestamp >= 0 && now - timestamp < DAY_MS * 7;
  });

  const treatCount = weekEntries.filter((entry) => entry.eventType === 'treat').length;
  const heavyFeelCount = weekEntries.filter((entry) => entry.portionFeel === 'heavy').length;
  const stressContextCount = weekEntries.filter((entry) => entry.context === 'stress').length;
  const proteinProduceCount = weekEntries.filter((entry) => entry.compositionTags.includes('protein') && entry.compositionTags.includes('produce')).length;

  const contextCounts = weekEntries.reduce((acc, entry) => {
    if (entry.context) acc.set(entry.context, (acc.get(entry.context) ?? 0) + 1);
    return acc;
  }, new Map<MealContext, number>());

  const tagCounts = weekEntries.reduce((acc, entry) => {
    entry.compositionTags.forEach((tag) => acc.set(tag, (acc.get(tag) ?? 0) + 1));
    return acc;
  }, new Map<CompositionTag, number>());

  const proteinProduceRatio = weekEntries.length ? proteinProduceCount / weekEntries.length : 0;
  const proteinProduceConsistency: WeeklyMealSummary['proteinProduceConsistency'] = proteinProduceRatio >= 0.6
    ? 'high'
    : proteinProduceRatio >= 0.35
      ? 'medium'
      : 'low';

  const dominantContexts = getDominantValues(contextCounts, 2);
  const dominantCompositionThemes = getDominantValues(tagCounts, 3);

  const lines: string[] = [];
  lines.push(weekEntries.length > 0
    ? `You logged ${weekEntries.length} food moments this week. One honest entry is enough.`
    : 'No entries this week yet. One honest entry is enough to restart your pattern view.');

  if (treatCount > 0) {
    lines.push(`Treats showed up ${treatCount} time${treatCount === 1 ? '' : 's'} — part of a real week, not a problem to solve.`);
  }

  if (heavyFeelCount > 0) {
    lines.push(`${heavyFeelCount} entry${heavyFeelCount === 1 ? ' felt' : ' entries felt'} heavy. That is useful context, not a grade.`);
  }

  if (stressContextCount > 0) {
    lines.push(`Stress was named ${stressContextCount} time${stressContextCount === 1 ? '' : 's'}. Noticing that pattern helps you plan gentler defaults.`);
  }

  lines.push(
    proteinProduceConsistency === 'high'
      ? 'Protein + produce showed up consistently in your logs this week.'
      : proteinProduceConsistency === 'medium'
        ? 'Protein + produce appeared sometimes this week — a steady middle ground.'
        : 'Protein + produce showed up less often this week. Small adjustments can stay simple.'
  );

  if (dominantContexts.length) {
    lines.push(`Most common context${dominantContexts.length > 1 ? 's were' : ' was'} ${dominantContexts.join(' and ')}.`);
  }

  if (dominantCompositionThemes.length) {
    lines.push(`Common composition themes: ${dominantCompositionThemes.join(', ')}.`);
  }

  return {
    totalEntries: weekEntries.length,
    treatCount,
    heavyFeelCount,
    stressContextCount,
    proteinProduceConsistency,
    dominantContexts,
    dominantCompositionThemes,
    lines
  };
};
