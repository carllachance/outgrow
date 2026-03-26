import { defaultState } from './defaultState';
import type { AppState, MealLogEntry } from '../types';

const sanitizeMealLog = (value: unknown): MealLogEntry | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<MealLogEntry>;
  if (!candidate.id || !candidate.timestamp || !candidate.eventType || !candidate.portionFeel) return null;

  return {
    id: String(candidate.id),
    timestamp: String(candidate.timestamp),
    eventType: candidate.eventType,
    compositionTags: Array.isArray(candidate.compositionTags) ? candidate.compositionTags : [],
    portionFeel: candidate.portionFeel,
    context: candidate.context,
    note: candidate.note?.trim() || undefined
  } as MealLogEntry;
};

export const hydrateAppState = (raw: string | null): AppState => {
  if (!raw) return defaultState;

  try {
    const parsed = { ...defaultState, ...JSON.parse(raw) } as AppState;
    return {
      ...parsed,
      mealLogs: Array.isArray(parsed.mealLogs) ? parsed.mealLogs.map(sanitizeMealLog).filter(Boolean) as MealLogEntry[] : [],
      safety: {
        ...defaultState.safety,
        ...parsed.safety,
        eventLog: parsed.safety?.eventLog ?? []
      }
    };
  } catch {
    return defaultState;
  }
};
