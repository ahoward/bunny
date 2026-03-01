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
| 2026-03-01 | Core mood API | Built via bny next (strange loop iteration) |
| 2026-03-01 | Team trends — /trends/team and /trends/person endpoints | Added daily breakdown (DailyBreakdown type) with 30-day rolling window for team-wide and per-person trend visualization |
| 2026-03-01 | Team trends | Built via bny next (strange loop iteration) |
| 2026-03-01 | Input validation hardening — trim whitespace on user_email and note, reject whitespace-only strings | Closes gaps where "   " bypassed required-field checks; tests-first approach with 9 new test cases |
| 2026-03-01 | Input validation and error handling | Built via bny next (strange loop iteration) |
