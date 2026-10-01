import { useState } from 'react';
import { walkPreferences as storage } from './preferences-store';
import { loadGoalPreferences, saveCustomGoal, selectGoal, selectedSteps, type GoalChoice } from './goal-preferences';

export function useGoalPreferences() {
  const [preferences, setPreferences] = useState(() => loadGoalPreferences(storage));
  return {
    ...preferences,
    target: selectedSteps(preferences),
    select: (choice: GoalChoice) => setPreferences(selectGoal(storage, preferences, choice)),
    saveCustom: (entry: string) => {
      const next = saveCustomGoal(storage, preferences, entry);
      if (next) setPreferences(next);
      return next !== null;
    },
  };
}
