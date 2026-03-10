# Notification Timing and Communication Design
When and how users are notified shapes their experience more than the underlying data model — a silent promotion is a wasted promotion.

## Critical Notification Points
1. **RSVP confirmed** — immediate
2. **Waitlisted** — immediate, with position
3. **Promoted from waitlist** — time-sensitive, needs acknowledgment window (see [promotion confirmation](rsvp-state-machine.md))
4. **Event reminder** — 24h and 1h before
5. **Event cancelled** — immediate
6. **Event changed** (time/location) — immediate, re-confirmation needed?
7. **Waitlist closed** — post-event, notify remaining waitlisted users they won't be promoted

## The Promotion Window Problem
User gets promoted from waitlist at 11 PM for an event at 9 AM. They don't see the notification. They don't show up. The spot is wasted.

### Options
- Require confirmation within N hours, else re-waitlist (the `promoted → expired` [state transition](rsvp-state-machine.md))
- Promote multiple people simultaneously, first to confirm gets the spot
- Set a promotion cutoff (no promotions within 12h of event start)

The promotion cutoff is critical — promoting someone who can't possibly see the notification wastes capacity. Better to [overbook slightly](capacity-as-inventory.md) than to promote into the void.

## Channel Strategy
- **Email**: reliable but slow (hours to read). Best for: confirmations, event changes, reminders.
- **SMS**: fast but intrusive. Best for: time-sensitive promotions, imminent event changes.
- **Push notification**: fast, requires app. Best for: real-time updates.
- **In-app only**: misses people who don't check. Never sufficient alone for time-sensitive actions.

For promotions: use **multiple channels simultaneously**. If the email service is down ([distributed failure](distributed-failure-modes.md)), push/SMS may still deliver.

## Quiet Hours
Should the system respect time zones and avoid 2 AM notifications? This delays time-sensitive promotions. Recommendation: respect quiet hours for non-urgent notifications (reminders), but send promotions immediately with the understanding that the confirmation window starts when the user opens/acknowledges the notification, not when it's sent.

## Batch vs. Real-Time
If 5 people cancel simultaneously, send 5 individual promotion notices or batch into one update? Batch — individual rapid-fire notifications create confusion and [thundering herd](distributed-failure-modes.md) risk on the confirmation endpoint.

## Notification as Decoupled Concern
Notifications must never block the RSVP write path. The RSVP record is the source of truth; notifications are best-effort with retry. See [Distributed Failures](distributed-failure-modes.md) and [failure scenario #13](failure-modes.md).
