# I Walk Everyday — approved Android v1

Expo React Native SDK 57, pnpm, Expo UI, local builds only, Android 14+.
No EAS, server, remote push, browser testing, iOS, sensor spoofing, or recurring walks.

Choose an integer between 50 and 10,000 (default 5,000), confirm, and simulate
one walk at 720 ms per step. Show elapsed progress and the estimated finish.
Allow cancellation before native publication begins; no pause/resume.
Save one manual-entry Health Connect StepsRecord covering the planned interval.
Completion means successful publication, followed by a native local notification.
One active session; preserve the latest 30 completed/cancelled/failed outcomes.
Charcoal/teal, dark only, native controls, large-text accessibility.

Native Kotlin Expo module owns SQLite sessions, permissions, WorkManager jobs,
Health Connect writes, idempotent retries and notifications. JS never owns
background work. Require WRITE_STEPS and notifications before starting.
Recheck at publication; recover from permission revocation and temporary failures.
Use session-derived client record IDs to avoid duplicate Health Connect writes.
Home/Back/swipe-away supported; Force stop requires reopening. Reboot is not an
acceptance requirement. Android may delay completion under power management.

Verify input boundaries, progress, concurrency/cancel race, persistence,
duplicate worker execution, permission failures, retry, notification tap and
history. Run TS/lint/native tests/local builds; verify the saved Health Connect
record on a physical Android device with the screen locked and app dismissed.
