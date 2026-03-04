# Decision Log

Append-only record of decisions made during development.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-04 | Implemented word counter CLI with count_words/count_lines/count_chars + CLI with --json/--words/--lines/--chars flags | Core feature per seed.md; POSIX wc semantics for words (whitespace split), lines (newline count), chars (code points not bytes); 31 tests green |
