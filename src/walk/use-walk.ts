import { createContext, createElement, use, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import FakeWalk, { type Prerequisites, type WalkOverview } from '../../modules/fake-walk';
import { permissionGate, type PermissionCheck } from './permission-gate';
import { walkPreferences } from './preferences-store';
import { acknowledgeWalkResult, pendingWalkResult, rememberWalkResults, type WalkResult } from './walk-result';

function useWalkController() {
  const [overview, setOverview] = useState<WalkOverview | null>(null);
  const [permissions, setPermissions] = useState<Prerequisites | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [permissionCheck, setPermissionCheck] = useState<PermissionCheck>('checking');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [result, setResult] = useState<WalkResult | null>(null);
  const pendingResult = useRef<WalkResult | null>(null);
  const previousOverview = useRef<WalkOverview | null>(null);
  const mounted = useRef(false);
  const actionLock = useRef(false);
  const refreshVersion = useRef(0);

  const refresh = useCallback(async () => {
    if (actionLock.current) return;
    const version = ++refreshVersion.current;
    try {
      const [next, prerequisites] = await Promise.all([FakeWalk.getOverview(), FakeWalk.getPrerequisites()]);
      if (mounted.current && !actionLock.current && version === refreshVersion.current) {
        const candidate = pendingWalkResult(next, previousOverview.current, walkPreferences);
        if (!pendingResult.current && candidate) {
          rememberWalkResults(walkPreferences, next, candidate);
          pendingResult.current = candidate;
          setResult(candidate);
        } else {
          rememberWalkResults(walkPreferences, next);
        }
        previousOverview.current = next;
        setOverview(next); setPermissions(prerequisites);
        setPermissionCheck('verified'); setLoadError(null);
      }
    } catch (cause) {
      if (mounted.current && !actionLock.current && version === refreshVersion.current) {
        setLoadError(cause instanceof Error ? cause.message : 'Could not load your walk. Try again.');
        setPermissionCheck('error');
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    queueMicrotask(() => { void refresh(); });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') { setPermissionCheck('checking'); void refresh(); }
    });
    // This timer refreshes the visible UI only. All background work is native.
    const interval = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 1000);
    return () => { mounted.current = false; clearInterval(interval); subscription.remove(); };
  }, [refresh]);

  const dismissResult = useCallback(() => {
    if (pendingResult.current) acknowledgeWalkResult(walkPreferences, pendingResult.current);
    pendingResult.current = null;
    setResult(null);
  }, []);

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

  return { overview, permissions, error, busy, refresh, act, result, dismissResult, loadError,
    gate: permissionGate(permissions, permissionCheck),
    dismissError: () => setError(null) };
}

const WalkContext = createContext<ReturnType<typeof useWalkController> | null>(null);
export function WalkProvider({ children }: { children: ReactNode }) {
  return createElement(WalkContext.Provider, { value: useWalkController() }, children);
}
export function useWalk() {
  const walk = use(WalkContext);
  if (!walk) throw new Error('useWalk must be used inside WalkProvider.');
  return walk;
}
