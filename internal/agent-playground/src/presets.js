export const AGENTS = [
  { value: 'summary', label: 'Summary Writer' },
  { value: 'reflection', label: 'Reflection Interpreter' },
  { value: 'nudge', label: 'Nudge Writer' },
  { value: 'chef', label: 'Chef Agent' },
  { value: 'onboarding', label: 'Onboarding Interpreter' },
  { value: 'reentry', label: 'Re-entry Planner' },
  { value: 'shopping', label: 'Shopping Helper' },
  { value: 'inspire', label: 'Inspire Me' },
];

export const SCENARIO_PRESETS = [
  {
    id: 'sum-weekly-1',
    agentType: 'summary',
    label: 'Steady week with one missed dinner',
    scenarioText:
      'I followed my lunch plan most days but had two late dinners from takeout. Steps were average and sleep was inconsistent.',
  },
  {
    id: 'sum-weekly-2',
    agentType: 'summary',
    label: 'Hard week with timeline pressure',
    scenarioText:
      'Travel week, skipped workouts, and I feel behind before a wedding in 3 weeks. I want a realistic next step.',
  },
  {
    id: 'reflection-1',
    agentType: 'reflection',
    label: 'Pattern recognition after late-night snacking',
    scenarioText:
      'I keep snacking after work when I am mentally drained. I usually do okay until dinner, then I drift.',
  },
  {
    id: 'reflection-2',
    agentType: 'reflection',
    label: 'Social meal drift',
    scenarioText:
      'When coworkers suggest lunch out, I lose my plan and then feel discouraged.',
  },
  {
    id: 'nudge-1',
    agentType: 'nudge',
    label: 'Morning nudge before commute',
    scenarioText: 'Need a short message to keep me calm and practical today.',
  },
  {
    id: 'nudge-2',
    agentType: 'nudge',
    label: 'After setback nudge',
    scenarioText: 'I had an overeating night yesterday and need a reset line for today.',
  },
  {
    id: 'chef-1',
    agentType: 'chef',
    label: 'Quick weeknight meals',
    scenarioText:
      'Need 3 low-friction dinners under 20 minutes, minimal prep, and one should be vegetarian.',
  },
  {
    id: 'chef-2',
    agentType: 'chef',
    label: 'Refine breakfast routine',
    scenarioText: 'I am bored with breakfast and need options with protein and fiber.',
  },
  {
    id: 'onboarding-1',
    agentType: 'onboarding',
    label: 'First-week setup',
    scenarioText:
      'New user, wants simple goals, has unpredictable work schedule and limited time for cooking.',
  },
  {
    id: 'onboarding-2',
    agentType: 'onboarding',
    label: 'Gentle onboarding for anxious user',
    scenarioText: 'User is motivated but worried about failing again after many restarts.',
  },
  {
    id: 'reentry-1',
    agentType: 'reentry',
    label: 'Returning after 3 weeks off',
    scenarioText:
      'I stopped logging for three weeks and want a clean restart without guilt or overwhelm.',
  },
  {
    id: 'reentry-2',
    agentType: 'reentry',
    label: 'Re-entry after illness',
    scenarioText: 'I am recovering from being sick and need a gradual first week back.',
  },
  {
    id: 'shopping-1',
    agentType: 'shopping',
    label: 'Budget grocery list',
    scenarioText:
      'Need a budget-conscious shopping plan for lunches and dinners for 4 days with simple ingredients.',
  },
  {
    id: 'shopping-2',
    agentType: 'shopping',
    label: 'No-cook week list',
    scenarioText: 'Need a no-cook list for an intense work week.',
  },
  {
    id: 'inspire-1',
    agentType: 'inspire',
    label: 'Motivation without pressure',
    scenarioText: 'I want encouragement that feels human and grounded, not hypey.',
  },
  {
    id: 'inspire-2',
    agentType: 'inspire',
    label: 'Reflection after small progress',
    scenarioText: 'I made small progress this week and want a dignified reflection.',
  },
];
