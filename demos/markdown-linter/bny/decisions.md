# Decision Log

Append-only record of decisions made during development.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-04 | Implemented markdown linter CLI with hybrid tokenizer, 8 lint rules, 3 output formats, and CLI with exit codes | Followed worldview recommendations: hybrid parser for accuracy+speed, POD types, tests-first (42 tests), Bun-native for fast startup |
