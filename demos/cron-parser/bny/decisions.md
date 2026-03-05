# Decision Log

Append-only record of decisions made during development.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-05 | Implemented cron expression parser with parse + next_times | Zero-dependency 5-field cron parser using expanded sorted sets, result envelope, OR semantics for dom/dow, iteration guard returning error on exhaustion |
