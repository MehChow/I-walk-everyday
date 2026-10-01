# Physical-device acceptance
Status: ready-for-human

Follow README acceptance checks on an Android 14+ phone. Verify actual Health
Connect records, completion notifications, screen lock, swipe-away, offline
standalone execution, permissions, retries, cancellation and large text.

## Comments
ADB initially reports no connected phone. Local build verification continues.

2026-10-01: Samsung SM_S9360 connected. User reports a successful 1,000-step
walk with the app closed: completion notification after 12 minutes and another
app reading the additional 1,000 steps. Exact closure/build/battery conditions
and record metadata were not captured. Agent verified launch and main-screen
scrolling/screenshots/UI text with scrcpy-mcp, including the saved result.

Keep this issue open for the remaining README acceptance checks: explicit record
inspection, lock/Recents-removal and battery-saving cases, notification tapping,
standalone execution without Metro, cancellation, permission recovery, retries,
and large text. Rebuild the standalone APK to include the percentage-width fix.
Current handoff: `docs/development-handoff.md`.
