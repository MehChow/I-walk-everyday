# App UI revamp — agreed 2026-10-01

## Design

Dark-only Android 14+ Expo SDK 57 app. Fixed, steps-first home: History icon,
selected step count, duration, six goal choices, bottom Start button. Presets:
500, 1,000, 2,000, 5,000, 10,000. Custom accepts any integer 10–20,000.
No slider, LAST WALK, introductory paragraphs, or footer.

Custom opens an editor until saved. Then tapping selects the saved value and a
separate pencil edits it. Apply saves and selects; Cancel discards the draft.
MMKV remembers custom value and selected option. Fresh/invalid selection defaults
to 5,000. Existing native session persistence remains authoritative.

Centered native Expo UI dialogs for Custom and Start, with blurred home content
and native dimming. Confirmation shows goal, duration, finish estimate, and a
short explanation of saving after completion. Action locking and native
cancellation/publication rules remain intact. Active home shows simulated
progress, remaining time, Waiting to save / Saving, and Cancel. Completed writes
show a brief Walk saved message; failures link to History and existing retry.

Dedicated permission onboarding guards Home and History using actual Health
Connect availability plus step-write and notification grants. Loading/error
checks fail closed. Await native permission requests; navigate only after grants
are verified. Recheck on foreground and via existing polling. Denials stay on
onboarding with settings recovery. Revocation closes dialogs and redirects.
An existing session keeps running and has status/Cancel on onboarding; saving
cannot be cancelled. No stored onboarding-completed flag.

Keep charcoal/teal palette and 720 ms/step. Subtle gradients and vector artwork,
central tokens, safe areas and >=48 dp controls. Three goal columns normally,
two for narrow widths/enlarged text. Home never scrolls: compact decorative
space and fit numeric labels while preserving accessibility values. Portrait
orientation; tablet max content width 560 dp. Other screens/dialogs may scroll.

## Verification

Test goal boundaries, persistence and invalid preferences, cancelled drafts,
permission loading/partial grants/errors/revocation/recovery. Run typecheck,
lint, JS tests, native UI layout regression, Expo Doctor and local Android build.
Use the connected physical device and scrcpy, no browser/EAS. Verify dialogs,
keyboard, dim/blur, Back, relaunch persistence, cancellation, completion and retry,
normal text, narrow and tablet-sized layouts. Enlarged-text UI verification was
waived by the user during implementation. Record exact evidence and
limitations in the development handoff. App data may be cleared after verifying
MMKV persistence for permission onboarding tests.

## Follow-up refinement — 2026-10-01

User accepted onboarding and requested a friendlier Home and richer History.
Extend Home's gradient across the entire background, with a transparent title /
History row. Add a short introduction and goal-selection guidance. Display
Estimated time: <duration>, omitting the fixed pace. Reduce the main number from
88 to 56 dp (44 in compact layouts) and goal labels from 22 to 18 dp; compact
goal controls retain at least 52 dp touch height. Center both Custom lines.
Three columns fit at 320 dp with these smaller labels; fall back to two when
less width is available. Retain the fixed, non-scrolling Home.

History uses bordered dark cards with teal Saved, amber Cancelled, and red Not
saved chips. Right-side check/cross vector icons provide a second visual cue;
visible labels remain authoritative. Keep existing retry eligibility and actions.

Later refinement: remove History status chips and explanatory row copy. Each
row shows steps, date, and the colored right-side icon; the icon has an accessible
status label. Retain the existing session date and failed-row Retry.

Latest range update: Custom accepts whole steps 10–20,000, inclusive, with
matching native validation. The five presets and fixed 720 ms pace are unchanged.

## Finished dialog — 2026-10-01

Show a global centered result dialog on observed completion or the next app
opening with an unseen latest completed/failed walk. Teal check for Saved; pink-red
cross for Not saved. Show the chosen steps, native elapsed walk time (to the nearest
second), and status. Success says steps saved; failure calls the count a step goal.
Native dimming and background blur match the other dialogs. Done, Back/outside
dismissal or View history acknowledges this outcome in the same MMKV preference
store; it must not reappear after reopening. A successful retry is a new outcome
for the same session and can show again. Do not replay an older-history backlog,
interrupt an active walk, or show congratulations for cancellation. Permission
checks/guards take precedence; defer the dialog until readiness is verified.
Replace brief completion/failure Home feedback with this persistent dialog.
Session persistence, schedule and Health Connect writing remain native.

Keep a durable observed-status baseline and queued result receipt so an older
failed walk that succeeds on retry while the app is closed also shows its new
result. Preserve queued results until acknowledged, including across process
restarts. These are UI preferences, not native session state.

## Layout refinement — 2026-10-01

Group Home's count, unit and estimate in a bordered dark summary. Use a compact
horizontal summary on short screens or enlarged text, keeping Custom edit,
all goal choices and Start reachable. Use 24 dp normal / 16 dp compact margins
and preserve the 560 dp tablet content cap. Keep the normal goal label centered
with the Custom pencil at the trailing edge.

Center the finished dialog's native icon and title, emphasize the count, shorten
the confirmation text, and group elapsed time/status in one inset panel. Keep
native scrolling, dark controls, blur/dimming, all dismissal/history behavior,
permission priority and durable receipt acknowledgment unchanged.
