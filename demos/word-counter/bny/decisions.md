# Decision Log

Append-only record of decisions made during development.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-04 | Implemented 001-cli-tool-counts: count_text module + wc-tool CLI with wc-compatible output format (8-char padded columns), byte-based character counting, stdin support, multi-file totals, exit code 1 on missing files | Matches wc behavior for Unix composability; tests-first with 13 passing tests |
