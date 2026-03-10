# Privacy and Attendee Visibility
Attendee list visibility is a safety issue, not just a preference — visible lists reveal planned location and time, creating stalking risk.

## Visibility Levels
- **Public** — anyone can see the attendee list (Meetup model)
- **Attendees only** — you must RSVP to see who else is going
- **Organizer only** — attendees are hidden from each other
- **Count only** — "23 attending" but no names

## Social Dynamics
- People RSVP because they see friends attending (positive network effect)
- People avoid events when they see certain people attending (negative network effect)
- Visible waitlist positions create anxiety and status comparison
- Some users don't want their attendance patterns tracked or visible

## Safety Considerations
- **Stalking risk**: visible attendee lists reveal someone's planned location and time
- **Domestic violence**: attendance visibility can be physically dangerous
- **Professional risk**: your boss seeing you at a competitor's event
- These risks mean privacy-by-default is a safety requirement, not a preference

## GDPR and Data Rights
- Attendee lists are personal data under GDPR
- **Right to erasure**: deleting account must remove RSVP history from public-facing views (see [failure scenario #10](failure-modes.md) for soft-delete implications)
- **Data portability**: users should be able to export their event history
- **Retention**: RSVP records should have a defined retention period after event ends
- **Consent**: collecting RSVP data for [discovery/recommendation](event-discovery-social-graph.md) requires explicit consent

## Default Stance
**Privacy-by-default (organizer only) is the platform default.** Let organizers explicitly choose more open visibility. Never default to public attendee lists.

This default is referenced by [Progressive Disclosure](progressive-disclosure-api.md) and enforced in [API attendee list endpoints](api-design-patterns.md).

## Tension with Discovery
The [Event Discovery](event-discovery-social-graph.md) features rely on analyzing RSVP patterns (co-attendance, recommendations). This conflicts directly with privacy-by-default. Users may not realize that their RSVP pattern — Tuesday pottery, Thursday support group, Saturday political rally — creates a detailed behavioral profile. Recommendation features must be opt-in.
