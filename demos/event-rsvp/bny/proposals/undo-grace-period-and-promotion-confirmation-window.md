# Undo Grace Period And Promotion Confirmation Window

Generated: 2026-03-10
Topic: "--yes event RSVP API with capacity management and waitlists"
Effort: M

## Rationale

The worldview repeatedly identifies the promotion confirmation window and undo mechanism as where 'most complexity lives.' The undo-and-forgiveness analysis shows that treating every action as final is 'technically correct and socially hostile' — accidental cancellations that immediately trigger waitlist promotion cause irreversible frustration. The notification timing analysis warns that silent promotions waste capacity, so promotions need an acknowledgment window. These two features share infrastructure (scheduled jobs, time-bounded state) and are natural to build together.

## Worldview References

- domain/undo-and-forgiveness.md
- domain/rsvp-state-machine.md
- domain/notification-timing.md
- domain/failure-modes.md
- domain/distributed-failure-modes.md

## Summary

Add a 5-minute soft-decline grace period for cancellations and a time-bounded promotion confirmation flow, addressing the two highest-complexity areas of the state machine where most real-world RSVP bugs live.

## Implementation Sketch

- Implement application-layer declining soft state: cancellation schedules a job for 5 minutes later, DB status stays accepted until job fires
- Add DELETE /rsvps/:id response with undo_token and undo_expires_at; implement POST /rsvps/:id/undo endpoint
- Implement promoted state with configurable confirmation window (default 24h) — held capacity slot released on expiry
- Add promoted→accepted (user confirms), promoted→expired (timeout), and promoted→declined (user declines) transitions
- Build a reaper job for expired promotions that re-queues the next waitlisted user
- Add audit trail logging for every state transition with actor, reason, and timestamp
