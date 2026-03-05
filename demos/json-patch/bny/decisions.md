# Decision Log

Append-only record of decisions made during development.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-05 | Implemented RFC 6902 JSON Patch library (src/types.ts, pointer.ts, deep_clone.ts, deep_equal.ts, validate.ts, ops.ts, apply.ts, index.ts) | All 6 operations, atomic rollback via deep clone, Result envelopes, prototype pollution protection, RFC 6901 pointer resolution. 36/37 tests pass — 1 failure is test bug (fc.jsonObject not a function in fast-check). |
