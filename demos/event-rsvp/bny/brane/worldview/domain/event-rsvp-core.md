# Event RSVP Core Domain
A Rails API for managing events with RSVP tracking, capacity limits, and automatic waitlist promotion — the foundational entities and behaviors that every other file in this knowledge base builds on.

## Entities

### Event
- Title, description, location
- Start time, end time (stored in UTC; time zone identifier stored separately)
- Capacity limit (max attendees)
- Registration window: `registration_opens_at`, `registration_closes_at`
- Lifecycle phases: Created → Registration Open → Full/Waitlist → Closed → Happening → Past (see [Time as Design Material](time-as-design-material.md))

### RSVP
- Belongs to an Event and a User
- Status: `pending`, `accepted`, `waitlisted`, `declined`, `promoted`, `expired`, `no_show` (see [RSVP State Machine](rsvp-state-machine.md) for full transition rules)
- `waitlist_position` (nullable, set when status is `waitlisted`)
- `party_size` (default 1; see [Group RSVPs](group-rsvps-and-plus-ones.md))
- Unique constraint on `(user_id, event_id)` — enforces one RSVP per user per event and provides natural idempotency (see [Idempotency](idempotency-and-retry-safety.md))

### User
- Name, email
- Authentication identity
- Has many RSVPs
- Attendance history (used by [reputation/no-show systems](no-show-problem.md) and [fairness models](fairness-models.md))

## Key Behaviors

- **Capacity enforcement** — RSVPs beyond the limit are waitlisted, not rejected. The system determines status, not the user. A `POST /events/:id/rsvps` never accepts a `status` parameter from the client. See [API Design Patterns](api-design-patterns.md).
- **Automatic promotion** — When someone declines, the first waitlisted person is promoted. Promotion may require confirmation within a time window (the `promoted` state). See [RSVP State Machine](rsvp-state-machine.md) and [Notification Timing](notification-timing.md).
- **Concurrency safety** — The RSVP creation path uses `SELECT FOR UPDATE` to prevent last-spot races. Database unique constraints serve as the final safety net. See [Concurrency Patterns](concurrency-patterns-reservations.md) and [Isolation Levels](isolation-levels-and-anomalies.md).
- **Undo grace period** — Cancellations enter a soft `declining` state for 5 minutes before triggering waitlist promotion. See [Undo & Forgiveness](undo-and-forgiveness.md).
- **Attendee visibility** — Privacy-by-default (organizer only). Organizers can choose more open visibility. See [Privacy & Visibility](privacy-and-visibility.md).

## Relationships

```
User ──< RSVP >── Event
         │
         ├── status (pending | accepted | waitlisted | declined | promoted | expired | no_show)
         ├── waitlist_position (nullable)
         └── party_size (default 1)
```

## Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Concurrency default | Pessimistic locking (SELECT FOR UPDATE) | Correct for low-to-medium concurrency; most events don't need Redis |
| Waitlist fairness default | FIFO | Simplest, most intuitive; weighted lottery available per-event |
| Promotion model | Configurable: auto or confirmation-required | Auto is simpler; confirmation prevents promoting disinterested users |
| Notification coupling | Async (background job) | Never block the RSVP write path on email/SMS delivery |
| Overbooking | Not enabled by default | Organizer opt-in; requires historical no-show data to calibrate |

## Key Invariants

1. `accepted_count <= capacity` (enforced by DB constraint + application lock)
2. One RSVP per user per event (enforced by unique constraint)
3. Waitlist is ordered by `created_at` (FIFO default) or by weighted score
4. Every state transition is logged with actor, reason, and timestamp (see [State Machine audit trail](rsvp-state-machine.md#audit-trail))
5. Notifications are best-effort; the RSVP record is the source of truth (see [Distributed Failures](distributed-failure-modes.md))
