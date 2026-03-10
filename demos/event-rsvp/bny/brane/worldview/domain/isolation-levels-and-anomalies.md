# Database Isolation Levels and RSVP Anomalies
The isolation level determines which concurrency bugs are possible — READ COMMITTED (Rails/PostgreSQL default) allows the most common reservation overbooking bug.

## The Four Levels (SQL Standard)

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Performance |
|-------|-----------|-------------------|-------------|-------------|
| READ UNCOMMITTED | Yes | Yes | Yes | Fastest |
| READ COMMITTED | No | Yes | Yes | Fast |
| REPEATABLE READ | No | No | Yes | Medium |
| SERIALIZABLE | No | No | No | Slowest |

## What This Means for RSVP Systems

### READ COMMITTED (PostgreSQL default, Rails default)
Transaction A reads capacity = 50, accepted = 49. Transaction B also reads accepted = 49. Both insert. Now accepted = 51. **Capacity violated.**

This is the most common production bug in reservation systems. The read and write are in the same transaction, but READ COMMITTED allows another transaction to modify the row between your read and your write.

**Fix:** Use `SELECT FOR UPDATE` (see [Concurrency Patterns](concurrency-patterns-reservations.md) Pattern 1), or use a single UPDATE with a WHERE clause that checks capacity atomically:

```sql
UPDATE events SET accepted_count = accepted_count + 1
WHERE id = 42 AND accepted_count < capacity;
```

If `affected_rows == 0`, the event is full — waitlist the user.

### REPEATABLE READ
Prevents non-repeatable reads but allows phantom rows. In PostgreSQL's implementation, the second conflicting transaction gets a serialization error and must retry. In MySQL, behavior differs — test your specific database.

### SERIALIZABLE
All transactions behave as if they ran one at a time. PostgreSQL implements this with Serializable Snapshot Isolation (SSI) — it detects conflicts and aborts one transaction.

**Trade-off:** You must handle serialization failures and retry. But you get correctness without explicit locking.

## The Counter-Intuitive Performance Truth
Higher isolation levels don't always mean worse performance. PostgreSQL's SSI only aborts transactions that actually conflict. For events with low concurrency (most events), SERIALIZABLE adds negligible overhead. The cost only appears when many users RSVP to the same event simultaneously — exactly when you need the protection most.

## Practical Recommendation for This Platform
1. Use **READ COMMITTED** (the default) for most operations
2. Use **explicit locking** (`SELECT FOR UPDATE`) for the RSVP-creation path — see [Concurrency Patterns](concurrency-patterns-reservations.md)
3. Consider **SERIALIZABLE** for the waitlist promotion path, where correctness matters more than throughput
4. **Always** have database constraints as the final safety net regardless of isolation level — see [Concurrency Patterns](concurrency-patterns-reservations.md) Pattern 3

## The Testing Gap
Most test suites run single-threaded. Concurrency bugs are invisible in tests. You need either:
- Multi-threaded integration tests that simulate concurrent RSVPs
- Property-based tests that model concurrent operations
- Load testing with realistic contention patterns

This is the single biggest gap between "works in development" and "works in production" for reservation systems.
