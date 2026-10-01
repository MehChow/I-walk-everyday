# I Walk Everyday

An Android 14+ hobby app that simulates a walk and writes the chosen count as a
**manual-entry** step record in Health Connect. It does not alter hardware sensors
or guarantee that another app accepts the records.

Expo SDK 57 · React Native · pnpm · Expo UI · Kotlin · SQLite · WorkManager.
No backend or EAS is used. The UI is dark only.

For the implementation map, session results, remaining device checks, and
scrcpy-mcp setup, see [Development handoff](docs/development-handoff.md).

## Develop on a real Android phone

Requirements: Node.js 24+, pnpm 10.30.3, Android Studio with its SDK and JDK,
and a USB-debugging-enabled Android 14+ phone. Set `ANDROID_HOME` to your SDK
directory and ensure `adb` and Java are on PATH.

```powershell
pnpm install
adb devices
pnpm android
```

`pnpm android` builds and installs a **development client locally**. Rebuild when
the Kotlin module, native dependencies, or config plugins change. For later JS
edits, use `pnpm start` and connect the installed client to Metro. Use
`adb reverse tcp:8081 tcp:8081` if needed for USB Metro connectivity.

For a standalone local build with bundled JS (no Metro needed):

```powershell
pnpm android:release
```

Local release builds currently use the template's development signing key. They
are suitable for this sideloaded experiment; distribution signing is not configured.

## Checks and APK builds without a phone

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm dlx expo-doctor
pnpm exec expo prebuild --platform android --no-install
cd android
.\gradlew.bat :fake-walk:testDebugUnitTest
.\gradlew.bat :app:assembleDebug :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
```

APKs are under `android/app/build/outputs/apk/debug/` and
`android/app/build/outputs/apk/release/`. Install with `adb install -r <apk>`.
The arm64 builds target modern physical Android phones. Remove the architecture
argument if you need other ABIs. No emulator or browser testing is used.

Generated `android/` files are ignored. Native source lives in
`modules/fake-walk`, and reproducible app configuration in `app.json` and
`plugins/with-fake-walk.js`. `.npmrc` uses hoisted dependencies to avoid excessive
Windows CMake path lengths. Existing repository skills and docs remain intact.

## What a walk does

Choose 50–10,000 whole steps, confirm, and wait at a fixed 720 ms per step.
10,000 steps take two hours. Only one walk can be active. Cancellation adds no
steps, and is disabled once saving begins. The latest 30 terminal outcomes remain
in history. Removing history does not remove records from Health Connect.

Health Connect write access and completion notifications must be enabled to start.
If a permission is removed during a walk, enable it and retry the unsaved walk.
Temporary failures retry automatically using the same record identity.

Progress is simulated; it is **not** a count already saved. At the deadline, the
app may say “Waiting to save” until Android runs the background worker. Completion
means the Health Connect write succeeded. A native local notification then opens
the app when tapped. Disabling reminders after a successful write does not undo it.

Work is persisted natively and continues when the screen is locked or the UI is
closed. Android Doze and manufacturer battery restrictions may delay execution.
Explicit **Force stop** prevents execution until the app is opened again. Reboot
behavior is not an acceptance requirement. No exact-alarm permission is requested.

## Physical-device acceptance checklist

- Enable step writes and notifications, start 50 steps, lock the phone, and wait.
- Inspect Health Connect → Data and access → Activity → Steps for a 50-step record
  attributed to I Walk Everyday, with manual-entry metadata and a 36-second interval.
- Tap the completion notification; check the saved outcome and history.
- Repeat after swiping the app from Recents, with Metro disconnected using the
  standalone APK. A delayed write must not produce an early success reminder.
- Cancel a walk before saving and verify no record is written.
- Revoke step permission during a walk; verify an unsaved failure, then grant it
  and retry. Check that there is one record, not duplicate counts.
- Check declined notification permission and a disabled completion channel.
- Verify large font settings, numeric entry, confirmation, history, and Back.
- Optionally stop the app's process with `adb shell am kill com.mehchow.iwalkeveryday`
  while backgrounded. This differs from `am force-stop`, which blocks workers.

Actual record publication and notification delivery require a physical device;
unit tests and a successful APK build alone do not prove those behaviors.

On 2026-10-01, the user reported a successful 1,000-step walk after closing the
app: a completion notification arrived after 12 minutes, and another app read
the additional 1,000 steps. The remaining checklist items still need verification.
The earlier standalone APK predates the Expo UI percentage-width crash fix;
rebuild it before standalone testing. The development client loads that fix from Metro.
