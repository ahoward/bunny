# Undo, Forgiveness, and Graceful Mistakes
The best UX assumes users will make mistakes — a 5-minute undo window for cancellations dramatically reduces regret-driven support tickets without compromising fairness.

## The Undo Gap in RSVP Systems
Most RSVP systems treat every action as final and deliberate. Click "decline"? Done. Your spot goes to the waitlist. Changed your mind 3 seconds later? Sorry, you're now #12 on the waitlist for your own spot.

This is technically correct and socially hostile.

## Soft Decline with Grace Period
Instead of immediately releasing a cancelled spot:
1. Mark RSVP as `declining` (soft state — application-layer only, database status remains `accepted`)
2. Show the user: "Your spot will be released in 5 minutes. Undo?"
3. After grace period, transition to `declined` and trigger waitlist promotion
4. If user undoes within the window, cancel the timer — status was never changed

This does **not** add a new state to the [state machine](rsvp-state-machine.md). The `declining` concept lives in the application layer (a scheduled job + UI state), while the database remains in `accepted` until the grace period expires. This avoids complicating the formal state machine while providing undo.

### Implementation Pattern: Token + Scheduled Job
The grace period is implemented with two database columns and a background job:

1. **On cancel:** Generate `undo_token` (cryptographic, `SecureRandom.urlsafe_base64(32)`), set `undo_expires_at` (5 minutes from now), schedule `UndoExpiryJob.set(wait: 5.minutes).perform_later(rsvp.id)`
2. **On undo:** Validate token matches AND `Time.current < undo_expires_at`. Clear both columns. The scheduled job becomes a no-op.
3. **On expiry:** Job fires, checks guards (`status == 'accepted' && undo_token.present? && undo_expires_at <= Time.current`), transitions to `declined` inside a transaction with event lock, decrements `accepted_count`, triggers waitlist promotion.

**Idempotency of the expiry job:** The job checks current state before acting. If the user undid (token cleared), or if another process already expired it, the job safely skips. This makes it safe to retry.

**Race between undo and expiry:** The expiry job uses strict time comparison (`Time.current >= undo_expires_at`). If the undo arrives at the exact expiry moment, it fails (410 Gone). The job is the authority after expiry.

## Undo vs. Re-RSVP
Undo (within grace period) restores the original state perfectly — same position, same status. Re-RSVP (after grace period) is a new action and follows normal rules (may be waitlisted).

The UX must make this distinction clear. "Undo" is a time-limited escape hatch. "RSVP again" is a new request. See the [Re-RSVP Problem](rsvp-state-machine.md) for the fairness implications.

## Waitlisted Cancellation: No Grace Period Needed
When a waitlisted user cancels, the transition to `declined` is immediate — there's no spot to protect, so no undo window is needed. Waitlist positions for users behind them are recalculated immediately.

## Organizer Undo
Organizers accidentally reduce capacity from 100 to 10. 90 people get bumped. Organizer panics and sets it back to 100. Those 90 people should be silently restored, not forced through waitlist promotion.

This requires tracking *why* a status changed in the [audit trail](rsvp-state-machine.md). If the change was due to capacity reduction, a capacity increase should reverse it automatically. See [failure scenario #3](failure-modes.md).

## Confirmation Friction
Destructive actions should require proportional confirmation:
- Decline RSVP → one click + undo window
- Cancel event (organizer) → "Type the event name to confirm" pattern
- Reduce capacity below current accepted count → explicit acknowledgment of who will be affected

## The Forgiveness Principle
Design for the common case (user changed their mind) not the adversarial case (user gaming the system). If 99% of undos are genuine mistakes and 1% are gaming, optimize for the 99%. Anti-gaming measures should be invisible to honest users. This principle also applies to [no-show mitigation](no-show-problem.md) and [fairness model design](fairness-models.md).

## API Design
- `DELETE /rsvps/:id` returns `undo_token` and `undo_expires_at` in the response
- `POST /rsvps/:id/undo?token=xxx` restores the RSVP if within window
- The response to decline includes undo instructions in `meta`
- Expired undo returns `410 Gone` with error code `undo_expired` — semantically correct (the undoable state no longer exists)
- See [API Design Patterns](api-design-patterns.md) for how this fits the REST resource model
