# Testing Taxonomy
Four complementary test types — contract, property, boundary, golden — cover different failure classes that no single type catches alone.

## Contract Tests
Verify that API endpoints honor the user-scenario contracts: correct HTTP status codes, response envelope structure, state transitions, and side effects.

**What they catch:** Broken API contracts, wrong status codes, missing fields, incorrect business logic for the happy path.

**Example:** POST /events/:id/rsvps under capacity → 201, status "accepted", accepted_count incremented.

## Property Tests
Assert invariants that must hold regardless of input sequence. Generate random inputs and verify properties after each operation.

**What they catch:** Subtle state corruption that specific test cases miss. Off-by-one errors in counters. Invariant violations under unexpected input combinations.

**Key properties for RSVP systems:**
- `accepted_rsvps.sum(:party_size) == event.accepted_count` (headcount consistency)
- If waitlisted RSVPs exist, `accepted_count + first_waitlisted.party_size > capacity` (no eligible promotions were missed)
- Duplicate POST returns same RSVP ID (idempotency)

## Boundary Tests
Test at the exact edges of validity — temporal boundaries, capacity limits, concurrency races.

**What they catch:** Off-by-one errors, race conditions, temporal edge cases.

**Critical boundaries for RSVP systems:**
- Concurrent RSVPs for last spot (thread-based, not mocked)
- RSVP 1 second before registration closes vs at close
- Undo 1 second past grace period
- Party size of 0, negative, exactly capacity, capacity + 1

## Golden File Tests
Freeze time and inputs, snapshot the exact JSON response, compare against a golden file.

**What they catch:** Accidental serialization changes, timestamp format drift, field renames.

**Implementation:** `travel_to` fixes time, known seed data with predictable IDs, diff against `tests/golden/fixtures/*.json`.

## Testing Infrastructure Decisions

### Table Truncation vs Transaction Rollback
Use `TRUNCATE TABLE ... CASCADE` before each test instead of wrapping tests in transactions. Transactions interfere with:
- Thread-based concurrency tests (threads can't see uncommitted data from the test transaction)
- Background job testing (jobs run outside the test transaction)
- `SELECT FOR UPDATE` testing (locks behave differently inside nested transactions)

### Thread-Safe Request Helpers
For concurrency tests, each thread needs its own `ActionDispatch::Integration::Session`. A `ThreadSafeRequests` mixin detects background threads and creates fresh sessions. Without this, concurrent HTTP calls share state and produce false results.
