# Rails Implementation Patterns
Patterns that emerged during the Event RSVP API build — reusable across any Rails API with transactional integrity requirements.

## Service Layer with Result Objects
All mutation logic lives in service objects (`RsvpCreator`, `RsvpCanceller`, `RsvpUndoer`, `WaitlistPromoter`), not controllers. Each returns an immutable `Struct`-based Result:

```ruby
Result = Struct.new(:rsvp, :http_status, :error, keyword_init: true)
```

Errors are hashes with `:code`, `:message`, `:details` — mapping directly to the API error envelope. Controllers become thin translators:
```ruby
if result.error
  render_error(**result.error.transform_keys(&:to_sym), status: result.http_status)
else
  render_resource("rsvp", result.rsvp, status: result.http_status)
end
```

**Why not exceptions?** Exceptions for control flow conflate "something broke" with "business rule says no." Result objects make both paths equally explicit and testable.

## Transaction Boundaries
Every service that mutates shared state wraps the critical section in `ActiveRecord::Base.transaction` with explicit locking:

```ruby
ActiveRecord::Base.transaction do
  event = Event.lock("FOR UPDATE").find(event_id)
  # read state, make decision, write state — all atomic
end
```

**Key rule:** The lock scope matches the contention scope. RSVP creation locks the event row (contention point), not the RSVP table.

## Idempotency: Two-Layer Defense
1. **Application layer:** Check for existing record before transaction (`Rsvp.find_by(event_id:, user_id:)`) — fast path, no lock needed.
2. **Database layer:** `rescue ActiveRecord::RecordNotUnique` catches the race where two threads pass the application check simultaneously — returns existing record instead of error.

This means idempotent retries never require client-side idempotency keys for RSVP creation. The `(user_id, event_id)` unique constraint is the natural key.

## Denormalized Counter: Headcount vs Record Count
`accepted_count` on Event tracks **headcount** (sum of `party_size`), not RSVP record count. This is a critical distinction:
- Increment by `party_size` on accept
- Decrement by `party_size` on cancel/decline
- Capacity check: `accepted_count + party_size <= capacity`

The database CHECK constraint `accepted_count <= capacity` is the final safety net. If application logic has a bug, the constraint fires and the transaction rolls back.

## Undo Grace Period: Application-Layer Soft State
The cancellation undo window does **not** add a database state. During the 5-minute window:
- RSVP status remains `accepted` in the database
- `undo_token` and `undo_expires_at` columns signal "pending cancellation"
- A scheduled background job (`UndoExpiryJob`) fires after 5 minutes
- If user undoes: clear token/expiry, cancel is moot
- If job fires: transition to `declined`, decrement counter, trigger promotion

This avoids complicating the state machine while providing undo. The job is idempotent — it checks `status == 'accepted' && undo_token.present?` before acting.

## Waitlist Position Recalculation
Positions are recalculated in a second pass after promotions, not inline during promotion. This ensures sequential numbering (1, 2, 3...) even when middle entries are promoted out of order due to party_size skipping.

## Soft Cancellation for Events
Event deletion uses `cancelled_at` timestamp rather than hard delete. All non-declined RSVPs transition to `declined` with reason `event_cancelled`. This preserves audit trail and enables potential un-cancellation.
