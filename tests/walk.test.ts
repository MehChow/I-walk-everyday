import { describe, expect, it } from 'vitest';
import { parseStepTarget, simulatedSteps, walkDuration } from '../src/walk/core';

describe('step entry', () => {
  it.each(['', '49', '10001', '50.5', '1e3', '-50', 'NaN'])('rejects %j', (value) => {
    expect(parseStepTarget(value)).toBeNull();
  });
  it.each([['50', 50], ['10000', 10000], [' 5000 ', 5000], ['51', 51]])('accepts %j', (value, expected) => {
    expect(parseStepTarget(value)).toBe(expected);
  });
});
describe('simulation', () => {
  it.each([[50, 36000], [5000, 3600000], [10000, 7200000]])('paces %i steps', (steps, expected) => {
    expect(walkDuration(steps)).toBe(expected);
  });
  it.each([[-1, 0], [719, 0], [720, 1], [18000, 25], [36000, 50], [999999, 50]])('clamps progress at %i ms', (elapsed, expected) => {
    expect(simulatedSteps(50, elapsed)).toBe(expected);
  });
});
