# Domain Docs

This repo uses a single-context layout: `GLOSSARY.md` at the repo root and decisions under `docs/adr/`.

## Before exploring

- Read the root `GLOSSARY.md`.
- Read ADRs under `docs/adr/` that touch the area you are about to work in.

If these files do not exist, proceed silently. The `domain-modeling` skill creates them lazily when terms or decisions are resolved.

## Use the glossary's vocabulary

When naming a domain concept in an issue title, refactor proposal, hypothesis, or test name, use the term defined in `GLOSSARY.md`. Avoid synonyms the glossary explicitly excludes.

If a needed concept is absent, reconsider whether it belongs to this project's domain or note the gap for `domain-modeling`.

## Flag ADR conflicts

If a proposal contradicts an existing ADR, identify the ADR and explain why reopening the decision is warranted.
