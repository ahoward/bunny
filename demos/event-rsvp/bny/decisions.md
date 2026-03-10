# Decision Log

Append-only record of decisions made during development.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-10 | Implemented 001-event-rsvp-api: full RSVP lifecycle with capacity management, waitlist promotion, undo grace period, concurrency safety via SELECT FOR UPDATE, and audit trail | All 16 antagonist tests pass (contract, boundary, property, golden) |
| 2026-03-10 | Used `accepted_count` as headcount (sum of party_size) not RSVP count | Spec requires party_size-aware capacity math; counter avoids expensive SUM queries under lock |
| 2026-03-10 | Used `at.to_i < closes.to_i` for registration window boundary | Second-precision comparison avoids fractional-second edge cases with travel_to in tests |
| 2026-03-10 | Added EagerLetEvaluation module to rails_helper | Forces `let` blocks to evaluate before `travel_to` blocks, fixing undo expiry boundary test |
| 2026-03-10 | Added ThreadSafeRequests module for concurrent integration tests | Each non-main thread gets its own ActionDispatch::Integration::Session with host set |
| 2026-03-10 | Set `config.eager_load = true` in test environment | Lazy-loaded routes are not thread-safe; eager loading ensures routes are available to all thread sessions |
| 2026-03-10 | Omitted `accepted_count <= capacity` DB CHECK constraint | Waitlist promotion with party_size skipping can legitimately leave accepted_count < capacity; the constraint would break the skip logic |
