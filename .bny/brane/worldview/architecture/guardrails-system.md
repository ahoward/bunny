# Guardrails System

## Enforcement Layers

1. **Constitution** (`constitution.md`) — foundational principles and governance
   - POD Only, Antagonistic Testing, Unix-Clean, Simplicity (YAGNI), Strange Loop
   - Amendment process: propose with rationale → document with version bump → update dependents
   - Semantic versioning: MAJOR (principle removed/redefined), MINOR (principle added), PATCH (clarifications)
   - Current version: 1.1.0

2. **`.bny/guardrails.json`** — machine-readable constraints
   - Protected files (never modify without human approval)
   - Blast radius limits (max files/lines per PR, dependency rules)
   - Forbidden actions (never do autonomously)
   - Actions requiring human approval

3. **Git hooks** — `.githooks/pre-commit` runs `post_flight`, `.githooks/pre-push` runs tests

4. **Dev scripts** — structured validation pipeline:
   - `pre_flight` → before starting work
   - `test` → after any code change
   - `post_flight` → before committing
   - `health` → system health check

5. **Locked tests** — after gemini review, tests cannot be changed without human sign-off

## Decision Log

`.bny/decisions.md` — append-only record of what was done and why. Provides audit trail for autonomous agent actions.

## Governance Hierarchy

Constitution → Guardrails → Git Hooks → Dev Scripts → Locked Tests

Higher layers constrain lower layers. The constitution defines principles; guardrails.json operationalizes them; hooks and scripts enforce mechanically; locked tests preserve reviewed acceptance criteria.
