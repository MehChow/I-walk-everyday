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

`pnpm android` builds and installs **Iwe dev**, a development client, locally. Rebuild when
the Kotlin module, native dependencies, or config plugins change. For later JS
edits, use `pnpm start` and connect the installed client to Metro. Use
`adb reverse tcp:8081 tcp:8081` if needed for USB Metro connectivity.

For a standalone local build with bundled JS (no Metro needed), build and install
**Iwe APK**:

```powershell
pnpm android:release
```

## App variants

The three variants have separate Android package IDs and link schemes so they
can be installed together. Each has independent preferences, walk history,
notifications and Health Connect permissions. The existing base package ID is
reserved for Prod; Dev and APK start with their own empty local data.

| Variant | Phone app name | Android package ID | Build and install | Build APK only |
| --- | --- | --- | --- | --- |
| Dev | Iwe dev | `com.mehchow.iwalkeveryday.dev` | `pnpm android` | `pnpm apk:dev` |
| APK | Iwe APK | `com.mehchow.iwalkeveryday.apk` | `pnpm android:release` | `pnpm apk` |
| Prod | I walk everyday | `com.mehchow.iwalkeveryday` | `pnpm android:prod` | `pnpm apk:prod` |

APK-only commands build for arm64 phones without requiring a connected device.
Their output is copied to `dist/apks/dev.apk`, `dist/apks/apk.apk`, or
`dist/apks/prod.apk`, so building another variant does not overwrite it.

`app.config.js` selects the identity using `APP_VARIANT=dev|apk|prod` and defaults
to Dev. The pnpm commands set this automatically on Windows and other platforms,
then run Expo prebuild with `--clean` before native builds so the generated
project and React Native's autolinking metadata match the selected identity.
Generated `android/` files are recreated; keep native changes in the module or
config plugins. For JS-only development edits, use `pnpm start` without rebuilding.
`pnpm start` syncs the generated configuration back to Dev without compiling
native code, and accepts Expo options such as `--port 8082`.
Link schemes are `iwalkeveryday-dev`, `iwalkeveryday-apk`, and `iwalkeveryday`;
the config plugin removes other variants’ stale schemes during prebuild.

Local release builds currently use the template's development signing key. They
are suitable for this sideloaded experiment; distribution signing is not configured,
including for the future Prod identity.

## Checks and APK builds without a phone

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm dlx expo-doctor
pnpm prebuild:dev
cd android
.\gradlew.bat :fake-walk:testDebugUnitTest
```

Use the APK-only pnpm commands above for each app identity. Gradle's original
outputs also remain under `android/app/build/outputs/apk/debug/` or
`android/app/build/outputs/apk/release/` for the most recently built variant.
Install with `adb install -r <apk>`. No emulator or browser testing is used.

Generated `android/` files are ignored. Native source lives in
`modules/fake-walk`, and reproducible app configuration in `app.json`,
`app.config.js` and `plugins/`. `.npmrc` uses hoisted dependencies to avoid excessive
Windows CMake path lengths. Existing repository skills and docs remain intact.

## What a walk does

Choose 10–20,000 whole steps, confirm, and wait at a fixed 720 ms per step.
10,000 steps take two hours; 20,000 take four hours. Only one walk can be active. Cancellation adds no
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
- Optionally stop the APK variant's process with `adb shell am kill com.mehchow.iwalkeveryday.apk`
  while backgrounded. This differs from `am force-stop`, which blocks workers.

Actual record publication and notification delivery require a physical device;
unit tests and a successful APK build alone do not prove those behaviors.

On 2026-10-01, the user reported a successful 1,000-step walk after closing the
app: a completion notification arrived after 12 minutes, and another app read
the additional 1,000 steps. The remaining checklist items still need verification.
The user verified the current standalone release APK on 2026-10-01, including
immediate rendering of the finished dialog's tick. The observed icon delay was
limited to the development build; no splash-screen change was needed.
