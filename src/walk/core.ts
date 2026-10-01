export const MIN_STEPS = 10;
export const MAX_STEPS = 20000;

export function parseStepTarget(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const steps = Number(trimmed);
  return Number.isInteger(steps) && steps >= MIN_STEPS && steps <= MAX_STEPS ? steps : null;
}

export function walkDuration(steps: number): number {
  return steps * 720;
}

export function simulatedSteps(target: number, elapsedMs: number): number {
  return Math.min(target, Math.max(0, Math.floor(elapsedMs / 720)));
}
