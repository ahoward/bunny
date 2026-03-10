# Distributed System Failure Modes
The RSVP system becomes a distributed system the moment you add background jobs, email services, or multiple app servers — and distributed systems fail in ways that single-process systems cannot.

## Failure Taxonomy

### 1. Partial Failure
Some components succeed, others fail. The system is in an inconsistent state.

**RSVP example:** RSVP is saved to database. Email confirmation fails. User thinks it didn't work. Retries. Gets "already registered" error. Confused.

**Fix:** Separate the "record the fact" from "notify about the fact." The RSVP is the source of truth. Notification is best-effort with retries. The API response confirms the RSVP regardless of notification status. See [Idempotency](idempotency-and-retry-safety.md) — the retry returns the existing RSVP.

### 2. Split Brain
Two processes both believe they're the authority.

**RSVP example:** Two Sidekiq workers both pick up the same promotion job (duplicate enqueue). Both query the waitlist. Both promote the next person. One RSVP, two promotion attempts — but the unique constraint saves you (if you have one).

**Fix:** Unique constraints ([Concurrency Patterns](concurrency-patterns-reservations.md) Pattern 3). Advisory locks for singleton jobs. [Idempotent handlers](idempotency-and-retry-safety.md).

### 3. Message Ordering
Events arrive out of order.

**RSVP example:** User cancels RSVP. Then re-RSVPs. The cancel message is processed after the re-RSVP due to queue ordering. User's active RSVP is cancelled.

**Fix:** Use timestamps or sequence numbers. Process the latest state, not the latest message. Or use a [state machine](rsvp-state-machine.md) that rejects invalid transitions — `declined → declined` is a no-op, not a destructive operation.

### 4. Thundering Herd
Many users hit the same endpoint simultaneously.

**RSVP example:** Popular event opens registration at noon. 10,000 users hit POST /rsvps simultaneously. Database connection pool exhausted. Everyone gets 503.

**Fix:** Rate limiting. Queue-based processing ([Concurrency Patterns](concurrency-patterns-reservations.md) Pattern 4). Redis pre-check (DECR counter) before hitting the database. Exponential backoff on client retries. See also [Real-Time Updates](real-time-and-live-updates.md) for how real-time broadcasts can trigger herds.

### 5. Cascade Failure
One failure triggers a chain of failures.

**RSVP example:** Email service is slow. RSVP endpoint sends email synchronously. Request times out. User retries. More requests pile up. All workers busy waiting on email. Entire API goes down.

**Fix:** Never do I/O synchronously in the request path. Circuit breakers on external services. Bulkhead isolation (separate worker pools for RSVP processing and notifications).

## The CAP Theorem Lens
For an RSVP system, you almost always want **Consistency** over **Availability** for the reservation path. It's better to show "temporarily unavailable" than to oversell capacity. But for read paths (event listings, attendee counts), eventual consistency is fine — showing a count that's a few seconds stale is acceptable.

## Saga Pattern for Multi-Step RSVP
When RSVP involves multiple steps (check capacity → reserve slot → charge payment → confirm → notify), use a saga:
- Each step has a compensating action (refund, release slot, etc.)
- If any step fails, execute compensating actions in reverse order
- The saga coordinator tracks state and handles retries

For a simple RSVP system without payments, this is overkill. But the moment you add payments, deposits, or external integrations, sagas become essential. See [Error Recovery](error-recovery-ux.md) for how partial success is communicated to users.
