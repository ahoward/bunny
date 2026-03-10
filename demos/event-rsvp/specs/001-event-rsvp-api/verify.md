# Verification: 001-event-rsvp-api

### 1. Waitlist Starvation due to Party Size
- **Issue**: `WaitlistPromoter` skips larger parties that don't fit the current capacity, but explicitly retains their low `waitlist_position`. The test suite does not verify if this retained priority behaves correctly when larger capacity blocks subsequently open up, or if the larger party becomes permanently starved while smaller parties continuously bypass them.
- **Severity**: high
- **Suggested Test**: Create an event with 0 capacity. Add User A (party_size: 3) to waitlist position 1, and User B (party_size: 1) to position 2. Increase capacity by 1 -> verify User B is accepted while User A remains waitlisted at position 1. Then increase capacity by 3 -> verify User A is correctly promoted without losing priority.

### 2. Unimplemented "Promoted" State & Confirmation Flow
- **Issue**: The AASM state machine defines a `promoted` state and an `expire_promotion` transition, but the `WaitlistPromoter` explicitly bypasses this by forcing `update!(status: "accepted")`. The implementation completely lacks the implicitly required `POST /rsvps/:id/confirm` endpoint for promotion confirmation, and the tests fail to catch its absence.
- **Severity**: critical
- **Suggested Test**: Waitlist a user for an event configured to require confirmation. When capacity opens, verify their status transitions to `promoted` (not `accepted`). Verify that a subsequent request to `POST /rsvps/:id/confirm` successfully transitions them to `accepted`.

### 3. Inconsistent Idempotency with Changed Payload
- **Issue**: `RsvpCreator` enforces idempotency by returning an existing RSVP if one is found for the user and event. However, it fails to validate if the new request's payload (`party_size`) matches the existing record. A client retrying a timeout with a modified `party_size` will silently receive a 200 OK with the old data, falsely believing their new party size was accepted.
- **Severity**: medium
- **Suggested Test**: Submit `POST /events/:id/rsvps` with `party_size: 1`. Submit a duplicate request for the same event and user but with `party_size: 2`. Verify the API returns a 409 Conflict indicating a payload mismatch rather than silently succeeding.

### 4. Ambiguous Update of RSVP Party Size
- **Issue**: The system has no `PATCH /rsvps/:id` endpoint. Users needing to increase or decrease their `party_size` must fully cancel and re-RSVP, causing them to lose their guaranteed spot or waitlist priority. The tests do not cover any RSVP modification scenarios.
- **Severity**: medium
- **Suggested Test**: As a user with an `accepted` RSVP for a full event, submit `PATCH /rsvps/:id` with a larger `party_size`. Verify the system attempts to update the party size if capacity allows, or returns a 422 if it exceeds capacity, without forcing a full cancellation.

### 5. Organizer Deadlock on Capacity Reduction
- **Issue**: `EventsController#update` correctly blocks capacity reduction below `accepted_count` (returning a 409 Conflict). However, the system completely lacks any mechanism (like a `confirm_capacity_reduction` flag or an organizer eviction endpoint) to resolve the conflict. Organizers are permanently deadlocked and cannot force a reduction.
- **Severity**: critical
- **Suggested Test**: As an organizer, submit `PATCH /events/:id` to reduce capacity below `accepted_count`, including a `confirm_reduction: true` parameter (or via a dedicated eviction endpoint). Verify the system gracefully drops the most recent RSVPs (LIFO) back to the waitlist and successfully reduces the capacity.

### 6. Event Deletion Orphaned RSVPs and State Machine Bypass
- **Issue**: `EventsController#destroy` cancels an event and bulk updates all RSVPs using `rsvp.update!(status: "declined")`. This entirely bypasses the AASM state machine (`decline!` event) and any associated validations or notification callbacks. Affected users receive no notification that their RSVP was cancelled due to event deletion.
- **Severity**: high
- **Suggested Test**: Delete an event with accepted RSVPs. Verify that the RSVPs transition to `declined` via the state machine (triggering `after_commit` hooks) and that notification jobs/emails are successfully enqueued to alert the attendees of the cancellation.

### 7. Background Promotion vs. Undo Grace Period Race Condition
- **Issue**: `RsvpUndoer#call` strictly validates against `undo_expires_at` using server time. If the background `UndoExpiryJob` is delayed due to queue backup, a user attempting an undo at exactly 5 minutes and 1 second is rejected, despite their spot still being technically vacant and unpromoted. The test suite only checks the happy path boundary, missing queue delay implications.
- **Severity**: high
- **Suggested Test**: Cancel an accepted RSVP. Manually delay the execution of `UndoExpiryJob` (simulate queue backup). Attempt `POST /rsvps/:id/undo` 6 minutes after cancellation. Verify the system accepts the undo since the promotion job has not yet executed and the spot is still functionally vacant.

### 8. Registration Window Logic Error
- **Issue**: `Event#registration_open?` uses `registration_opens_at` and `registration_closes_at`. There is no validation ensuring `registration_closes_at > registration_opens_at`. If an organizer accidentally misconfigures these (e.g., closes before it opens), the event silently remains permanently closed and no RSVPs are accepted.
- **Severity**: low
- **Suggested Test**: Attempt to create an event where `registration_closes_at` is earlier than `registration_opens_at`. Verify the API rejects the payload with a validation error (422 Unprocessable Entity) for invalid registration windows.
