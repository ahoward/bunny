# Failure Modes and Edge Cases
A catalog of concrete failure scenarios with cross-references to the architectural patterns that address each one.

## Race Conditions
1. **Last-spot double-insert** — Two users RSVP simultaneously for the last spot. Both read capacity as available. Both insert. Capacity exceeded. → Solved by [pessimistic locking (SELECT FOR UPDATE)](concurrency-patterns-reservations.md) and [database constraints](concurrency-patterns-reservations.md).
2. **Cancel-promote-RSVP race** — User A cancels. Waitlist promotion job starts. User B RSVPs. Promotion and new RSVP both claim the freed slot. → Solved by [serialized queue for promotion](concurrency-patterns-reservations.md) combined with atomic capacity check.
3. **Capacity reduction with overflow** — Organizer reduces capacity from 100 to 50 while 80 people are accepted. Who gets bumped? → Requires explicit [organizer capacity-reduction flow](organizer-experience-api.md). Must track *reason* for status change so capacity increases can auto-restore (see [Undo & Forgiveness](undo-and-forgiveness.md)).

## Temporal Edge Cases
4. **Last-minute RSVP** — RSVP submitted at 11:59 PM for event starting at 12:00 AM. → Governed by `registration_closes_at` (see [Time as Design Material](time-as-design-material.md)). Organizer-configurable, not platform-decided.
5. **Cross-timezone confusion** — Event time zone is PST. User is in Tokyo. "Tomorrow's event" means different things. → Store all times in UTC with explicit time zone identifier. Display both the event's local time and the user's local time (see [Time as Design Material](time-as-design-material.md)).
6. **DST nonexistent time** — Event at 2 AM on spring-forward day. That time doesn't exist. → Use IANA time zone database (`America/Los_Angeles`, not `PST`). Libraries like `tzinfo` handle DST transitions.

## State Machine Violations
7. **Cancel-uncancel whiplash** — User RSVPs, gets accepted, event is cancelled, event is un-cancelled. What's the RSVP status? → If event cancellation is a soft state, restore all RSVPs to their pre-cancellation status. Requires the [audit trail](rsvp-state-machine.md) to record reason.
8. **Declined promotion re-queue** — User is promoted from waitlist, declines promotion. Do they go back on the waitlist or are they removed entirely? → Per [State Machine](rsvp-state-machine.md): `promoted → declined` is terminal. User must create a new RSVP if they change their mind.
9. **Zero-capacity event** — Organizer changes capacity to 0. All accepted RSVPs should become... what? → Same as scenario #3. This is a capacity-reduction flow, not a simple state transition.

## Data Integrity
10. **Deleted user orphan** — User deletes account. RSVP records reference a deleted user. → Soft delete users. Cascade soft-delete to RSVPs. Decrement accepted count and trigger waitlist promotion for formerly-accepted RSVPs. Hard delete personal data per [GDPR requirements](privacy-and-visibility.md).
11. **Capacity inconsistency** — Event has 50 accepted RSVPs but capacity is 30. → This should be impossible if [database constraints](concurrency-patterns-reservations.md) are in place. If found: freeze new RSVPs, alert organizer, reconcile by audit trail analysis.

## Operational
12. **Promotion job crash** — Promotion job crashes halfway through. 3 of 5 waitlisted users were promoted. → [Idempotent promotion](idempotency-and-retry-safety.md): track promotion state per-RSVP, not per-job. Re-running the job promotes only the remaining 2.
13. **Silent promotion** — Email service is down. Promotion happens silently. User never knows they got a spot. → [Notifications are async and best-effort](distributed-failure-modes.md). The RSVP record is the source of truth. Queue notifications for retry. Use [multiple channels](notification-timing.md) (email + push + in-app) so one channel's failure doesn't cause total silence.
