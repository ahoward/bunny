# Event Discovery and the Social Graph
RSVP data is a social graph in disguise — co-attendance patterns reveal interests and relationships, but analyzing them conflicts with privacy-by-default.

## The Hidden Graph
Every RSVP creates edges:
- User → Event (interest signal)
- User → User (co-attendance, implicit social link)
- User → Topic (derived from event categories)
- Event → Event (shared attendees suggest similarity)

## Discovery Powered by RSVPs
"People who attended X also attended Y" is collaborative filtering applied to events. Trivially derivable from RSVP data but rarely built into RSVP platforms.

### Recommendation Signals
- **Co-attendance frequency** — users who've attended 3+ events together are likely friends
- **RSVP timing** — users who RSVP within minutes of each other may be coordinating
- **Cancellation correlation** — users who cancel together are likely in the same social group
- **Category affinity** — user RSVPs heavily to tech meetups → recommend more tech meetups

## The Cold Start Problem
New users have no RSVP history. New events have no RSVPs. The recommendation engine has nothing to work with.

**Solutions:**
- Onboarding: ask users to select interest categories
- Location-based defaults: show nearby events
- Social bootstrap: import connections from other platforms
- Popularity fallback: show trending events

## Privacy Tension
The better the recommendations, the more RSVP data is analyzed. This conflicts directly with [privacy-by-default](privacy-and-visibility.md).

Users may not realize that their RSVP pattern — Tuesday pottery, Thursday therapy-adjacent support group, Saturday political rally — creates a detailed behavioral profile.

**Requirement:** Discovery and recommendation features must be opt-in, with clear explanation of what data is analyzed. See [Privacy & Visibility](privacy-and-visibility.md) for GDPR consent requirements.

## The Platform vs. Tool Distinction
An RSVP API is a tool. An event discovery platform is a product. The API design decision — how much discovery infrastructure to expose — determines which you're building.

- **Tool APIs** expose: events, RSVPs, users.
- **Platform APIs** also expose: recommendations, trending, "friends attending," categories, search.

## Search and Filtering
Event search is deceptively complex:
- **Geospatial**: events within 10km (requires PostGIS or similar)
- **Temporal**: events this weekend, events after 6 PM (range indexes)
- **Social**: events my friends are attending (graph queries)
- **Capacity**: events with available spots
- **Combined**: "tech meetups near me this week with spots available that my friends are going to"

Each filter dimension requires different indexing strategies. Combined queries need careful query planning or a search engine (Elasticsearch/Meilisearch).
