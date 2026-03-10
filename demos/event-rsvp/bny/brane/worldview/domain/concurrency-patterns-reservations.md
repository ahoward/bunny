# Concurrency Patterns for Reservation Systems
Multiple actors competing for finite capacity requires explicit concurrency control — the default (READ COMMITTED without locking) silently allows overbooking.

## The Core Problem
Reservation systems must guarantee that capacity is never oversold (or intentionally oversold by a known amount). This is harder than it sounds because:
- Multiple processes read "slots available" simultaneously
- Between reading and writing, the world changes
- Network partitions, crashes, and retries add chaos

See [Isolation Levels](isolation-levels-and-anomalies.md) for how database isolation levels interact with these patterns.

## Pattern 1: Pessimistic Locking (SELECT FOR UPDATE)
Lock the row before reading. No one else can read or modify until you're done.

```sql
BEGIN;
SELECT * FROM events WHERE id = 42 FOR UPDATE;
-- check capacity
INSERT INTO rsvps (event_id, user_id, status) VALUES (42, 7, 'accepted');
COMMIT;
```

**Pros:** Simple mental model. Guarantees correctness.
**Cons:** Serializes all RSVPs for an event. Under high concurrency, this becomes a bottleneck. Lock wait timeouts. Deadlock risk if multiple rows are locked in different orders.

**When to use:** Low-to-medium concurrency. Most RSVP systems. **Recommended default for this platform.**

### Implementation Notes (Rails)
In Rails, `Event.lock("FOR UPDATE").find(event_id)` acquires the row lock within a transaction. The lock scope should match the contention scope — lock the event row (shared resource), not individual RSVP rows. All reads and writes to `accepted_count` happen inside this lock.

```ruby
ActiveRecord::Base.transaction do
  event = Event.lock("FOR UPDATE").find(event_id)
  if event.accepted_count + party_size <= event.capacity
    event.update!(accepted_count: event.accepted_count + party_size)
    rsvp.save!
  end
end
```

The `event.lock!` shorthand is equivalent for already-loaded records.

## Pattern 2: Optimistic Locking (Version Column)
Read without locking. On write, check that nothing changed since you read.

```sql
UPDATE events SET accepted_count = accepted_count + 1, lock_version = lock_version + 1
WHERE id = 42 AND lock_version = 5 AND accepted_count < capacity;
```

If `affected_rows == 0`, someone else got there first. Retry or waitlist.

**Pros:** No locks held during business logic. Higher throughput under moderate contention.
**Cons:** Retry storms under high contention. Starvation possible (unlucky users keep losing the race). More complex error handling.

**When to use:** Medium concurrency. Events where conflicts are infrequent but possible. Good for organizer capacity changes (low contention, multiple fields updated).

## Pattern 3: Database Constraints as Guards
Don't check-then-insert. Let the database enforce the invariant.

```sql
-- Unique constraint: one RSVP per user per event
ALTER TABLE rsvps ADD CONSTRAINT unique_user_event UNIQUE (user_id, event_id);

-- CHECK constraint enforcing capacity
ALTER TABLE events ADD CONSTRAINT events_accepted_within_capacity CHECK (accepted_count <= capacity);
```

**Pros:** Impossible to violate, regardless of application bugs. Works across multiple app servers.
**Cons:** Capacity checks via constraints are awkward in most RDBMSes. Error handling is less informative (constraint violation vs. "event is full").

**When to use:** Always, as a safety net beneath application-level checks. The unique constraint on `(user_id, event_id)` also provides [natural idempotency](idempotency-and-retry-safety.md) for RSVP creation.

### Implementation Lesson: Two-Layer Idempotency
The unique constraint serves double duty as both a data integrity guard and an idempotency mechanism:
1. Application layer checks `Rsvp.find_by(event_id:, user_id:)` before the transaction (fast path)
2. If two threads pass the check simultaneously, `rescue ActiveRecord::RecordNotUnique` catches the race and returns the existing record

This eliminates the need for client-provided idempotency keys on RSVP creation.

## Pattern 4: Serialized Queue (Background Job)
Don't process RSVPs inline. Push to a queue. A single worker processes them sequentially per event.

```
User submits RSVP → Job enqueued → Worker processes sequentially → User notified
```

**Pros:** Eliminates concurrency entirely for a given event. Perfect ordering. Easy to reason about.
**Cons:** Not real-time — user gets "pending" instead of immediate confirmation. Queue backlog under burst load. Single point of failure per event.

**When to use:** High-demand events (concert tickets, conference registration). When fairness of ordering matters more than speed of confirmation. **Recommended for waitlist promotion** (already async, naturally serialized).

## Pattern 5: Atomic Counter with Lua/Redis
Use Redis DECR to atomically claim a slot, then persist to DB.

```
slots_remaining = DECR event:42:slots
if slots_remaining >= 0:
    persist RSVP to database
else:
    INCR event:42:slots  # give it back
    waitlist the user
```

**Pros:** Extremely fast. Sub-millisecond contention resolution.
**Cons:** Redis is not your database — crash between DECR and DB write means lost slot. Requires reconciliation. Two sources of truth.

**When to use:** Ticket-sale spikes. Flash sales. When you need to shed load before hitting the database. Not needed for typical RSVP workloads.

## Pattern 6: Temporary Holds (Seat Map Pattern)
Used by airlines and theaters. Claim a slot temporarily (5-10 minutes). If not confirmed, it releases.

```
User clicks RSVP → Slot held for 5 min → User confirms → Slot committed
                                        → Timer expires → Slot released
```

**Pros:** Handles slow users and payment flows. Prevents phantom reservations.
**Cons:** Capacity is temporarily reduced by uncommitted holds. Requires a reaper process.

**When to use:** When RSVP involves a multi-step flow (payment, form, confirmation). Note: the [promotion confirmation window](rsvp-state-machine.md) is effectively a hold within the waitlist system.

## The Hybrid Approach (Recommended for This Platform)
Layer the patterns:
1. **Database unique constraint** — safety net, always present
2. **Pessimistic lock (SELECT FOR UPDATE)** — default for RSVP creation
3. **Database CHECK constraint** — `accepted_count <= capacity` as invariant guard
4. **Optimistic lock (lock_version)** — for capacity changes by organizers
5. **Queue** — for waitlist promotion (already async, naturally serialized)

This gives correctness without over-engineering. Start simple, add Redis/queues only when load demands it.

## Rails-Specific Notes
- ActiveRecord supports optimistic locking via `lock_version` column out of the box
- `with_lock` wraps SELECT FOR UPDATE in a transaction
- `Event.lock("FOR UPDATE").find(id)` acquires row lock; `event.lock!` for loaded records
- Unique constraints should back every `validates_uniqueness_of`
- Sidekiq for queue-based promotion processing
- See [Isolation Levels](isolation-levels-and-anomalies.md) for PostgreSQL-specific behavior under Rails' default READ COMMITTED

## Denormalized Counter: Headcount vs Record Count
A critical implementation detail: `accepted_count` should track **headcount** (sum of `party_size`), not the number of RSVP records. This affects every capacity check:
- Increment by `party_size` on accept (not by 1)
- Decrement by `party_size` on cancel/decline
- Capacity comparison: `accepted_count + party_size <= capacity`

The CHECK constraint `accepted_count <= capacity` at the database level ensures this invariant even if application logic has a bug.
