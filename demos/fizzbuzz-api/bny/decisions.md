# Decision Log

Append-only record of decisions made during development.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-04 | Built fizzbuzz REST API with raw Bun.serve(), tests-first | Zero deps beyond Bun stdlib; 24 tests (unit + integration) covering single, range, errors, health, 404s; max range 1000 |
