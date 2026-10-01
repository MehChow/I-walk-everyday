import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import FakeWalk, { type Prerequisites, type WalkOverview } from '../../modules/fake-walk';

export function useWalk() {
  const [overview, setOverview] = useState<WalkOverview | null>(null);
  const [permissions, setPermissions] = useState<Prerequisites | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(false);
  const actionLock = useRef(false);
  const refreshVersion = useRef(0);

  const refresh = useCallback(async () => {
    if (actionLock.current) return;
    const version = ++refreshVersion.current;
    try {
      const [next, prerequisites] = await Promise.all([FakeWalk.getOverview(), FakeWalk.getPrerequisites()]);
      if (mounted.current && !actionLock.current && version === refreshVersion.current) {
        setOverview(next); setPermissions(prerequisites);
      }
    } catch (cause) {
      if (mounted.current && version === refreshVersion.current) setError(cause instanceof Error ? cause.message : 'Could not load your walk. Try again.');
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    queueMicrotask(() => { void refresh(); });
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    // This timer refreshes the visible UI only. All background work is native.
    const interval = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 1000);
    return () => { mounted.current = false; clearInterval(interval); subscription.remove(); };
  }, [refresh]);

  const act = useCallback(async (operation: () => Promise<unknown>) => {
    if (actionLock.current) return false;
    actionLock.current = true; setBusy(true); setError(null);
    refreshVersion.current++;
    try {
      await operation();
      return true;
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.');
      return false;
    } finally {
      actionLock.current = false;
      if (mounted.current) { setBusy(false); await refresh(); }
    }
  }, [refresh]);

  return { overview, permissions, error, busy, refresh, act };
}
