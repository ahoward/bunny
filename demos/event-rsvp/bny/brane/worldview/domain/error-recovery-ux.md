# Error Recovery and Degraded Operation
The best APIs tell you exactly what went wrong and what to do next — every error response should answer: what happened, why, and what can the user do.

## Error Taxonomy for RSVP Systems

### Client Errors (4xx) — User Can Fix
| Code | Scenario | Recovery Action |
|------|----------|----------------|
| 400 | Invalid party size (0 or negative) | Fix the value |
| 401 | Not authenticated | Log in |
| 403 | Private event, not invited | Request invitation |
| 404 | Event doesn't exist (or deleted) | — |
| 409 | Already RSVPed to this event | Show existing RSVP (see [idempotency](idempotency-and-retry-safety.md)) |
| 422 | Registration closed / event in past | — |
| 429 | Too many requests | Wait and retry (see Retry Guidance below) |

Note: Waitlisting is **not** an error — it's a `201 Created` with `status: waitlisted`. See [API Design Patterns](api-design-patterns.md).

### Server Errors (5xx) — System Problem
| Code | Scenario | Recovery Action |
|------|----------|----------------|
| 500 | Unhandled exception | Retry once, then report |
| 502 | Upstream service down | Retry with backoff |
| 503 | Overloaded (popular event launch) | Retry with jitter |

## The Actionable Error Response
```json
{
  "error": {
    "code": "registration_closed",
    "message": "Registration for this event closed 2 hours ago.",
    "details": {
      "closed_at": "2025-03-15T17:00:00Z",
      "event_starts_at": "2025-03-15T19:00:00Z"
    },
    "actions": [
      { "label": "View similar events", "href": "/events?similar_to=42" },
      { "label": "Contact organizer", "href": "/events/42/contact" }
    ]
  }
}
```

## Degraded Operation Modes
When parts of the system fail, what still works?

### Email service down
- RSVPs still accepted (core function works)
- Confirmations queued for later delivery
- User sees "RSVP confirmed. Confirmation email may be delayed."
- See [Distributed Failures](distributed-failure-modes.md) — never block the write path on notifications.

### Search/discovery down
- Direct event links still work
- Browse by category falls back to cached results
- New events don't appear in search until recovery

### Database read replica lag
- Attendee counts may be slightly stale
- User's own RSVP status reads from primary (strong consistency for personal data)
- Event listings use replica (eventual consistency acceptable)

## Retry Guidance in Headers
```
HTTP/1.1 503 Service Unavailable
Retry-After: 30
X-RateLimit-Reset: 1710432000
```

Machine-readable retry guidance prevents client-side guessing and [thundering herds](distributed-failure-modes.md) on recovery.

## The Partial Success Problem
Group RSVP for 4 people. 2 succeed, 2 fail (capacity hit mid-batch). The response must communicate partial success clearly:
```json
{
  "rsvps": [
    { "user_id": 1, "status": "accepted" },
    { "user_id": 2, "status": "accepted" },
    { "user_id": 3, "status": "waitlisted" },
    { "user_id": 4, "status": "waitlisted" }
  ],
  "summary": { "accepted": 2, "waitlisted": 2 }
}
```

HTTP status for partial success? `207 Multi-Status` (WebDAV, but increasingly adopted) or `200` with the mixed results in the body. See [Group RSVPs](group-rsvps-and-plus-ones.md) for the partial fit problem that causes this.
