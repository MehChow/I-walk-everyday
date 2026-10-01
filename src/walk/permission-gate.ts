import type { Prerequisites } from '../../modules/fake-walk/src/FakeWalk.types';

export type PermissionCheck = 'checking' | 'verified' | 'error';
export function permissionGate(permissions: Prerequisites | null, check: PermissionCheck) {
  if (check === 'error') return 'error';
  if (check === 'checking' || !permissions) return 'loading';
  return permissions.healthAvailable && permissions.stepsGranted && permissions.notificationsGranted ? 'ready' : 'blocked';
}
