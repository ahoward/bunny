# Recurring Events and Series
The simplest RSVP model treats events as isolated instances, but recurring events (weekly meetups, annual conferences, multi-session workshops) require either a first-class series entity or carefully managed individual events.

## Patterns
- **Weekly meetup** — same time, same place, every Tuesday
- **Conference series** — annual event, different dates each year
- **Multi-session** — 4-part workshop, RSVP covers all sessions
- **Drop-in** — recurring but independent, RSVP per instance

## Design Questions
- **Is a series an entity, or just a tag linking events?** As a tag: simpler, but no series-level operations. As an entity: enables series-level RSVPs, shared capacity rules, and cross-instance loyalty tracking for [fairness models](fairness-models.md).
- **Series vs. instance RSVP?** "RSVP to all future Tuesdays" vs. "RSVP to next Tuesday only." Series-level RSVPs need per-instance override ("I can't make the 15th").
- **Capacity changes between instances** — If instance 3 has lower capacity, series RSVPs may need to be waitlisted for that instance even though they're accepted for the series.
- **Cross-instance loyalty** — Does attending 10 consecutive meetups earn [waitlist priority](fairness-models.md) for the next one? This is a strong argument for series as a first-class entity.

## Cancellation Cascades
Cancelling a series vs. cancelling one instance. Users expect different behavior:
- "I can't make next Tuesday" ≠ "I'm leaving the group"
- The system needs per-instance and series-level RSVP states
- Cancelling a series should prompt: "Cancel just the next instance, or all future instances?"

## Data Model Impact
- `EventSeries` entity with recurrence rules (RRULE format from iCalendar)
- Events generated from series template
- RSVP inheritance: series-level default, instance-level override
- [Registration windows](time-as-design-material.md) may roll: always open for the next N instances

See [Open Questions](open-questions.md) for the unresolved decision on whether series should be a first-class entity.
