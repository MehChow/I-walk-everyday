import { expect, it } from 'vitest';
import { timeUsed } from '../src/walk/format';

it.each([[0, '0 sec'], [7200, '7 sec'], [61720, '1 min 2 sec'], [3600720, '1 hr 1 sec'], [14400000, '4 hr']])('formats elapsed %i ms without rounding up minutes', (ms, expected) => {
  expect(timeUsed(ms)).toBe(expected);
});
