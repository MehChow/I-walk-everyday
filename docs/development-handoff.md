# Development handoff — 2026-10-01

## Current state

Android v1 is implemented in the user's `dev` checkout. At wrap-up, HEAD is
`623f5dd` (`one-shot app build: feature tested, works good`); the implementation
and crash fix are committed. These handoff documentation edits remain uncommitted.
Before continuing, inspect `git status` for changes made since this handoff.
The next requested work is UI refinement in a
separate session; no refinement design has been agreed yet.

The app uses Expo SDK 57, pnpm, Expo Router, universal Expo UI controls, and a
dark charcoal/teal theme. Builds are local, using Android Studio's SDK/JDK and an
Expo development client. There is no server, EAS, account, or remote push service.
The exact installed versions and commands are in `package.json` and the lockfile.

## Implementation map

- `src/screens/walk.tsx`: step entry, presets, confirmation sheet, simulated
  progress, permission recovery, cancellation, retry, and latest result.
- `src/app/history.tsx`: latest 30 completed, cancelled, or failed sessions.
- `src/theme.ts`: shared design tokens; preserve dark-only appearance.
- `src/walk/core.ts`: input validation, 720 ms per step, and progress clamping.
- `src/walk/use-walk.ts`: foreground native-state refresh and action coordination.
- `modules/fake-walk`: typed bridge and Kotlin session engine, SQLite persistence,
  Health Connect permission/write handling, WorkManager, and local notifications.
- `plugins/with-fake-walk.js` and `app.json`: reproducible native app configuration.

Native code owns the session lifecycle. UI progress is simulated and completion
is reported only after saving. One walk is active at a time. Cancellation is
disabled once saving starts. Stable session-derived Health Connect record IDs
make retries idempotent. WorkManager may execute later than the estimate; explicit
Android Force stop blocks unattended execution until reopening. Reboot is outside
v1 acceptance scope. Successful external-app ingestion is an observed result on
one device, not a compatibility guarantee.

## Verification evidence

Agent checks passed during this session:

- TypeScript and lint; 21 JavaScript tests (20 core tests plus one UI layout regression).
- 17 native tests: 13 engine tests and 4 SQLite persistence tests.
- Expo Doctor: 21/21 checks; Android JS export; local arm64 debug and release APK builds.
- Development-client launch after the UI fix on a Samsung SM_S9360, with no reported
  crash in the inspected AndroidRuntime/ReactNativeJS log window.

User-reported device result on 2026-10-01: selected 1,000 steps, closed the app,
waited 12 minutes, received the completion notification, and observed another
app's step count increase by 1,000. The exact closure method, build variant,
screen-lock/battery conditions, and underlying record metadata were not recorded.

Agent observed the main screen and used scrcpy-mcp to capture screenshots, read
the UI hierarchy, and scroll down/up. It displayed 1,000 selected steps, a
12-minute estimate, and “1,000 steps · Saved” / “Saved to Health Connect.”

Still outstanding: explicit Health Connect record/metadata inspection, notification
tapping, lock/Recents-removal under battery saving, standalone operation without
Metro, cancellation/no-record verification, denied/revoked permissions and retry
deduplication, large-text layouts, and full confirmation/history interactions.
Use the acceptance checklist in `README.md`; issue 03 remains open for these checks.

## Expo UI launch-crash fix

SDK 57's universal style converter accepts React Native percentage dimensions
at the TypeScript level but forwards them to numeric Compose modifiers on Android.
`width: '100%'` on Button, TextInput, and Column caused a native FieldCastException.
All six affected sites now use `fillMaxWidth()` from
`@expo/ui/jetpack-compose/modifiers`. React Native View and Expo UI Host styles
can still use percentage widths. Use numeric dimensions or native fill modifiers
inside the Compose tree. `tests/native-ui-layout.test.ts` guards the current
direct-style and StyleSheet call sites against string dimensions; it is a source
check, not a substitute for device rendering.

The previously built standalone APK predates this JavaScript fix. Rebuild the
release APK before testing standalone behavior or distributing it. The installed
development client loads the corrected JavaScript from Metro without a native rebuild.

## Physical-device UI workflow

scrcpy-mcp's fast session was confirmed connected, `videoAvailable: true`, with
a screenshot reporting `source: scrcpy`. The native display was 1080 × 2340.
Screenshot output can be resized; use native coordinates for taps/swipes and
prefer UI element bounds from `ui_find_element`.

On the current Windows machine the working MCP environment setting is:

```toml
SCRCPY_SERVER_PATH = 'C:/Users/Meh Chow/Desktop/scrcpy-win64-v4.0/scrcpy-server'
```

It points to the server file, not its containing folder. Restart the MCP
connection after configuration changes. The device serial observed in this
session was `R5CY84F2HGT`; discover connected devices again in the next session.
Session availability is transient: call `start_session` and verify the returned
status rather than assuming the old session remains alive. ADB fallback worked
when the server path was missing, but the final capture used the fast scrcpy path.

For UI refinement, capture the current physical screen first, agree the intended
changes, then verify affected screens and large-text behavior on the phone.
Keep native session behavior intact while changing presentation. Consult the
Expo overview/UI/design-system skills as appropriate. See `README.md` for local
build and verification commands, and `.scratch/fake-pedometer/spec.md` for the
approved v1 specification.
