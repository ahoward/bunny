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
| 2026-03-01 | Used bun:sqlite for bookmark storage instead of JSON file store | SQLite is built-in to Bun, handles concurrent access, and the seed.md specifies sqlite storage |
| 2026-03-01 | Stored tags as JSON string in TEXT column | Simple serialization that works for the current query patterns without needing a join table |
| 2026-03-01 | Combined save+list as P1 (both critical for MVP), delete as P2 | Can't demo a bookmark app without both writing and reading; delete is less essential |
| 2026-03-01 | Core bookmark API | Built via bny next (strange loop iteration) |
| 2026-03-01 | Search and filtering | Built via bny next (strange loop iteration) |
| 2026-03-01 | Markdown export | Built via bny next (strange loop iteration) |
