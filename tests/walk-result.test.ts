import { expect, it } from 'vitest';
import type { WalkOverview, WalkSession } from '../modules/fake-walk';
import { acknowledgeWalkResult, pendingWalkResult, rememberWalkResults } from '../src/walk/walk-result';

function storage() {
  const values = new Map<string, string>();
  return { getString: (key: string) => values.get(key), set: (key: string, value: string) => { values.set(key, value); } };
}
function session<S extends WalkSession['status']>(id: string, status: S): WalkSession & { status: S } {
  return { id, status, steps: 10, startedAt: 0, finishAt: 7200, elapsedMs: 7200, recordId: null, errorCode: null, errorMessage: null, notification: 'sent' };
}
function overview(latest: WalkSession, history: WalkSession[] = [latest]): WalkOverview {
  return { active: null, latest, history };
}

it.each(['completed', 'failed'] as const)('shows an unacknowledged %s result on reopening', (status) => {
  const result = session('latest', status);
  expect(pendingWalkResult(overview(result), null, storage())).toEqual(result);
});
it('does not interrupt an active walk or celebrate cancellation', () => {
  const old = session('old', 'completed');
  expect(pendingWalkResult({ ...overview(old), active: session('active', 'running') }, null, storage())).toBeNull();
  expect(pendingWalkResult(overview(session('cancelled', 'cancelled')), null, storage())).toBeNull();
});
it('persists dismissal and does not replay it after restarting', () => {
  const saved = session('saved', 'completed');
  const store = storage();
  acknowledgeWalkResult(store, saved);
  expect(pendingWalkResult(overview(saved), null, store)).toBeNull();
  expect(pendingWalkResult(overview(session('next', 'completed')), null, store)?.id).toBe('next');
});
it('shows a successful retry of an older failed walk even when latest is newer', () => {
  const store = storage();
  const newer = session('newer', 'completed');
  const failed = session('older', 'failed');
  acknowledgeWalkResult(store, newer);
  acknowledgeWalkResult(store, failed);
  const retried = session('older', 'completed');
  expect(pendingWalkResult(overview(newer, [newer, retried]), overview(newer, [newer, failed]), store)).toEqual(retried);
  acknowledgeWalkResult(store, retried);
  expect(pendingWalkResult(overview(newer, [newer, retried]), null, store)).toBeNull();
});
it('does not show a backlog of older history on first load', () => {
  const store = storage();
  const latest = session('latest', 'completed');
  acknowledgeWalkResult(store, latest);
  expect(pendingWalkResult(overview(latest, [latest, session('older', 'failed')]), null, store)).toBeNull();
});

it('remembers an older retry across a cold reopen and until dismissal', () => {
  const store = storage();
  const newer = session('newer', 'completed');
  const failed = session('older', 'failed');
  acknowledgeWalkResult(store, newer);
  acknowledgeWalkResult(store, failed);
  rememberWalkResults(store, overview(newer, [newer, failed]));
  const retried = session('older', 'completed');
  const next = overview(newer, [newer, retried]);
  expect(pendingWalkResult(next, null, store)).toEqual(retried);
  rememberWalkResults(store, next, retried);
  expect(pendingWalkResult(next, null, store)).toEqual(retried);
  acknowledgeWalkResult(store, retried);
  expect(pendingWalkResult(next, null, store)).toBeNull();
});

it('tolerates invalid result metadata', () => {
  const store = storage();
  store.set('walk-result-observed', '{broken');
  store.set('walk-result-pending', 'null');
  const saved = session('saved', 'completed');
  expect(pendingWalkResult(overview(saved), null, store)).toEqual(saved);
});
