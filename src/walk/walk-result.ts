import type { WalkOverview, WalkSession } from '../../modules/fake-walk';

export type WalkResult = WalkSession & { status: 'completed' | 'failed' };
type ResultStorage = { getString: (key: string) => string | undefined; set: (key: string, value: string) => void };
function isResult(session: WalkSession | null): session is WalkResult {
  return session?.status === 'completed' || session?.status === 'failed';
}
function receiptKey(session: WalkResult) { return `walk-result:${session.id}:${session.status}`; }
const observedKey = 'walk-result-observed';
const pendingKey = 'walk-result-pending';
function storedStatuses(storage: ResultStorage): Map<string, string> {
  try {
    const value: unknown = JSON.parse(storage.getString(observedKey) ?? '[]');
    return new Map(Array.isArray(value) ? value.filter((entry): entry is [string, string] =>
      Array.isArray(entry) && entry.length === 2 && entry.every((item) => typeof item === 'string')) : []);
  } catch { return new Map(); }
}

export function pendingWalkResult(next: WalkOverview, previous: WalkOverview | null, storage: ResultStorage): WalkResult | null {
  if (next.active) return null;
  const unseen = (session: WalkSession | null): session is WalkResult =>
    isResult(session) && storage.getString(receiptKey(session)) !== 'seen';
  // Keep a queued older retry visible even if the process exits before dismissal.
  const pending = next.history.find((session) => isResult(session) &&
    receiptKey(session) === storage.getString(pendingKey) && unseen(session));
  const statuses = previous
    ? new Map([...previous.history, ...(previous.active ? [previous.active] : [])].map((entry) => [entry.id, entry.status]))
    : storedStatuses(storage);
  const changed = next.history.find((session) => unseen(session) &&
    statuses.has(session.id) && statuses.get(session.id) !== session.status);
  const candidate = pending ?? changed ?? next.latest;
  return isResult(candidate) && storage.getString(receiptKey(candidate)) !== 'seen' ? candidate : null;
}

export function rememberWalkResults(storage: ResultStorage, next: WalkOverview, pending?: WalkResult) {
  if (pending) storage.set(pendingKey, receiptKey(pending));
  const sessions = [...next.history, ...(next.active ? [next.active] : [])];
  const statuses = JSON.stringify(sessions.map((session) => [session.id, session.status]));
  if (storage.getString(observedKey) !== statuses) storage.set(observedKey, statuses);
}

export function acknowledgeWalkResult(storage: ResultStorage, session: WalkResult) {
  storage.set(receiptKey(session), 'seen');
  if (storage.getString(pendingKey) === receiptKey(session)) storage.set(pendingKey, '');
}
