# Project

I Walk Everyday is an Android 14+ Expo React Native SDK 57 app that writes
synthetic manual-entry steps to Health Connect.

## Agent rules

- Do not use web-browser for Expo project.
- Sub-agent only allowed to use GPT-6 Luna High or below.
- Use pnpm, local Android builds, and the physical device for testing. No EAS.
- Keep session state, scheduling, and Health Connect writes in `modules/fake-walk`.
  Generated `android/` files are ignored; persist native configuration in the module or config plugin.
- Use dark-only Expo UI controls and centralized tokens in `src/theme.ts`.

## Development handoff

Before UI refinement, native changes, or device verification, read
`docs/development-handoff.md` for current evidence, remaining checks, Expo UI
layout constraints, and scrcpy-mcp setup.

## Agent skills

### Issue tracker

Local Markdown issues live under `.scratch/<feature>/`. Before reading or writing issues or specs, read `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default triage labels. Before triaging issues, read `docs/agents/triage-labels.md`.

### Domain docs

Use a single-context glossary and ADR layout. Before exploring the codebase, read `docs/agents/domain.md`.
