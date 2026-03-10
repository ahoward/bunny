# Idempotency and Retry Safety
Every mutation in a distributed RSVP system must be safe to retry, because "did my request succeed?" is sometimes unanswerable.

## Why Idempotency Matters for RSVPs
- Network timeout: user's RSVP request times out. Did it go through? User retries.
- Background job crash: promotion job promoted 3 of 5 users. Restarted. Must not double-promote.
- Webhook retry: payment provider sends confirmation twice. Must not create two RSVPs.

## Idempotency Key Pattern
Client generates a unique key (UUID) per logical operation. Server stores it.

```
POST /events/42/rsvps
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```

Server checks: have I seen this key before? If yes, return the cached response. If no, process and store.

**For RSVPs:** The natural idempotency key is `(user_id, event_id)`. A unique constraint on this pair makes RSVP creation naturally idempotent — the second insert fails, and you return the existing RSVP. This is enforced as a [database constraint](concurrency-patterns-reservations.md).

## Idempotent Operations in the RSVP Domain

| Operation | Naturally Idempotent? | Strategy |
|-----------|----------------------|----------|
| Create RSVP | Yes (unique constraint) | Upsert or return existing |
| Cancel RSVP | Yes (already cancelled) | Check status, no-op if already cancelled |
| Promote from waitlist | **No** | Track promotion state per-RSVP (see below) |
| Send notification | **No** | Deduplication via message ID + sent log |
| Update event capacity | Yes (set to value) | Last write wins |

## The Promotion Idempotency Problem
The most dangerous non-idempotent operation: waitlist promotion.

Scenario: Job promotes user A. Crashes before marking job complete. Job restarts. Promotes user A again (no-op, already accepted). Then promotes user B (the next in line). But user B was already promoted in the first run too. Now user C gets promoted — one too many.

**Fix:** Track promotion state per-RSVP, not per-job. Each RSVP has a `promoted_at` timestamp. The promotion job queries for the next N unpromoted waitlisted RSVPs where `accepted_count < capacity`. This is inherently idempotent — re-running the query returns the same results if nothing changed.

This aligns with the [serialized queue pattern](concurrency-patterns-reservations.md) for promotion processing.

## At-Least-Once vs. Exactly-Once
Distributed systems can guarantee at-most-once (fire and forget) or at-least-once (retry until confirmed). Exactly-once is impossible in theory but achievable in practice through idempotent receivers.

For RSVPs: use at-least-once delivery for all mutations, with idempotent handlers. This means:
- Every API endpoint must handle duplicate requests gracefully
- Every background job must be re-runnable without side effects
- Every notification must be deduplicable

See [Distributed Failures](distributed-failure-modes.md) for the broader failure taxonomy that makes idempotency essential.
