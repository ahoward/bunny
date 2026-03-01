# Guardrails System

## Enforcement Layers

1. **`.bny/guardrails.json`** — machine-readable constraints
   - Protected files (never modify without human approval)
   - Blast radius limits (max files/lines per PR, dependency rules)
   - Forbidden actions (never do autonomously)
   - Actions requiring human approval

2. **Git hooks** — `.githooks/pre-commit` runs `post_flight`, `.githooks/pre-push` runs tests

3. **Dev scripts** — structured validation pipeline:
   - `pre_flight` → before starting work
   - `test` → after any code change
   - `post_flight` → before committing
   - `health` → system health check

4. **Locked tests** — after gemini review, tests cannot be changed without human sign-off

## Decision Log

`.bny/decisions.md` — append-only record of what was done and why. Provides audit trail for autonomous agent actions.
