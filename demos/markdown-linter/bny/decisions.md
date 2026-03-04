# Decision Log

Append-only record of decisions made during development.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-04 | Implemented MVP CLI linter with 4 rules (trailing-whitespace, no-multiple-blanks, heading-hierarchy, final-newline), remark-parse AST, hybrid rule architecture (line + AST rules), 32 tests passing | Smallest useful thing per scope-creep guardrails; remark for true AST with position data; POD types, rule isolation via try/catch |
