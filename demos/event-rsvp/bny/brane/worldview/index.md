# Event RSVP Knowledge Base

Architectural knowledge for a Rails API: events, RSVPs, capacity limits, waitlist promotion, and fairness.

## Core Domain
- **[Event RSVP Core](domain/event-rsvp-core.md)** — Entities (Event, RSVP, User), capacity enforcement, waitlist promotion
- **[RSVP State Machine](domain/rsvp-state-machine.md)** — 7 states (`pending` → `no_show`), valid transitions, promotion confirmation window, audit trail
- **[Undo & Forgiveness](domain/undo-and-forgiveness.md)** — 5-minute cancellation grace period, undo tokens, soft decline pattern

## Concurrency & Data Integrity
- **[Concurrency Patterns](domain/concurrency-patterns-reservations.md)** — SELECT FOR UPDATE, optimistic locking, atomic counters, hybrid approach
- **[Isolation Levels](domain/isolation-levels-and-anomalies.md)** — READ COMMITTED pitfalls, when to use SERIALIZABLE
- **[Idempotency & Retry Safety](domain/idempotency-and-retry-safety.md)** — Natural keys, promotion idempotency, at-least-once delivery

## Failure Modes
- **[Edge Cases & Failures](domain/failure-modes.md)** — 13 scenarios: race conditions, temporal bugs, state violations, data integrity
- **[Distributed Failures](domain/distributed-failure-modes.md)** — Partial failure, split brain, thundering herd, saga pattern

## API Design
- **[API Design Patterns](domain/api-design-patterns.md)** — REST resource modeling, response envelopes, waitlisting as success (201)
- **[Progressive Disclosure](domain/progressive-disclosure-api.md)** — 3-level API complexity, sparse fieldsets, versioning
- **[Error Recovery](domain/error-recovery-ux.md)** — Error taxonomy, actionable responses, degraded operation, partial success

## Fairness & Allocation
- **[Fairness Models](domain/fairness-models.md)** — FIFO (default), lottery, stride scheduling, priority-based, formal properties
- **[Weighted Lottery](domain/weighted-lottery-allocation.md)** — Probabilistic allocation, real-world evidence, mechanism design
- **[Privacy & Visibility](domain/privacy-and-visibility.md)** — 4 visibility levels, stalking risk, GDPR, privacy-by-default

## Behavioral & Economic
- **[No-Show Problem](domain/no-show-problem.md)** — 30-50% no-show rates, deposits, confirmation loops, reputation, predictive models
- **[Game Theory](domain/game-theory-rsvps.md)** — Early bird dilemma, waitlist hedging, mechanism design principles
- **[Capacity as Inventory](domain/capacity-as-inventory.md)** — ATP, safety stock, overbooking, demand forecasting

## Time, Lifecycle & Communication
- **[Time as Design Material](domain/time-as-design-material.md)** — Event phases, registration windows, time zones, DST
- **[Notification Timing](domain/notification-timing.md)** — Promotion windows, channel strategy, quiet hours, batch vs real-time
- **[Real-Time Updates](domain/real-time-and-live-updates.md)** — WebSockets, SSE, polling, thundering herd mitigation

## Extended Features
- **[Group RSVPs & Plus-Ones](domain/group-rsvps-and-plus-ones.md)** — Party size, partial fit (skip-with-retain), cascading cancellations
- **[Recurring Events](domain/event-series-recurring.md)** — Series patterns, per-instance vs series-level RSVPs
- **[Event Discovery](domain/event-discovery-social-graph.md)** — Co-attendance signals, recommendations, cold start

## Implementation
- **[Rails Patterns](domain/implementation-patterns-rails.md)** — Service objects, Result structs, transactions, denormalized counters
- **[Organizer Experience](domain/organizer-experience-api.md)** — Bulk ops, analytics, webhooks, RBAC
- **[Testing Taxonomy](domain/testing-taxonomy.md)** — Contract, property, boundary, golden file tests

## Open Questions
- **[Open Questions](domain/open-questions.md)** — Abuse prevention, capacity reduction policy, hard vs soft limits, recurring event identity
