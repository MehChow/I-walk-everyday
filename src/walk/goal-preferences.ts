import { parseStepTarget } from './core';

export const PRESET_GOALS = [500, 1000, 2000, 5000, 10000] as const;
export type GoalChoice = `${typeof PRESET_GOALS[number]}` | 'custom';
export type GoalPreferences = { customSteps: number | null; selected: GoalChoice };
export type GoalStorage = {
  getNumber: (key: string) => number | undefined;
  getString: (key: string) => string | undefined;
  set: (key: string, value: number | string) => void;
};

export function loadGoalPreferences(storage: GoalStorage): GoalPreferences {
  const saved = storage.getNumber('customSteps');
  const customSteps = saved !== undefined && parseStepTarget(String(saved)) !== null ? saved : null;
  const selection = storage.getString('selectedGoal');
  const selected = selection === 'custom' && customSteps !== null ? 'custom'
    : PRESET_GOALS.some((goal) => String(goal) === selection) ? selection as GoalChoice : '5000';
  return { customSteps, selected };
}

export function selectedSteps(preferences: GoalPreferences): number {
  return preferences.selected === 'custom' ? preferences.customSteps ?? 5000 : Number(preferences.selected);
}

export function selectGoal(storage: GoalStorage, preferences: GoalPreferences, selected: GoalChoice): GoalPreferences {
  if (selected === 'custom' && preferences.customSteps === null) return preferences;
  storage.set('selectedGoal', selected);
  return { ...preferences, selected };
}

export function saveCustomGoal(storage: GoalStorage, preferences: GoalPreferences, entry: string): GoalPreferences | null {
  const customSteps = parseStepTarget(entry);
  if (customSteps === null) return null;
  // Write the value before selecting Custom so an interrupted write cannot select an unset goal.
  storage.set('customSteps', customSteps);
  return selectGoal(storage, { ...preferences, customSteps }, 'custom');
}
