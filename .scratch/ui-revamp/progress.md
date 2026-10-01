# UI revamp implementation ledger

Spec: .scratch/ui-revamp/spec.md

- Baseline: 21 JS tests passed; clean dev checkout.
- Ruling: implement in the existing dev checkout using the cached local Android
  project; no separate worktree was requested. No integration or publishing.
- Retained the native session/permission bridge. MMKV stores only UI goals;
  the shared provider owns refresh and action coordination.
- Completed: goal persistence, shared permission controller, centered dialogs,
  fixed home, onboarding/route guard, and tablet width constraints.
- Tests were written first for preferences and permission/controller behavior.
- Phone feedback corrected native button padding (long labels wrapped) and
  numeric height fitting on short layouts. User waived enlarged-text verification.
- Passed: TypeScript, lint, 52 JS tests, 17 native tests, Expo Doctor 21/21,
  Android JS export, local arm64 debug build and installation.
- Phone verified: denial/recovery, History protection, dialog blur/keyboard/Back,
  cancelled drafts, preference relaunch restoration, cancellation, completed
  walks and brief feedback, revoked permission with an active session, failed
  saving and History retry, normal/narrow/tablet layout.
- Independent review: no important findings in the final implementation.
- Device display/font/timeout restored. Data retained after MMKV verification.
- Evidence and remaining manual checks: docs/development-handoff.md.
- Follow-up: continuous Home gradient/transparent header, helpful copy, Estimated
  time subtitle, smaller number/chips with centered Custom, and History status
  cards/chips/icons. Normal-text phone rendering checked; TypeScript, lint and
  52 JS tests passed. No system display changes or test records in this refinement.
- Custom range expanded to 10–20,000 in JS and Kotlin. Boundary/persistence tests
  verified red then green; 62 JS and 18 native tests passed. Rebuilt/installed
  local arm64 debug client. Phone rejected 9 and accepted both bounds.
