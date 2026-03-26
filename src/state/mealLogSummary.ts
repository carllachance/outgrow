import type { MealKind, MealLogEntry, SafetyState } from '../types';

export interface WeeklyMealSummary {
  totalEntries: number;
  lateAfternoonSnacks: number;
  lateNightSnacks: number;
  unknownTimeCount: number;
  dominantMealKinds: MealKind[];
  lines: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

const getDominantKinds = (counts: Map<MealKind, number>, maxItems: number): MealKind[] => {
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
    const createdAt = Date.parse(entry.createdAt);
    return Number.isFinite(createdAt) && now - createdAt >= 0 && now - createdAt < DAY_MS * 7;
  });

  const lateAfternoonSnacks = weekEntries.filter((entry) => entry.mealKind === 'snack' && /late afternoon/i.test(entry.softTimeLabel ?? '')).length;
  const lateNightSnacks = weekEntries.filter((entry) => entry.mealKind === 'snack' && /late night/i.test(entry.softTimeLabel ?? '')).length;
  const unknownTimeCount = weekEntries.filter((entry) => entry.timeMode === 'unknown').length;

  const mealKindCounts = weekEntries.reduce((acc, entry) => {
    const key = entry.mealKind ?? 'unknown';
    acc.set(key, (acc.get(key) ?? 0) + 1);
    return acc;
  }, new Map<MealKind, number>());

  const dominantMealKinds = getDominantKinds(mealKindCounts, 2);

  const lines: string[] = [];
  lines.push(weekEntries.length > 0
    ? `You logged ${weekEntries.length} food moments this week. Approximate logs still count.`
    : 'No entries this week yet. One quick note is enough to restart your pattern view.');

  if (lateAfternoonSnacks > 0) {
    lines.push(`Late afternoon snacking showed up ${lateAfternoonSnacks} time${lateAfternoonSnacks === 1 ? '' : 's'}.`);
  }

  if (lateNightSnacks > 0) {
    lines.push(`Late night snacking appeared ${lateNightSnacks} time${lateNightSnacks === 1 ? '' : 's'} this week.`);
  }

  if (unknownTimeCount > 0) {
    lines.push(`${unknownTimeCount} entr${unknownTimeCount === 1 ? 'y keeps' : 'ies keep'} time open-ended, which is completely okay.`);
  }

  if (dominantMealKinds.length > 0) {
    lines.push(`Most common entry type${dominantMealKinds.length > 1 ? 's were' : ' was'} ${dominantMealKinds.join(' and ')}.`);
  }

  return {
    totalEntries: weekEntries.length,
    lateAfternoonSnacks,
    lateNightSnacks,
    unknownTimeCount,
    dominantMealKinds,
    lines
  };
};
