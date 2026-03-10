# Open Design Questions
Remaining unresolved decisions not yet addressed by other files in this knowledge base.

## Resolved (Addressed Elsewhere)
The following questions have been explored in dedicated files:
- **Concurrency strategy** → [Concurrency Patterns](concurrency-patterns-reservations.md) recommends pessimistic locking as default, with hybrid layering
- **REST vs. RPC** → [API Design Patterns](api-design-patterns.md) recommends REST (`POST /events/:id/rsvps`)
- **Time zones** → [Time as Design Material](time-as-design-material.md) specifies UTC storage + IANA zone identifier
- **Promotion model** → [RSVP State Machine](rsvp-state-machine.md) supports both automatic and confirmation-required, organizer-configurable

## Resolved During Implementation
- **Party size skip during promotion** → Skip groups that don't fit, retain their waitlist position, re-evaluate on next capacity change. See [Group RSVPs](group-rsvps-and-plus-ones.md).
- **Headcount vs record count** → `accepted_count` tracks headcount (sum of `party_size`), enforced by CHECK constraint. See [Concurrency Patterns](concurrency-patterns-reservations.md).
- **Capacity reduction below accepted count** → Reject with 409 Conflict, include explanation and action link. Organizer must explicitly confirm before bumping.
- **Event deletion strategy** → Soft-cancel via `cancelled_at` timestamp. All non-declined RSVPs transition to `declined` with reason `event_cancelled`. No hard delete.
- **Promoted state scope** → Auto-promote only in Phase 1 (waitlisted → accepted directly). The `promoted` state and confirmation endpoint deferred to Phase 2.
- **RSVP party_size update** → Not supported. User must cancel and re-RSVP. Avoids complex partial-refund/capacity-adjustment logic.
- **Duplicate RSVP with different party_size** → Return existing RSVP as-is (200). Include `meta.message` noting party size differs. Do not silently update.

## Still Open

### Abuse Prevention
- **Spam/bot RSVPs** — Rate limiting, authentication requirements, or CAPTCHA? Likely middleware-layer. What rate limits per user? Per IP? Per event?
- **Sybil attacks** — Multiple accounts to game [weighted lottery](weighted-lottery-allocation.md). Require email verification? Phone verification? How much friction is acceptable?
- **RSVP-and-cancel churning** — Users who RSVP to hold spots then cancel repeatedly. Should this affect [reputation/fairness scores](fairness-models.md)? At what threshold?

### Capacity Reduction Policy
- **Who gets bumped?** — When organizer reduces capacity below current accepted count (see [failure scenario #3](failure-modes.md)), what's the selection algorithm? LIFO (last accepted, first bumped)? Random? Organizer chooses? This is a fairness question with no clear default.
- **Automatic vs. manual** — Should the system automatically bump RSVPs, or require the organizer to manually select who loses their spot?

### Hard vs. Soft Capacity Limit
- **Organizer override scope** — Hard limit is simpler and safer. If organizers can override (add VIP above limit), how is this surfaced in the [audit trail](rsvp-state-machine.md)? Does it count against reported capacity or is it a separate "reserved" pool (see [Capacity as Inventory](capacity-as-inventory.md))?

### Validation Rules
- **Date rules** — No past start dates? Minimum event duration? End must be after start? These are straightforward to implement but the edge cases matter: should editing a past event be allowed (for corrections)? Should draft events bypass date validation?
- **Party size limits** — Global maximum? Per-event maximum? See [Group RSVPs](group-rsvps-and-plus-ones.md).
- **DST nonexistent time detection** — Should the API reject events scheduled during DST spring-forward gaps, or let IANA libraries resolve to the nearest valid time?

### Event Cancellation
- **Notification guarantee** — Should event cancellation block until all attendees are notified, or is best-effort acceptable? For paid events (future), cancellation may require refund orchestration via [saga pattern](distributed-failure-modes.md).
- **Un-cancellation** — Should this be supported? If so, are all RSVPs auto-restored? See [failure scenario #7](failure-modes.md).

### Recurring Event Identity
- **Series as entity** — Is an event series a first-class entity or a tag? This affects whether users can RSVP to "all Tuesdays" or only individual instances. See [Recurring Events](event-series-recurring.md). No clear winner — depends on product direction.

### Testing Gaps
- **Timing-attack resistance** — `undo_token` comparison uses simple `==`. For bearer tokens this is acceptable, but for security-critical tokens, `ActiveSupport::SecurityUtils.secure_compare` should be considered.
- **Auth token storage** — Tokens stored as plaintext in database. Acceptable for demo/internal API, but production would hash tokens.
