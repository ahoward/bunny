# Time as Design Material
Every feature in an RSVP system interacts with time in non-obvious ways — time zones, lifecycle phases, and registration windows are architectural concerns, not display concerns.

## The Event Lifecycle Has Phases
```
[Created] → [Registration Open] → [Full/Waitlist] → [Closing Soon] → [Closed] → [Happening] → [Past]
```

Each phase changes what actions are valid:
- **Created:** only organizer can see, no RSVPs allowed
- **Registration Open:** RSVPs accepted, displayed publicly
- **Full/Waitlist:** new RSVPs go to waitlist, cancellations trigger [promotion](rsvp-state-machine.md)
- **Closing Soon:** optional deadline approaching warnings
- **Closed:** no new RSVPs, modifications may be locked
- **Happening:** check-in mode, real-time attendance
- **Past:** read-only, [no-show marking](rsvp-state-machine.md), feedback collection

## Registration Windows
Not all events accept RSVPs from the moment of creation. Common patterns:
- Opens at a specific date/time (concert tickets)
- Opens N days before the event
- Closes N hours before the event
- Rolling: always open for the next instance in a [series](event-series-recurring.md)

The API must handle: "RSVP submitted before registration opens" and "RSVP submitted after registration closes." Both need clear [error responses](error-recovery-ux.md), not silent failures.

## Countdown UX
Time remaining until registration opens/closes drives urgency. The API should expose:
- `registration_opens_at`
- `registration_closes_at`
- `event_starts_at`
- Server-provided `current_time` (so clients don't rely on potentially wrong device clocks)

Return absolute times only — relative times ("starts in 3 days") create caching problems and change every second. Let the client compute relative displays.

## Time Zones Are Never Simple
- Store all times in UTC
- Store the event's local time zone separately (`America/Los_Angeles`, not `PST` — use IANA identifiers)
- Display in the viewer's local zone with the event's zone as reference: "This event is at 7 PM Pacific (10 PM your time)"
- DST edge cases: an event at 2 AM on spring-forward day doesn't exist. IANA tz libraries handle this; string offsets like "PST" do not. See [failure scenario #6](failure-modes.md).

## The Last-Minute RSVP
Should RSVPs be allowed 5 minutes before the event? During the event? This is organizer-configurable via `registration_closes_at`, not platform-decided. Some events want strict cutoffs (catering). Others want maximum attendance (community meetups).

## Post-Event State Transitions
After an event ends:
- RSVPs become historical records
- Waitlisted users should be notified they won't be promoted
- [No-show marking](rsvp-state-machine.md) window opens (organizer-defined duration)
- Feedback/rating collection starts
- Event data moves toward archival — see [GDPR retention](privacy-and-visibility.md)
