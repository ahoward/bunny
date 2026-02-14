# Decision Log

Append-only record of decisions made during development.
Each entry includes date, decision, and brief rationale.

**Rules:**
- Append only — never edit or delete previous entries
- One line per decision
- Keep rationale to one sentence

## Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-14 | Lifted app.call + Result envelope pattern from brane | Proven handler registry with typed envelopes and optional emit callbacks |
| 2026-02-14 | Named global object `app` instead of `sys` | Broader than API, clearer than sys — it is the running application context |
| 2026-02-14 | Scripts live in `./script/` with shebangs, not package.json | Pure Unix — any language, tab-completable, no indirection |
| 2026-02-14 | Merged budget/scope and blast radius into single guardrails.json | One source of truth for all agent constraints |
| 2026-02-14 | Used tests/fixtures/ instead of tests/.seeds/ for tracked test data | .seeds/ is gitignored; fixtures need version control |
| 2026-02-14 | Structured logging defaults ON, disable with BUNNY_LOG=0 | Dark factory needs observability by default |
