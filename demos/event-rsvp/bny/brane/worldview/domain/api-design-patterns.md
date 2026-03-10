# API Design Patterns for Event Platforms
A great event API is one developers can guess correctly before reading the docs.

## The Resource Model Tension
REST says resources are nouns. But RSVP actions are verbs: "accept," "decline," "promote," "waitlist." The natural impulse is RPC (`POST /rsvp/accept`), but this fights Rails conventions and HTTP semantics.

### The Resource Reframe
- `POST /events/:id/rsvps` — create an RSVP (system decides accepted vs waitlisted)
- `PATCH /rsvps/:id` — update status (user declines, changes to maybe)
- `DELETE /rsvps/:id` — cancel entirely (returns `undo_token` per [Undo & Forgiveness](undo-and-forgiveness.md))

The key insight: the **system** determines accepted vs waitlisted, not the user. The user's intent is "I want to attend." The system's response is the status. This means `POST /rsvps` should never accept a `status` parameter from the client — that's server-determined state based on [capacity and concurrency checks](concurrency-patterns-reservations.md).

## Response Envelope Design
What should a successful RSVP response contain?

```json
{
  "rsvp": {
    "id": 42,
    "status": "waitlisted",
    "waitlist_position": 3,
    "event": { "id": 7, "title": "...", "spots_remaining": 0 },
    "created_at": "..."
  },
  "meta": {
    "message": "You're on the waitlist (#3). We'll notify you if a spot opens."
  }
}
```

The `meta.message` field is controversial — should the API return human-readable messages, or should the client construct them? API-driven messages enable server-side A/B testing of copy, but they couple the API to a specific language and tone.

## Is Waitlisting a Success or Failure?
User wanted to attend, and the system handled that intent by waitlisting them. A `201 Created` with `status: waitlisted` is more correct than a `422`. The RSVP was created — the system just assigned it a different status than the user hoped for. This aligns with the principle that the system determines status.

See [Error Recovery](error-recovery-ux.md) for the full error taxonomy where this distinction matters.

## Pagination and Filtering for Attendee Lists
- Default page size: 25 for API consumers
- Filter by status: `GET /events/:id/rsvps?status=accepted`
- Sort: by RSVP time, by name, by waitlist position
- Cursor-based pagination avoids the shifting-window problem when RSVPs are actively changing
- Visibility rules per [Privacy & Visibility](privacy-and-visibility.md) — the response varies by caller role

## Idempotency in the API Contract
Should `POST /events/:id/rsvps` be idempotent? If a user who already has an RSVP sends another POST:
- Return the existing RSVP with `200`? (idempotent, may confuse clients expecting `201`)
- Return `409 Conflict`? (explicit, but the client must handle it)
- Upsert? (dangerous if the second request has different parameters)

**Recommendation:** Return `200` with the existing RSVP. This aligns with the [natural idempotency](idempotency-and-retry-safety.md) of the `(user_id, event_id)` unique constraint and handles retry-after-timeout gracefully.

## Rate Limiting as UX
Rate limits aren't just abuse prevention — they're a UX signal. A `429` response with a `Retry-After` header tells the client exactly when to try again. Without it, clients implement random backoff, leading to unpredictable user experience. See [Error Recovery](error-recovery-ux.md) for retry header design.

## The Bulk Operations Question
Organizers need bulk actions: accept all waitlisted, cancel all RSVPs, export attendee list. These don't fit neatly into REST's one-resource-per-request model. Options:
- Batch endpoint: `POST /batch` with an array of operations
- Async job: `POST /events/:id/actions/promote-all` returns a job ID, poll for completion
- Collection-level PATCH: `PATCH /events/:id/rsvps` with filter criteria and update payload

The async job pattern is most honest about what's happening — bulk operations take time and may partially fail (see [Error Recovery](error-recovery-ux.md) partial success). See [Organizer Experience](organizer-experience-api.md) for the full organizer API surface.
