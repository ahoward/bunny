# Capacity-Safe RSVP Creation With Waitlist Promotion

Generated: 2026-03-10
Topic: "--yes event RSVP API with capacity management and waitlists"
Effort: M

## Rationale

The worldview identifies pessimistic locking (SELECT FOR UPDATE) as the recommended default concurrency pattern, and the RSVP state machine defines the critical pending→accepted and pending→waitlisted transitions. Without a correct, race-condition-free RSVP creation path, nothing else matters — the isolation levels analysis shows that READ COMMITTED (Rails default) silently allows overbooking without explicit locking. The core domain file lists `accepted_count <= capacity` as the #1 invariant.

## Worldview References

- domain/event-rsvp-core.md
- domain/concurrency-patterns-reservations.md
- domain/rsvp-state-machine.md
- domain/isolation-levels-and-anomalies.md
- domain/idempotency-and-retry-safety.md
- domain/api-design-patterns.md

## Summary

Implement the core RSVP creation endpoint with pessimistic locking, automatic waitlist placement when at capacity, and a background job that promotes the next waitlisted user when a cancellation occurs. This is the foundational happy path that every other feature depends on.

## Implementation Sketch

- Create Event and RSVP models with unique constraint on (user_id, event_id) and CHECK constraint on status enum
- Implement POST /events/:id/rsvps with SELECT FOR UPDATE on the event row, server-determined status (accepted vs waitlisted), and 201 response with position info
- Implement PATCH /rsvps/:id for user cancellation (accepted→declined) that enqueues a promotion job
- Build a Sidekiq promotion worker that processes waitlist FIFO — idempotent per-RSVP (promoted_at timestamp), serialized per-event
- Handle natural idempotency: duplicate POST returns existing RSVP with 200
- Add multi-threaded integration tests that simulate concurrent RSVPs racing for the last spot
