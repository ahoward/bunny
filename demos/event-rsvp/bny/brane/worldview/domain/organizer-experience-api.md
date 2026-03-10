# The Organizer Experience
Organizers create the supply — their needs are batch-oriented, analytics-heavy, and dashboard-shaped, fundamentally different from the single-event attendee experience.

## Organizer Needs Are Different
Attendees interact with one event at a time. Organizers manage many events, many attendees, over long time horizons.

## The Organizer API Surface

### Event Management
- Create / update / cancel events
- Clone event ("run this again next month") — connects to [Recurring Events](event-series-recurring.md)
- Bulk operations (cancel all events in a series)

### Attendee Management
- View attendee list with RSVP status (respecting [visibility settings](privacy-and-visibility.md))
- Manually accept/decline/waitlist specific users
- Override capacity (add VIP above the limit) — tracked in [audit trail](rsvp-state-machine.md)
- Export attendee list (CSV, PDF, integrate with check-in app)
- Message all attendees or filtered subsets

### Capacity Reduction Flow
When an organizer reduces capacity below current accepted count ([failure scenario #3](failure-modes.md)):
1. Show who will be affected before confirming
2. Record reason as `capacity_change` in audit trail
3. Bump RSVPs in LIFO order (last accepted, first bumped) or let organizer choose
4. If capacity is later increased, [auto-restore](undo-and-forgiveness.md) bumped RSVPs before promoting from waitlist

### Analytics
- RSVP conversion rate (views → RSVPs)
- [No-show rate](no-show-problem.md) by event type
- Cancellation patterns (when do people cancel?)
- Waitlist-to-attend conversion rate
- Repeat attendee percentage

## The Overpowered Organizer Problem
If organizers can override capacity, manually promote, and bypass the waitlist, the [fairness model](fairness-models.md) collapses. "Why am I #3 on the waitlist when the organizer just added their friend?"

**Design tension:** Organizers need flexibility. Users need trust that the system is fair. Transparency helps: "Organizer added 2 reserved spots" visible in the audit log. Reserved spots should draw from a separate pool (see [safety stock](capacity-as-inventory.md)) rather than bypassing the general waitlist.

## Webhooks for Organizer Workflows
Organizers integrate RSVPs into larger workflows:
- New RSVP → update catering count in Google Sheets
- Capacity reached → post to Slack
- Event tomorrow → trigger check-in app setup
- High cancellation rate → alert organizer

Webhook design: event-type filtering, retry with exponential backoff, signature verification, payload versioning.

## Multi-Organizer and Delegation
Real events have multiple organizers with different permission levels:
- **Owner**: full control, can delete event
- **Admin**: manage attendees, edit event details
- **Volunteer**: check-in only, view attendee names
- **Viewer**: see analytics, no write access

This is RBAC applied to event management. The API needs scoped permissions per organizer per event.
