import { expect, it } from 'vitest';
import { permissionGate } from '../src/walk/permission-gate';
const ready = { healthAvailable: true, stepsGranted: true, notificationsGranted: true };
it('blocks both protected routes until the initial check finishes', () => {
  expect(permissionGate(null, 'checking')).toBe('loading');
  expect(permissionGate(ready, 'checking')).toBe('loading');
});
it('fails closed when a fresh permission check fails', () => {
  expect(permissionGate(ready, 'error')).toBe('error');
});
it('admits fully granted permissions', () => {
  expect(permissionGate(ready, 'verified')).toBe('ready');
});
it.each(['healthAvailable', 'stepsGranted', 'notificationsGranted'] as const)('guards the app if %s is missing or revoked', (key) => {
  expect(permissionGate({ ...ready, [key]: false }, 'verified')).toBe('blocked');
});
it('returns to home only after both grants are restored', () => {
  expect(permissionGate({ ...ready, notificationsGranted: false }, 'verified')).toBe('blocked');
  expect(permissionGate(ready, 'verified')).toBe('ready');
});
