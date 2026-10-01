# Development handoff — 2026-10-01

## Current state

Android v1 is implemented in the user's `dev` checkout. At wrap-up, HEAD is
`623f5dd` (`one-shot app build: feature tested, works good`); the original implementation
and crash fix are committed. The UI revamp and these documentation edits remain uncommitted.
Before continuing, inspect `git status` for changes made since this handoff.
The agreed UI revamp is implemented; see `.scratch/ui-revamp/spec.md` and the
device evidence below. The user waived further enlarged-text UI verification.

The app uses Expo SDK 57, pnpm, Expo Router, universal Expo UI controls, and a
dark charcoal/teal theme. Builds are local, using Android Studio's SDK/JDK and an
Expo development client. There is no server, EAS, account, or remote push service.
The exact installed versions and commands are in `package.json` and the lockfile.

## Implementation map

- `src/screens/walk.tsx`: fixed home, preset/Custom goals, centered native dialogs,
  simulated progress, cancellation, and brief completion/failure feedback.
- `src/screens/onboarding.tsx` and `src/app/_layout.tsx`: permission onboarding,
  guarded Home/History, and loading/error recovery.
- `src/walk/goal-preferences.ts` and `use-goal-preferences.ts`: validated UI goal
  preferences in one MMKV store. Session persistence remains native SQLite.
- `src/components/`: native action/icon controls and centered Expo UI dialogs.
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

## Original implementation verification evidence

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

Originally outstanding: explicit Health Connect record/metadata inspection, notification
tapping, lock/Recents-removal under battery saving, standalone operation without
Metro, cancellation/no-record verification, denied/revoked permissions and retry
deduplication, large-text layouts, and full confirmation/history interactions.
Use the acceptance checklist in `README.md`; issue 03 remains open for these checks.

## UI revamp evidence — 2026-10-01

Implemented `.scratch/ui-revamp/spec.md` without native bridge/engine changes.
Added MMKV 4.3.2 and Nitro Modules 0.37.1 through Expo's pnpm installation workflow,
regenerated the ignored Android project, built and installed the local arm64
development client. Home does not scroll; Custom/Start use native dark AlertDialog
with React Native background blur and native dimming. The shared provider owns
permission checks and one action lock; routing uses real prerequisites.

Checks: TypeScript, lint, 52 JavaScript tests including the native layout source
regression; 17 native tests (13 engine, 4 persistence), all passing. Expo Doctor
21/21, Android JS export, and `:app:assembleDebug` passed. Logs are under
`.scratch/ui-revamp/` and ignored by Git. Independent code review found no important
issues. The installed development client loads current JavaScript from Metro on
port 8082 through USB reverse; the earlier 8081 server was unresponsive.

Observed on Samsung SM_S9360 (`R5CY84F2HGT`) through scrcpy:

- Initial onboarding with both grants missing; denied both native permission
  prompts, stayed on onboarding and saw both settings recovery actions. A History
  deep link stayed guarded. Granting WRITE_STEPS and notifications entered Home.
- Custom 49 stayed open with an inline validation error; 1,234 and 50 applied.
  Numeric keyboard and dialog buttons remained visible. Cancel/Back discarded
  a draft. Back dismissed Start without creating a session. Blur/dimming and a
  sharp centered dialog were visually confirmed.
- Force-stop/relaunch restored Custom 1,234 and its selection; selecting preset
  2,000 and relaunching restored that preset while retaining Custom 1,234.
- A 500-step session showed simulated progress and was cancelled through its
  confirmation. History reported Cancelled / No steps saved.
- A 50-step session saved successfully. Another had notifications revoked during
  its run: reopening showed onboarding, Health Connect Allowed / Reminders Required,
  and the still-active session with remaining time and Cancel. Its save failed;
  restoring permission returned Home with the failure link. History Retry changed
  that session to Saved to Health Connect.
- A further 50-step walk visibly returned to goal selection, showed Walk saved,
  then cleared the message. Saving finished too quickly to inspect its transient
  disabled control visually; publication/cancellation locking is covered by native
  regression tests and the existing native engine.
- Normal phone (384 x 832 dp), narrow override (320 x 569 dp), and tablet override
  (960 x 1440 dp) rendered fixed Home with all choices and Start visible. Tablet
  content was centered at 560 dp. Enlarged-text verification was waived by the user.
  Available-height numeric fitting also prevents overlap on short phones.

Screenshots: `.scratch/ui-revamp/confirmation.png`, `custom.png`, `revoked.png`, `narrow.png`,
`tablet.png`, and `home.png`. Device font scale 1.0, physical size 1080 x 2340,
density 450, and screen timeout 300000 ms were restored. App data was not cleared:
MMKV persistence was checked first, and test history remains available.

Useful manual follow-up: check saved entries in the user's usual health app and
try a longer walk with the phone locked/battery saving enabled. Exact Health
Connect metadata/record counts and retry deduplication were not independently
inspected; the earlier native acceptance checklist remains relevant. No EAS,
browser testing, or distribution was used.

## Follow-up visual refinement — 2026-10-01

After user feedback, extended the Home gradient across the full screen and kept
the title / History row transparent. Added Your next walk guidance and a goal
section heading/helper. Estimated time replaces the pace subtitle. Main count
is capped at 56 dp / 44 compact; goal text is 18 dp and controls 56 dp / 52 compact,
with centered Custom lines. The smaller labels allow three columns at 320 dp.
History now has bordered surface cards and teal/amber/red right-side check/cross
native vector icons. Latest feedback removed status chips and row explanatory
copy, leaving steps, the existing session date, and icon. Icons have accessible
status labels. Failed saves retain Retry through the shared action controller.

TypeScript, lint (no warnings), and all 52 JavaScript tests passed. scrcpy confirmed
Home's continuous gradient, smaller controls, centered Custom text and fixed Start,
and an existing cancelled History entry's compact steps/date/amber cross row. Screenshots are
`.scratch/ui-revamp/refined-home.png` and `refined-history.png`. This refinement
did not alter system display/font settings or create walk records. Onboarding,
permission routing, native session scheduling and saved preferences were retained.

## Custom range update — 2026-10-01

Custom now accepts whole steps 10–20,000 inclusive. Shared JS bounds drive parsing,
MMKV restoration, helper/error/accessibility text and input length. Native
WalkEngine validation matches the range; bridge signatures and pace are unchanged.
README and the UI spec reflect the new bounds. Tests first failed on the old
limits, then passed: 62 JS tests, 18 native tests, TypeScript and lint. Native
tests verify scheduling and publication of 10, 49, 10,001 and 20,000 steps.
Local arm64 debug build passed and was installed on the phone. Metro on port
8082 was restarted after its previous process stopped. Device Custom validation
rejected 9 inline and accepted 20,000 and 10. No test walks were started; the
pre-check Custom selection/value is restored after editing verification.

## Finished popup — 2026-10-01

Global dark Expo UI result dialog now presents completed/failed save outcomes
with steps, native elapsed time rounded to seconds, and Saved/Not saved status.
Teal check and inset success panel; pink cross and inset failure panel. Entire
screen is blurred behind native dimming. Done/Back/outside acknowledge; View
history acknowledges and opens History. Permission readiness takes priority.
MMKV stores acknowledgment, observed statuses, and the pending receipt so an
older retry can complete while closed and a queued result survives process death.
Native session scheduling/writes are unchanged by this feature.

Verification: 77 JS tests passed (including the native UI layout source check),
TypeScript and lint passed. Tests cover cold reopening, dismissal persistence,
older retry completion and queued-result restoration, corrupt receipt metadata,
permission deferral, and elapsed-time formatting. Review caught the older retry
cold-reopen gap; durable metadata fixes it and re-review found no important issue.
On physical SM-S9360, verified foreground completion, 10 steps / 7 sec / Saved,
blur/dim, Done and Back dismissal, no replay after force-stop/relaunch, and a
10-step walk completed while on the launcher then displayed after cold reopening.
View history navigation also passed. Capture: .scratch/ui-revamp/finished.png.
These checks created two additional 10-step test records. App data and system
font/display settings were not changed. The pink failure presentation is covered
by code/tests but has not been exercised on-device in this pass. No native rebuild
was needed for this JS-only addition; the installed client loads it from Metro.

## Home and finished-dialog layout refinement — 2026-10-01

Home now groups the selected count, step unit and estimate in a bordered dark
summary, with 24 dp screen margins on normal layouts and 16 dp in compact ones.
The Custom pencil stays at the trailing edge while the normal summary label
remains centered. Short screens and enlarged text use a horizontal count/estimate
summary; the fixed goal grid and Start remain visible. Numeric fitting includes
the extra unit and summary padding. Tablet content remains capped at 560 dp.

The finished dialog uses the native AlertDialog icon slot and centered title,
a 40 dp count, concise Health Connect confirmation, and one inset time/status
row. Shared dialog actions retain 52 dp minimum touch height with a minimum
confirm width of 88 dp. Success/failure colors, Done/Back/outside acknowledgment
and View history behavior retain the existing result controller.

Verified on SM_S9360 through scrcpy: normal 384 × 832 dp Home, narrow override
320 × 569 dp with Custom 20,000, tablet override 960 × 1440 dp, and normal device
at font scales 1.3 and 1.5. The 1.5 layout reflows goals to two columns. Edited
Custom back to its original 10. One 10-step test walk completed and displayed
10 / 7 sec / Saved; the result rendered at normal and narrow widths and 1.5 text
scale, with blur/dimming, then Done dismissed it. Failure presentation was not
exercised on the device in this pass. Physical size 1080 × 2340, density 450 and
font scale 1.0 were restored. App data was preserved; one additional 10-step
Health Connect test record was created.

Final checks: TypeScript, lint, all 77 JS tests, and git diff whitespace check
passed. Changes are JS presentation only; the existing local development client
loaded them from Metro without a native rebuild. No browser or EAS used.
Screenshots: `.scratch/ui-revamp/layout-home.png` and `layout-finished.png`.

## App variants — 2026-10-01

`app.config.js` now selects `APP_VARIANT=dev|apk|prod`, defaulting to Dev:

- Dev: **Iwe dev**, `com.mehchow.iwalkeveryday.dev`, `iwalkeveryday-dev`.
- APK: **Iwe APK**, `com.mehchow.iwalkeveryday.apk`, `iwalkeveryday-apk`.
- Prod: **I walk everyday**, `com.mehchow.iwalkeveryday`, `iwalkeveryday`.

The variants have separate local data and permission grants. Native package-aware
Health Connect settings and notification launch intents continue using the current
application package. Session logic and Health Connect writes were not changed.
Prod retains the original package identity. Production distribution signing is
still unconfigured; these local verification builds use the template debug key.

`pnpm android`, `pnpm android:release`, and `pnpm android:prod` build/install the
corresponding variants. `pnpm apk:dev`, `pnpm apk`, and `pnpm apk:prod` build arm64
APKs without a phone and preserve them at `dist/apks/dev.apk`, `apk.apk`, and
`prod.apk`. The Windows-compatible runner in `scripts/android-variant.js` sets
the variant environment and performs a clean Expo prebuild before native builds.
Incremental package switching was tested and failed because React Native's cached
autolinking entry point still referenced the preceding package's BuildConfig;
full native regeneration fixes this. Keep configuration in the module/plugins.
`plugins/with-variant-links.js` removes other variants' stale link schemes.
`pnpm start` syncs native configuration back to Dev without compiling it and
explicitly uses the Dev scheme; forwarding `--port 8082` is supported.

Verified all three local APK builds and exact app labels/package IDs with aapt.
Installed all three simultaneously on SM_S9360 (`R5CY84F2HGT`); package listing
confirmed the base, `.dev`, and `.apk` apps. APK launched into permission
onboarding. No test walks were created or permission grants changed. Final checks:
82 JS tests, TypeScript, lint, and whitespace checks passed. The start command's
help invocation confirmed it restores the generated Dev application ID after a
Prod build. These checks do not replace the outstanding Health Connect acceptance
checks above. No browser or EAS was used.

The user also verified the current standalone release APK renders the finished
dialog's tick immediately. The earlier delayed tick was limited to the development
build, so no splash-screen or result-dialog changes were made for that symptom.

## Original Expo UI launch-crash fix details

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
