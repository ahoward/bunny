# Challenge: 001-event-rsvp-api

### 1. Waitlist Starvation due to Party Size
**Gap**: When smaller parties skip larger parties on the waitlist during promotion (US-005), there is no defined mechanism to track that a party was skipped. If more capacity becomes available later, it is undefined whether the skipped larger party retains priority or if they are permanently stuck behind smaller parties.
**Severity**: high
**Scenario**:
Given an event with 0 spots remaining
And waitlist order: User A (party_size: 3, position 1), User B (party_size: 1, position 2)
When 1 spot opens up
Then User B is promoted to accepted
When 3 more spots open up (e.g., via capacity increase)
Then it is undefined whether User A is now promoted, or if they lost their priority when User B bypassed them.

### 2. Undefined "Promoted" State & Confirmation Flow
**Gap**: The RSVP State Machine (Section 5) includes a `promoted` state and a transition `promoted ──→ accepted (user confirms)`, but there are no API endpoints, User Scenarios, or Functional Requirements detailing how a user confirms or declines a promotion, or how the confirmation window is configured.
**Severity**: critical
**Scenario**:
Given an event configured to require promotion confirmation
And a waitlisted user is transitioned to the `promoted` state
When the user attempts to confirm their attendance
Then there is no defined API endpoint (e.g., `POST /rsvps/:id/confirm`) for the client to call.

### 3. Ambiguous Update of RSVP Party Size
**Gap**: There is no `PATCH /rsvps/:id` endpoint defined to update `party_size`. If a user needs to bring an additional guest, they must cancel and re-RSVP, forcing them to lose their guaranteed spot and potentially drop to the bottom of the waitlist.
**Severity**: medium
**Scenario**:
Given a user with an accepted RSVP (party_size: 1) for a sold-out event
When the user wants to update their party_size to 2
Then they have no update endpoint available
And they must DELETE their RSVP and POST a new one, losing their spot to the waitlist.

### 4. Inconsistent Idempotency with Changed Payload
**Gap**: US-013 states duplicate RSVPs return the existing RSVP (200 OK). However, it does not specify the behavior if the retry payload contains conflicting data (e.g., a different `party_size` or `status`) than the original successful request.
**Severity**: medium
**Scenario**:
Given a user who successfully created an RSVP with `party_size: 1` (but the client timed out before receiving the response)
When the client retries the `POST /events/:id/rsvps` request but changes the payload to `party_size: 2`
Then it is undefined whether the system updates the RSVP to 2, rejects the request with 409 Conflict, or silently returns the existing RSVP for 1.

### 5. Capacity Reduction Eviction Strategy
**Gap**: FR-019 mentions explicit confirmation for reducing capacity below the accepted count, but there is no specification on *how* the system chooses which accepted RSVPs are evicted (e.g., LIFO, FIFO, or organizer-selected).
**Severity**: critical
**Scenario**:
Given an event with 10 accepted RSVPs
When the organizer reduces the capacity to 5 and confirms the reduction
Then the system must transition 5 RSVPs away from `accepted`
But there is no defined algorithmic rule for which 5 users lose their spots.

### 6. Waitlisted RSVP Cancellation & Undo Complexity
**Gap**: US-004 allows cancelling a waitlisted RSVP and recalculating positions for everyone behind them. If the user then uses the Undo feature (US-006), it is undefined whether they regain their original `waitlist_position` (requiring another expensive recalculation) or if they are appended to the back of the line.
**Severity**: high
**Scenario**:
Given a user at waitlist_position 1
When they cancel their RSVP
And waitlist_position 2 is recalculated to position 1
When the original user POSTs `/rsvps/:id/undo` within the grace period
Then it is undefined if they bump the current position 1 user back to 2, or if they are assigned a new position at the end of the waitlist.

### 7. Background Promotion vs. Undo Grace Period Race Condition
**Gap**: The undo grace period relies on a strict 5-minute window. If the background promotion job is delayed (e.g., queue backup), a user might try to undo at minute 5:05. It is undefined whether the undo succeeds (because promotion hasn't technically happened yet) or fails strictly based on the `undo_expires_at` timestamp.
**Severity**: high
**Scenario**:
Given a user who cancelled an accepted RSVP 5 minutes and 10 seconds ago
And the background promotion job has not yet processed the freed spot due to high load
When the user POSTs `/rsvps/:id/undo`
Then it is undefined if the system rejects the request (timestamp expired) or accepts it (spot is still technically vacant).

### 8. Event Deletion Orphaned RSVPs
**Gap**: The API Summary lists `DELETE /events/:id`, but there is no specification detailing what happens to existing RSVPs, the audit trail, or how users are notified when an event is abruptly cancelled by the organizer.
**Severity**: high
**Scenario**:
Given an event with 50 accepted RSVPs
When the organizer executes `DELETE /events/:id`
Then it is undefined if the RSVPs are soft-deleted, transitioned to a `declined`/`cancelled` state, or if the database deletion cascades and permanently destroys user history without notification.

### 9. Headcount vs. RSVP Count Naming Ambiguity
**Gap**: The `Event` entity has an `accepted_count` field. FR-015 states capacity checks MUST account for `party_size`. It is highly ambiguous whether `accepted_count` tracks the total headcount (sum of party sizes) or the number of accepted RSVP records. If implemented as a standard Rails/Django counter cache, it will track records, breaking the capacity math.
**Severity**: high
**Scenario**:
Given an event with capacity 10 and `accepted_count` 0
When a user POSTs an RSVP with `party_size: 5`
Then `accepted_count` is incremented
And it is undefined whether it correctly becomes 5 (headcount) or incorrectly becomes 1 (record count).
