import { describe, expect, it } from 'vitest';
import { loadGoalPreferences, selectGoal, saveCustomGoal, selectedSteps, type GoalStorage } from '../src/walk/goal-preferences';

function store(initial: Record<string, number | string> = {}): GoalStorage {
  const values = new Map(Object.entries(initial));
  return { getNumber: (key) => typeof values.get(key) === 'number' ? values.get(key) as number : undefined,
    getString: (key) => typeof values.get(key) === 'string' ? values.get(key) as string : undefined,
    set: (key, value) => { values.set(key, value); } };
}
describe('goal preferences', () => {
  it('defaults to 5,000 without a saved custom goal', () => {
    expect(loadGoalPreferences(store())).toEqual({ customSteps: null, selected: '5000' });
  });
  it('persists presets and restores the latest selection', () => {
    const storage = store();
    selectGoal(storage, loadGoalPreferences(storage), '500');
    expect(selectedSteps(loadGoalPreferences(storage))).toBe(500);
  });
  it.each(['10', '49', '50', '1234', '10000', '10001', '20000'])('saves and selects whole custom goal %s', (entry) => {
    const storage = store();
    const result = saveCustomGoal(storage, loadGoalPreferences(storage), entry);
    expect(result).toEqual({ customSteps: Number(entry), selected: 'custom' });
    expect(loadGoalPreferences(storage)).toEqual(result);
  });
  it.each(['', '9', '20001', '-50', '12.5', '5,000', 'abc'])('rejects %s without changing persisted data', (entry) => {
    const storage = store({ customSteps: 1234, selectedGoal: '2000' });
    const before = loadGoalPreferences(storage);
    expect(saveCustomGoal(storage, before, entry)).toBeNull();
    expect(loadGoalPreferences(storage)).toEqual(before);
  });
  it('keeps custom distinct from a matching preset and reuses it', () => {
    const storage = store();
    const custom = saveCustomGoal(storage, loadGoalPreferences(storage), '1000')!;
    const preset = selectGoal(storage, custom, '1000');
    expect(preset.customSteps).toBe(1000);
    expect(selectGoal(storage, preset, 'custom').selected).toBe('custom');
  });
  it('does not select an unset custom goal', () => {
    const storage = store();
    expect(selectGoal(storage, loadGoalPreferences(storage), 'custom').selected).toBe('5000');
  });
  it.each([NaN, 9, 20001, 123.5])('discards corrupt custom value %s', (customSteps) => {
    expect(loadGoalPreferences(store({ customSteps, selectedGoal: 'custom' }))).toEqual({ customSteps: null, selected: '5000' });
  });
  it('falls back for an unknown selection but retains a valid custom value', () => {
    expect(loadGoalPreferences(store({ customSteps: 1234, selectedGoal: '900' }))).toEqual({ customSteps: 1234, selected: '5000' });
  });
});
