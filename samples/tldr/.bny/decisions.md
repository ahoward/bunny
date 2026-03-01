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
| 2026-03-01 | Implemented core summarizer with app.call framework, /summarize handler, and bin/tldr CLI | Follows parent bunny patterns (Result envelope, handler registry, invariant tests) with mocked Claude API tests for CI safety |
| 2026-03-01 | Core summarizer | Built via bny next (strange loop iteration) |
| 2026-03-01 | Added URL and stdin support to /summarize handler and CLI | Extends input sources beyond file_path; handler accepts url (fetch) or content (stdin) params; CLI auto-detects input type; 24 tests passing |
| 2026-03-01 | URL and stdin support | Built via bny next (strange loop iteration) |
| 2026-03-01 | Result caching | Built via bny next (strange loop iteration) |
