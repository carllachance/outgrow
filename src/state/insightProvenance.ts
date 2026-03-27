import type { AppState, InsightSupportFactor, InsightSupportLink, MealLogEntry } from '../types';

export type OpenedFrom = 'recent_days' | 'insight' | 'weekly_reflection' | 'pattern_summary' | 'direct_link';

type DayContext = {
  dayId: string;
  journalSnippets: Array<{ id: string; text: string; at: string }>;
  reflectionSnippets: Array<{ id: string; text: string; at: string }>;
  mealEntries: MealLogEntry[];
  returnNotes: Array<{ id: string; text: string; at: string }>;
  preview: string;
  observed: {
    sleepHours?: number;
    activityLevel?: 'low' | 'typical' | 'high';
    stressLevel?: 'low' | 'typical' | 'high';
    recovery?: 'low' | 'typical' | 'high';
  };
};

export type InsightDefinition = {
  id: string;
  title: string;
  statement: string;
  supportingDaysLabel: string;
};

export const insightLibrary: InsightDefinition[] = [
  {
    id: 'sleep-and-evening-rhythm',
    title: 'Sleep and evening rhythm',
    statement: 'Shorter sleep often appears on days that include later evening eating.',
    supportingDaysLabel: 'View supporting days'
  },
  {
    id: 'daytime-structure-and-energy',
    title: 'Daytime structure and steadier energy',
    statement: 'Earlier mid-day meals may be linked with steadier energy notes.',
    supportingDaysLabel: 'View supporting days'
  },
  {
    id: 'activity-and-tone',
    title: 'Activity and note tone',
    statement: 'Higher-activity days often align with a more positive note tone.',
    supportingDaysLabel: 'View supporting days'
  }
];

const toDayId = (isoDate: string) => isoDate.slice(0, 10);
const hashDate = (dayId: string) => dayId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);

const summarizePreview = (parts: string[]) => {
  const text = parts.find(Boolean) ?? 'No writing saved for this day yet.';
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
};

const detectPositiveTone = (snippets: string[]) => {
  const positiveTokens = ['steady', 'calm', 'good', 'grateful', 'better', 'worked', 'proud', 'easier'];
  const joined = snippets.join(' ').toLowerCase();
  return positiveTokens.some((token) => joined.includes(token));
};

const sortByAt = <T extends { at: string }>(items: T[]) => [...items].sort((a, b) => (a.at > b.at ? 1 : -1));

const getSoftTimeLabel = (meal: MealLogEntry) => {
  if (meal.timeMode === 'soft' && meal.softTimeLabel) return meal.softTimeLabel;
  if (meal.timeMode === 'exact' && meal.exactTime) {
    return new Date(meal.exactTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  if (meal.timeMode === 'unknown') return 'Time flexible';
  return meal.softTimeLabel || 'Around mealtime';
};

export const getRelativeDateLabel = (dayId: string) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thenDate = new Date(`${dayId}T00:00:00`);
  const then = new Date(thenDate.getFullYear(), thenDate.getMonth(), thenDate.getDate());
  const diffDays = Math.round((today.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return then.toLocaleDateString([], { weekday: 'long' });
  return null;
};

export const parseOpenedFrom = (value: string | null): OpenedFrom => {
  if (value === 'recent-days') return 'recent_days';
  if (value === 'insight') return 'insight';
  if (value === 'weekly-reflection') return 'weekly_reflection';
  if (value === 'pattern-summary') return 'pattern_summary';
  return 'direct_link';
};

export const buildDayContexts = (state: AppState): DayContext[] => {
  const dayMap = new Map<string, DayContext>();

  state.journalEntries.forEach((entry) => {
    const dayId = toDayId(entry.date);
    const current = dayMap.get(dayId) ?? {
      dayId,
      journalSnippets: [],
      reflectionSnippets: [],
      mealEntries: [],
      returnNotes: [],
      preview: '',
      observed: {}
    };
    if (entry.type === 'weekly') {
      current.reflectionSnippets.push({ id: entry.id, text: entry.content, at: entry.date });
    } else {
      current.journalSnippets.push({ id: entry.id, text: entry.content, at: entry.date });
    }
    dayMap.set(dayId, current);
  });

  state.weeklyReflections.forEach((reflection) => {
    const dayId = toDayId(reflection.weekOf);
    const current = dayMap.get(dayId) ?? {
      dayId,
      journalSnippets: [],
      reflectionSnippets: [],
      mealEntries: [],
      returnNotes: [],
      preview: '',
      observed: {}
    };
    const combined = [reflection.worked, reflection.didntHold, reflection.change, reflection.adapt].filter(Boolean).join(' · ');
    if (combined) current.reflectionSnippets.push({ id: `reflection-${reflection.weekOf}`, text: combined, at: reflection.weekOf });
    dayMap.set(dayId, current);
  });

  state.mealLogs.forEach((entry) => {
    const dayId = entry.entryDate;
    const current = dayMap.get(dayId) ?? {
      dayId,
      journalSnippets: [],
      reflectionSnippets: [],
      mealEntries: [],
      returnNotes: [],
      preview: '',
      observed: {}
    };
    current.mealEntries.push(entry);
    dayMap.set(dayId, current);
  });

  state.returnMoments.forEach((entry) => {
    const dayId = toDayId(entry.date);
    const current = dayMap.get(dayId) ?? {
      dayId,
      journalSnippets: [],
      reflectionSnippets: [],
      mealEntries: [],
      returnNotes: [],
      preview: '',
      observed: {}
    };
    current.returnNotes.push({ id: entry.id, text: entry.note, at: entry.date });
    dayMap.set(dayId, current);
  });

  return [...dayMap.values()].map((day) => {
    const hash = hashDate(day.dayId);
    const sleepHours = 5 + (hash % 5);
    const stressLevel: DayContext['observed']['stressLevel'] = hash % 7 === 0 ? 'high' : hash % 3 === 0 ? 'low' : 'typical';
    const activityLevel: DayContext['observed']['activityLevel'] = hash % 4 === 0 ? 'high' : hash % 5 === 0 ? 'low' : 'typical';
    const recovery: DayContext['observed']['recovery'] = hash % 6 === 0 ? 'low' : 'typical';
    const preview = summarizePreview([
      ...day.journalSnippets.map((snippet) => snippet.text),
      ...day.mealEntries.map((entry) => entry.rawText),
      ...day.reflectionSnippets.map((snippet) => snippet.text),
      ...day.returnNotes.map((snippet) => snippet.text)
    ]);
    return { ...day, observed: { sleepHours, stressLevel, activityLevel, recovery }, preview };
  }).sort((a, b) => (a.dayId < b.dayId ? 1 : -1));
};

const factorSetForDay = (day: DayContext): Set<InsightSupportFactor> => {
  const factors = new Set<InsightSupportFactor>();
  const joinedMeals = day.mealEntries.map((entry) => entry.rawText).join(' ').toLowerCase();
  if ((day.observed.sleepHours ?? 7) <= 6) factors.add('low_sleep');
  if (joinedMeals.includes('late') || joinedMeals.includes('night') || joinedMeals.includes('11pm')) factors.add('late_snack');
  if (joinedMeals.includes('early lunch') || joinedMeals.includes('noon') || joinedMeals.includes('12:')) factors.add('early_lunch');
  if (day.observed.activityLevel === 'high') factors.add('high_activity');
  if (day.observed.stressLevel === 'high') factors.add('high_stress');
  if (detectPositiveTone([...day.journalSnippets.map((snippet) => snippet.text), ...day.returnNotes.map((snippet) => snippet.text)])) {
    factors.add('positive_entry_tone');
  }
  return factors;
};

const buildExplanation = (insightId: string) => {
  if (insightId === 'sleep-and-evening-rhythm') return 'Included because this day had shorter sleep and a later eating signal.';
  if (insightId === 'daytime-structure-and-energy') return 'Included because you logged an earlier lunch and your notes sounded steadier.';
  if (insightId === 'activity-and-tone') return 'Included because activity was above your usual range and note tone was more positive.';
  return 'Included because this day matched part of the pattern.';
};

export const buildInsightSupportLinks = (state: AppState): InsightSupportLink[] => {
  const days = buildDayContexts(state);

  return days.flatMap((day) => {
    const factors = factorSetForDay(day);
    const links: InsightSupportLink[] = [];

    const addLink = (insightId: string, needed: InsightSupportFactor[]) => {
      if (!needed.every((factor) => factors.has(factor))) return;
      links.push({
        id: `${insightId}-${day.dayId}`,
        insightId,
        dayId: day.dayId,
        supportStrength: needed.length >= 2 ? 'high' : 'medium',
        factors: [...needed],
        explanation: buildExplanation(insightId),
        createdAt: new Date(`${day.dayId}T12:00:00.000Z`).toISOString()
      });
    };

    addLink('sleep-and-evening-rhythm', ['low_sleep', 'late_snack']);
    addLink('daytime-structure-and-energy', ['early_lunch', 'positive_entry_tone']);
    addLink('activity-and-tone', ['high_activity', 'positive_entry_tone']);

    return links;
  });
};

export const getInsightById = (insightId: string) => insightLibrary.find((insight) => insight.id === insightId);

export const getDayContext = (state: AppState, dayId: string) => buildDayContexts(state).find((day) => day.dayId === dayId);

export const buildAuthoredTimeline = (state: AppState, dayId: string) => {
  const day = getDayContext(state, dayId);
  if (!day) return [];

  const journal = sortByAt(day.journalSnippets).map((entry) => ({
    id: `journal-${entry.id}`,
    kind: 'journal' as const,
    timeDisplay: new Date(entry.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    rawText: entry.text,
    interpretedSummary: null,
    title: 'Journal',
    timeMode: 'exact' as const
  }));

  const reflections = sortByAt(day.reflectionSnippets).map((entry) => ({
    id: entry.id,
    kind: 'reflection' as const,
    timeDisplay: null,
    rawText: entry.text,
    interpretedSummary: null,
    title: 'Reflection',
    timeMode: 'unknown' as const
  }));

  const meals = [...day.mealEntries].sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1)).map((entry) => ({
    id: `meal-${entry.id}`,
    kind: entry.mealKind === 'snack' ? ('snack' as const) : ('meal' as const),
    timeDisplay: getSoftTimeLabel(entry),
    rawText: entry.rawText,
    interpretedSummary: entry.interpretedSummary ?? null,
    title: entry.mealKind ? entry.mealKind[0].toUpperCase() + entry.mealKind.slice(1) : 'Meal',
    timeMode: entry.timeMode
  }));

  const returnMoments = sortByAt(day.returnNotes).map((entry) => ({
    id: `note-${entry.id}`,
    kind: 'note' as const,
    timeDisplay: new Date(entry.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    rawText: entry.text,
    interpretedSummary: null,
    title: 'Return note',
    timeMode: 'exact' as const
  }));

  return [...journal, ...reflections, ...meals, ...returnMoments];
};

const rangeLabel = (kind: 'activity' | 'stress' | 'recovery' | 'sleep', value?: 'low' | 'typical' | 'high', sleepHours?: number) => {
  if (kind === 'sleep') {
    if ((sleepHours ?? 7) <= 6) return 'below_usual';
    if ((sleepHours ?? 7) >= 8) return 'above_usual';
    return 'within_usual';
  }
  if (value === 'high') return 'above_usual';
  if (value === 'low') return 'below_usual';
  return 'within_usual';
};

export const buildObservedCards = (state: AppState, dayId: string) => {
  const day = getDayContext(state, dayId);
  if (!day) return [];

  const mealCount = day.mealEntries.length;
  const mealSummary = mealCount === 0 ? 'No meal logs were linked for this day.' : `${mealCount} meal log${mealCount > 1 ? 's' : ''} captured with approximate timing.`;

  return [
    {
      id: 'sleep',
      title: 'Sleep',
      kind: 'sleep',
      summary: day.observed.sleepHours && day.observed.sleepHours <= 6
        ? 'Sleep looked lower than your usual range.'
        : 'Sleep looked within your usual range.',
      status: rangeLabel('sleep', undefined, day.observed.sleepHours)
    },
    {
      id: 'activity',
      title: 'Activity',
      kind: 'activity',
      summary: day.observed.activityLevel === 'high'
        ? 'Movement looked above your usual range.'
        : day.observed.activityLevel === 'low'
          ? 'Movement looked lower than your usual range.'
          : 'Movement looked within your usual range.',
      status: rangeLabel('activity', day.observed.activityLevel)
    },
    {
      id: 'recovery',
      title: 'Recovery',
      kind: 'recovery',
      summary: day.observed.recovery === 'low' ? 'Recovery looked lower than your usual range.' : 'Recovery looked within your usual range.',
      status: rangeLabel('recovery', day.observed.recovery)
    },
    {
      id: 'stress',
      title: 'Stress',
      kind: 'stress',
      summary: day.observed.stressLevel === 'high' ? 'Stress looked above your usual range.' : 'Stress looked within your usual range.',
      status: rangeLabel('stress', day.observed.stressLevel)
    },
    {
      id: 'meals',
      title: 'Meal timing',
      kind: 'meals',
      summary: mealSummary,
      status: mealCount ? 'within_usual' : 'unknown'
    }
  ];
};
