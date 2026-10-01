export function parseStepTarget(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const steps = Number(trimmed);
  return Number.isInteger(steps) && steps >= 50 && steps <= 10000 ? steps : null;
}

export function walkDuration(steps: number): number {
  return steps * 720;
}

export function simulatedSteps(target: number, elapsedMs: number): number {
  return Math.min(target, Math.max(0, Math.floor(elapsedMs / 720)));
}
