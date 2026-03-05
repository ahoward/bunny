# Decision Log

Append-only record of decisions made during development.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-05 | Implemented semver parser, comparator, range parser, and satisfies as 7 files in src/ (types, parse, format, compare, parse_range, satisfies, index) | All 54 antagonist tests pass. Zero dependencies. All range sugar desugared to primitive comparators. POD-only, result types, no exceptions. |
