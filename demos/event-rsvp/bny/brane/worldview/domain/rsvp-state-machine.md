# RSVP State Machine and Lifecycle
Every RSVP bug is a state transition that shouldn't have been allowed.

## States
- `pending` — RSVP submitted, not yet processed (useful for queue-based systems)
- `accepted` — confirmed attendee
- `waitlisted` — no capacity, queued for promotion
- `declined` — user explicitly declined or cancelled (terminal unless re-RSVPing)
- `promoted` — moved from waitlist to accepted, awaiting confirmation
- `expired` — promotion offer timed out without response
- `no_show` — marked after event (for reputation systems)

Note: [Undo & Forgiveness](undo-and-forgiveness.md) introduces a `declining` soft state with a grace period. This is a UI/application-layer concept — the database status remains `accepted` during the grace window and only transitions to `declined` after the window expires. This avoids adding a formal state while supporting undo.

## Valid Transitions
```
pending    → accepted (capacity available)
pending    → waitlisted (at capacity)
accepted   → declined (user cancels — triggers waitlist promotion after undo grace period)
waitlisted → promoted (spot opens)
waitlisted → declined (user cancels while waiting)
promoted   → accepted (user confirms promotion)
promoted   → expired (confirmation window closes)
promoted   → declined (user declines promotion)
expired    → waitlisted (re-queued, optional)
accepted   → no_show (post-event marking)
```

## Invalid Transitions (Must Be Rejected)
- `declined → accepted` — User must create a new RSVP, which may waitlist them. This preserves fairness for waitlisted users. The undo grace period (see [Undo & Forgiveness](undo-and-forgiveness.md)) handles the "changed my mind immediately" case *before* the decline is finalized.
- `accepted → waitlisted` — Demotion requires an explicit capacity-reduction flow with organizer action, not a simple state transition. See [failure scenario #3](failure-modes.md) and [Organizer Experience](organizer-experience-api.md).
- `no_show → accepted` — Post-event state is final.
- Any transition on a past event (except to `no_show`).

## The Re-RSVP Problem
User declines, then wants to come again. Three options:
1. **New RSVP** — Loses original position. Fair to waitlisted users but frustrating to the user.
2. **State transition back** — Simple but gameable (decline to "hold" a soft reservation).
3. **Conditional restore** — Allowed only if event isn't full. Pragmatic compromise.

**Recommendation:** Option 1 (new RSVP) for fairness, with the undo grace period covering genuine mistakes. Option 3 is acceptable as a configuration choice for organizers who prefer convenience.

## The Promotion Confirmation Window
The `promoted` state is where most complexity lives. The user has N hours to confirm. During that window:
- Their waitlist slot is consumed
- The capacity slot is "held" for them
- If they don't respond, both are released
- If two people are promoted simultaneously and only one slot remains, the first to confirm wins

This creates a mini-reservation system within the waitlist — the same concurrency problems at a smaller scale. See [Concurrency Patterns](concurrency-patterns-reservations.md) for the locking strategy and [Notification Timing](notification-timing.md) for the channel and timing design.

## State Machine as Code
The state machine should be enforced in code, not just in documentation. Rails gems like `aasm` or `statesman` make invalid transitions raise exceptions. The database should also enforce this via CHECK constraints on the status column:

```sql
ALTER TABLE rsvps ADD CONSTRAINT valid_status
  CHECK (status IN ('pending', 'accepted', 'waitlisted', 'declined', 'promoted', 'expired', 'no_show'));
```

## Audit Trail
Every state transition should be logged with:
- Previous state
- New state
- Timestamp
- Actor (user, system, organizer)
- Reason (user_cancelled, promotion, capacity_change, timeout)

This trail is essential for debugging, dispute resolution, and building the [reputation systems](no-show-problem.md) and [undo mechanisms](undo-and-forgiveness.md).
