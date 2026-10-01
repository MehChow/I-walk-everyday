import { createElement, type ReactNode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getOverview: vi.fn(), getPrerequisites: vi.fn(), receipts: new Map<string, string>(), listeners: new Set<(state: string) => void>(), app: { currentState: 'active' } }));
vi.mock('react-native', () => ({ AppState: {
  get currentState() { return mocks.app.currentState; },
  addEventListener: (_: string, listener: (state: string) => void) => { mocks.listeners.add(listener); return { remove: () => mocks.listeners.delete(listener) }; },
} }));
vi.mock('../modules/fake-walk', () => ({ default: { getOverview: mocks.getOverview, getPrerequisites: mocks.getPrerequisites } }));
vi.mock('../src/walk/preferences-store', () => ({ walkPreferences: {
  getString: (key: string) => mocks.receipts.get(key),
  set: (key: string, value: string) => { mocks.receipts.set(key, value); },
} }));
import { WalkProvider, useWalk } from '../src/walk/use-walk';
const ready = { healthAvailable: true, stepsGranted: true, notificationsGranted: true };
const empty = { active: null, latest: null, history: [] };
let walk: ReturnType<typeof useWalk>;
let renderer: ReactTestRenderer;
function Consumer() { walk = useWalk(); return null; }
async function mount(children: ReactNode = createElement(Consumer)) {
  await act(async () => { renderer = create(createElement(WalkProvider, null, children)); });
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  mocks.getOverview.mockReset().mockResolvedValue(empty);
  mocks.getPrerequisites.mockReset().mockResolvedValue(ready);
  mocks.app.currentState = 'active';
  mocks.receipts.clear();
});
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); });
it('shares one initial refresh and AppState listener across consumers', async () => {
  await mount(createElement('group', null, createElement(Consumer), createElement(Consumer)));
  expect(mocks.getOverview).toHaveBeenCalledTimes(1);
  expect(mocks.listeners.size).toBe(1);
  expect(walk.gate).toBe('ready');
});
it('fails closed on check error and recovers on refresh', async () => {
  mocks.getPrerequisites.mockRejectedValueOnce(new Error('Native unavailable'));
  await mount();
  expect(walk.gate).toBe('error');
  await act(async () => { await walk.refresh(); });
  expect(walk.gate).toBe('ready');
  expect(walk.loadError).toBeNull();
});
it('blocks stale grants during foreground recheck then observes revocation', async () => {
  await mount();
  let resolve!: (value: typeof ready) => void;
  mocks.getPrerequisites.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  await act(async () => { mocks.listeners.forEach((listener) => listener('active')); });
  expect(walk.gate).toBe('loading');
  await act(async () => { resolve({ ...ready, stepsGranted: false }); });
  expect(walk.gate).toBe('blocked');
});
it('serializes actions and waits for permission flow before refreshing', async () => {
  await mount();
  let finish!: () => void;
  const first = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  const second = vi.fn();
  let pending!: Promise<boolean>;
  await act(async () => { pending = walk.act(first); });
  expect(walk.busy).toBe(true);
  await act(async () => { expect(await walk.act(second)).toBe(false); });
  expect(second).not.toHaveBeenCalled();
  mocks.getPrerequisites.mockResolvedValue({ ...ready, notificationsGranted: false });
  await act(async () => { finish(); await pending; });
  expect(walk.busy).toBe(false);
  expect(walk.gate).toBe('blocked');
});
it('does not replay acknowledged success but announces an observed completion', async () => {
  mocks.receipts.set('walk-result:old:completed', 'seen');
  mocks.getOverview.mockResolvedValue({ ...empty, latest: { id: 'old', status: 'completed' } });
  await mount();
  expect(walk.result).toBeNull();
  mocks.getOverview.mockResolvedValue({ ...empty, active: { id: 'new', status: 'running' } });
  await act(async () => { await walk.refresh(); });
  mocks.getOverview.mockResolvedValue({ ...empty, latest: { id: 'new', status: 'completed' } });
  await act(async () => { await walk.refresh(); });
  expect(walk.result?.id).toBe('new');
  expect(walk.result?.status).toBe('completed');
});
it('shows a background-completed walk after reopening and persists dismissal', async () => {
  mocks.getOverview.mockResolvedValue({ ...empty, latest: { id: 'background', status: 'completed' } });
  await mount();
  expect(walk.result?.id).toBe('background');
  await act(async () => { walk.dismissResult(); });
  expect(walk.result).toBeNull();
  await act(async () => renderer.unmount());
  await mount();
  expect(walk.result).toBeNull();
});
it('retains a failed result during missing permissions and shows it after recovery', async () => {
  mocks.getOverview.mockResolvedValue({ ...empty, latest: { id: 'failed', status: 'failed' } });
  mocks.getPrerequisites.mockResolvedValue({ ...ready, notificationsGranted: false });
  await mount();
  expect(walk.gate).toBe('blocked');
  expect(walk.result?.status).toBe('failed');
  mocks.getPrerequisites.mockResolvedValue(ready);
  await act(async () => { await walk.refresh(); });
  expect(walk.gate).toBe('ready');
  expect(walk.result?.id).toBe('failed');
});
