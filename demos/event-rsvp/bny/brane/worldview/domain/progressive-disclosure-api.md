# Progressive Disclosure in API Design
A great API serves both the 5-minute integration and the 5-month deep build — by making simple things simple and complex things possible.

## The Two-Audience Problem
Event APIs serve two radically different consumers:
1. **Quick integrators** — "I just want to show events and let people RSVP"
2. **Platform builders** — "I'm building a full event management system on your API"

Designing for #2 terrifies #1. Designing for #1 frustrates #2.

## Progressive Disclosure Applied

### Level 1: Happy Path Only
Minimal request, maximal defaults:
```
POST /events/:id/rsvps
Body: {}
```
Authenticated user RSVPs. Status is [server-determined](api-design-patterns.md). No configuration needed. Response includes everything the client needs to display a confirmation.

### Level 2: Options Revealed on Demand
```
POST /events/:id/rsvps
Body: { "party_size": 3, "note": "Dietary: vegetarian" }
```
Additional fields accepted but never required. Clients discover capabilities through API documentation, not through required field errors. See [Group RSVPs](group-rsvps-and-plus-ones.md) for party_size implications.

### Level 3: Power User Controls
```
POST /events/:id/rsvps
Body: { "party_size": 3, "idempotency_key": "...", "notification_preference": "sms" }
Headers: { "X-Promotion-Callback": "https://..." }
```
Webhooks, custom notification channels, [idempotency keys](idempotency-and-retry-safety.md) — available for sophisticated integrators, invisible to everyone else.

## Sparse Fieldsets
Not every client needs every field. `GET /events/:id?fields=title,start_time,spots_remaining` returns only what's requested. This reduces payload size, improves mobile performance, and lets the API evolve without breaking lean consumers.

## Default Behaviors That Work
The hardest design decision: what should the defaults be?
- Default RSVP status: server-determined (accepted or waitlisted)
- Default visibility: organizer-only ([privacy by default](privacy-and-visibility.md))
- Default notification: email only
- Default party size: 1
- Default promotion: automatic (no confirmation required) — organizer can switch to confirmation-required per [State Machine](rsvp-state-machine.md)

Every default is an opinion about what "most users want." Wrong defaults create friction for the majority to serve the minority.

## Versioning Strategy
APIs that serve events must survive schema evolution:
- New RSVP states (adding `promoted` to the enum)
- New event fields (adding `virtual_url` for hybrid events)
- Behavioral changes (switching from auto-promotion to confirmation-required)

URL versioning (`/v2/events`) is blunt but clear. Header versioning (`Accept: application/vnd.rsvp.v2+json`) is RESTful but obscure. Date-based versioning (`API-Version: 2024-01-15`) is honest about the reality that APIs change continuously.

## Hypermedia: Useful or Overhead?
Should the RSVP response include links to valid next actions?
```json
{
  "rsvp": { "status": "accepted" },
  "links": {
    "cancel": { "href": "/rsvps/42", "method": "DELETE" },
    "event": { "href": "/events/7" }
  }
}
```
For browser-based clients consuming JSON, this is usually ignored. For truly decoupled systems, it enables client evolution without hardcoded URLs. Most teams skip it and don't regret it.
