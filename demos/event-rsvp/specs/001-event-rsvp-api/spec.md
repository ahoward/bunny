# Feature Specification: Event RSVP API: RESTful endpoints for events and RSVPs with capacity limits, automatic waitlist promotion, and concurrency-safe reservation handling

**Feature Branch**: `001-event-rsvp-api`
**Created**: 2026-03-10
**Status**: Draft

# Feature Specification: Event RSVP API

**Branch:** `001-event-rsvp-api`
**Date:** 2026-03-10
**Status:** Draft

---

## 1. User Scenarios & Testing

### P1 — Core RSVP Flow

#### US-001: Create an Event
**As** an organizer, **I want** to create an event with a title, description, location, start/end times, capacity, and registration window, **so that** users can discover and RSVP.

**Scenario: Successful event creation**
Given an authenticated organizer
When they POST /events with valid attributes (title, start_time, end_time, capacity: 50, registration_opens_at, registration_closes_at)
Then a 201 Created is returned with the event resource
And all times are stored in UTC with a separate time_zone identifier (IANA format)
And the event lifecycle phase is "created" or "registration_open" depending on registration_opens_at


**Scenario: Missing required fields**
Given an authenticated organizer
When they POST /events without a title or start_time
Then a 422 Unprocessable Entity is returned with field-level error details


**Scenario: Invalid time range**
Given an authenticated organizer
When they POST /events with end_time before start_time
Then a 422 is returned with error code "invalid_time_range"


---

#### US-002: RSVP to an Event (Under Capacity)
**As** a user, **I want** to RSVP to an event that has available capacity, **so that** I am confirmed as an attendee.

**Scenario: Accepted RSVP**
Given an event with capacity 50 and 30 accepted RSVPs
And registration is open
When an authenticated user POSTs /events/:id/rsvps with an empty body
Then a 201 Created is returned with status "accepted"
And the event's accepted_count increments to 31
And the response includes the event summary with spots_remaining: 19


**Scenario: RSVP with party_size**
Given an event with capacity 50 and 47 accepted (by headcount)
When a user POSTs /events/:id/rsvps with { "party_size": 3 }
Then a 201 Created is returned with status "accepted"
And the event's accepted headcount increments by 3 to 50


---

#### US-003: RSVP to a Full Event (Waitlisted)
**As** a user, **I want** to RSVP to a full event and be placed on the waitlist, **so that** I can attend if a spot opens.

**Scenario: Waitlisted RSVP**
Given an event at capacity (accepted_count == capacity)
When a user POSTs /events/:id/rsvps
Then a 201 Created is returned with status "waitlisted"
And the response includes waitlist_position (1-indexed)
And a meta.message explains the waitlist status


> Note: Waitlisting is a success (201), not an error. The system determines status, not the user.

---

#### US-004: Cancel an RSVP
**As** a user, **I want** to cancel my RSVP, **so that** my spot can go to someone on the waitlist.

**Scenario: Cancel accepted RSVP**
Given a user with an accepted RSVP to an event that has a waitlist
When they DELETE /rsvps/:id
Then a 200 OK is returned with an undo_token and undo_expires_at (5 minutes from now)
And the RSVP status transitions to "declined" after the undo grace period
And waitlist promotion is triggered after the grace period expires


**Scenario: Cancel waitlisted RSVP**
Given a user with a waitlisted RSVP
When they DELETE /rsvps/:id
Then a 200 OK is returned
And the RSVP status becomes "declined"
And waitlist positions for users behind them are recalculated


---

#### US-005: Automatic Waitlist Promotion
**As** a waitlisted user, **I want** to be automatically promoted when a spot opens, **so that** I don't miss the opportunity.

**Scenario: FIFO promotion after cancellation**
Given an event at capacity with 3 waitlisted users (positions 1, 2, 3)
When an accepted user's cancellation grace period expires
Then the waitlisted user at position 1 is promoted to status "accepted"
And positions 2 and 3 shift to 1 and 2
And the promoted user is notified via background job


**Scenario: Party size skip during promotion**
Given an event with 1 open slot
And the next waitlisted RSVP has party_size 3
And the following waitlisted RSVP has party_size 1
Then the solo RSVP is promoted (party_size fits)
And the group RSVP retains its position


---

#### US-006: Undo a Cancellation
**As** a user, **I want** to undo my cancellation within a grace period, **so that** I can recover from accidental cancels.

**Scenario: Successful undo**
Given a user who cancelled their accepted RSVP within the last 5 minutes
When they POST /rsvps/:id/undo with the valid undo_token
Then the RSVP is restored to "accepted"
And no waitlist promotion was triggered


**Scenario: Expired undo**
Given a user who cancelled their RSVP more than 5 minutes ago
When they POST /rsvps/:id/undo with the undo_token
Then a 410 Gone is returned with error code "undo_expired"


---

### P1 — Concurrency Safety

#### US-007: Concurrent RSVPs for the Last Spot
**As** the system, **I must** prevent two users from both claiming the last spot, **so that** capacity is never exceeded.

**Scenario: Last-spot race condition**
Given an event with capacity 50 and 49 accepted RSVPs
When two users submit RSVPs simultaneously
Then exactly one receives status "accepted"
And the other receives status "waitlisted"
And accepted_count never exceeds 50


---

### P1 — Read Endpoints

#### US-008: List Events
**As** a user, **I want** to browse events, **so that** I can find events to attend.

**Scenario: Paginated event listing**
Given 60 published events
When a user GETs /events
Then 25 events are returned (default page size)
And cursor-based pagination links are included
And each event includes spots_remaining (or "almost_full" when < 5)


---

#### US-009: View Event Details
**As** a user, **I want** to view event details including my RSVP status, **so that** I know where I stand.

**Scenario: Event with user's RSVP**
Given a user with a waitlisted RSVP (position 3) for an event
When they GET /events/:id
Then the event details are returned
And their RSVP status and waitlist_position are included


---

#### US-010: View Attendee List
**As** a user, **I want** to see who else is attending, **subject to** the event's visibility settings.

**Scenario: Organizer-only visibility (default)**
Given an event with default visibility settings
When a non-organizer GETs /events/:id/rsvps
Then a 403 Forbidden is returned


**Scenario: Attendees-only visibility**
Given an event with visibility "attendees_only"
And the requesting user has an accepted RSVP
When they GET /events/:id/rsvps?status=accepted
Then the attendee list is returned with cursor pagination


---

### P2 — Organizer Management

#### US-011: Update Event Details
**As** an organizer, **I want** to update event details, **so that** I can correct mistakes or adjust plans.

**Scenario: Update capacity above current accepted count**
Given an event with 30 accepted RSVPs and capacity 30 (full)
And 5 users on the waitlist
When the organizer PATCHes /events/:id with { "capacity": 35 }
Then the capacity is updated
And the first 5 waitlisted users are promoted automatically


**Scenario: Reduce capacity below accepted count**
Given an event with 30 accepted RSVPs
When the organizer PATCHes /events/:id with { "capacity": 20 }
Then a 409 Conflict is returned
And the response explains that 10 RSVPs would need to be removed
And the response includes an actions array with "confirm_capacity_reduction" link


---

#### US-012: View RSVPs as Organizer
**As** an organizer, **I want** to see all RSVPs with filtering by status, **so that** I can manage attendance.

**Scenario: Filtered RSVP list**
Given an event with 30 accepted, 10 waitlisted, and 5 declined RSVPs
When the organizer GETs /events/:id/rsvps?status=waitlisted
Then 10 waitlisted RSVPs are returned ordered by waitlist_position


---

### P2 — Idempotency & Retry Safety

#### US-013: Duplicate RSVP Handling
**As** a user whose request timed out, **I want** to safely retry my RSVP, **so that** I don't get an error or create duplicates.

**Scenario: Duplicate RSVP returns existing**
Given a user who already has an accepted RSVP for event 42
When they POST /events/42/rsvps again
Then a 200 OK is returned with the existing RSVP
And no new RSVP is created


---

### P3 — Enhanced Features

#### US-014: Event Registration Window Enforcement
**As** the system, **I must** enforce registration windows, **so that** RSVPs are only accepted during the valid period.

**Scenario: RSVP before registration opens**
Given an event with registration_opens_at in the future
When a user POSTs /events/:id/rsvps
Then a 422 is returned with error code "registration_not_open"
And the response includes registration_opens_at


**Scenario: RSVP after registration closes**
Given an event with registration_closes_at in the past
When a user POSTs /events/:id/rsvps
Then a 422 is returned with error code "registration_closed"
And the response includes closed_at


---

#### US-015: RSVP State Transition Enforcement
**As** the system, **I must** enforce valid state transitions, **so that** the RSVP lifecycle is consistent.

**Scenario: Decline-to-accept is rejected**
Given a user with a declined RSVP
When they attempt to PATCH /rsvps/:id with { "status": "accepted" }
Then a 422 is returned with error code "invalid_transition"
And the meta.message suggests creating a new RSVP


---

## 2. Edge Cases

### Concurrency & Race Conditions

| # | Case | Expected Behavior |
|---|------|-------------------|
| E-001 | Two users RSVP for the last spot simultaneously | Exactly one accepted, one waitlisted. SELECT FOR UPDATE serializes access. |
| E-002 | User cancels while promotion job is in-flight | Promotion job checks capacity atomically; freed slot goes to next waitlisted user, not the promotion already running. |
| E-003 | Undo fires at the exact moment grace period expires | Grace period is checked server-side with strict inequality. If expired, undo fails cleanly. |
| E-004 | Concurrent party_size RSVPs that together exceed capacity | Only the first transaction to commit is accepted; the second is waitlisted. Capacity checks use party_size, not count of RSVPs. |

### Temporal

| # | Case | Expected Behavior |
|---|------|-------------------|
| E-005 | RSVP submitted 1 second before registration_closes_at | Accepted — server-side timestamp compared to registration_closes_at. |
| E-006 | Event created with start_time during DST spring-forward gap | Reject with error code "nonexistent_time" and suggest adjacent valid times. [NEEDS CLARIFICATION: or should the IANA library resolve it?] |
| E-007 | Organizer edits a past event's non-time fields | Allowed (corrections). Editing start_time/end_time to future values on a past event is rejected. |

### Data Integrity

| # | Case | Expected Behavior |
|---|------|-------------------|
| E-008 | User deletes account with accepted RSVP | Soft-delete user. RSVP transitions to declined. Accepted count decremented. Waitlist promotion triggered. Personal data scrubbed per GDPR. |
| E-009 | Party size of 0 or negative | 400 Bad Request with validation error. |
| E-010 | Party size exceeds event capacity | 422 with error code "party_size_exceeds_capacity". |
| E-011 | accepted_count drifts from actual accepted RSVPs | Database constraint prevents this. If detected: freeze new RSVPs, alert organizer, reconcile via audit trail. |

### API Boundary

| # | Case | Expected Behavior |
|---|------|-------------------|
| E-012 | Client sends status field in POST /rsvps body | Field is silently ignored. Status is server-determined. |
| E-013 | Unauthenticated request to any mutation endpoint | 401 Unauthorized. |
| E-014 | RSVP to a nonexistent event | 404 Not Found. |
| E-015 | Organizer reduces capacity to 0 | Treated as capacity reduction flow (same as E-011 path in US-011). All accepted RSVPs must be handled explicitly. |

---

## 3. Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | The system **MUST** expose RESTful endpoints: `POST /events`, `GET /events`, `GET /events/:id`, `PATCH /events/:id`, `DELETE /events/:id`. | P1 |
| FR-002 | The system **MUST** expose RSVP endpoints: `POST /events/:id/rsvps`, `GET /events/:id/rsvps`, `DELETE /rsvps/:id`, `POST /rsvps/:id/undo`. | P1 |
| FR-003 | The system **MUST** automatically assign RSVP status (`accepted` or `waitlisted`) based on current capacity. The client **MUST NOT** be able to set status. | P1 |
| FR-004 | The system **MUST** enforce capacity limits using pessimistic locking (`SELECT FOR UPDATE`) in the RSVP creation path. | P1 |
| FR-005 | The system **MUST** enforce a unique constraint on `(user_id, event_id)` at the database level. Duplicate RSVPs return the existing record with 200. | P1 |
| FR-006 | The system **MUST** automatically promote the first eligible waitlisted RSVP (by FIFO order) when an accepted spot becomes available. | P1 |
| FR-007 | Promotion **MUST** be processed via a background job (async). Notifications **MUST NOT** block the RSVP write path. | P1 |
| FR-008 | Cancellation of an accepted RSVP **MUST** enter a 5-minute undo grace period before triggering waitlist promotion. The database status remains `accepted` during the grace period. | P1 |
| FR-009 | The undo endpoint **MUST** accept a token and restore the RSVP if within the grace window. | P1 |
| FR-010 | The system **MUST** enforce valid state transitions as defined in the state machine. Invalid transitions return 422. | P1 |
| FR-011 | All times **MUST** be stored in UTC. Events **MUST** store a separate `time_zone` field using IANA identifiers. | P1 |
| FR-012 | The system **MUST** enforce `registration_opens_at` and `registration_closes_at`. RSVPs outside the window return 422 with descriptive error codes. | P2 |
| FR-013 | Attendee list visibility **MUST** default to organizer-only. Organizers **SHOULD** be able to configure visibility to `public`, `attendees_only`, or `count_only`. | P2 |
| FR-014 | `GET /events` **MUST** use cursor-based pagination with a default page size of 25. | P2 |
| FR-015 | The system **SHOULD** support `party_size` on RSVPs (default: 1). Capacity checks **MUST** account for party_size, not RSVP count. | P2 |
| FR-016 | Group RSVPs that don't fit available capacity **SHOULD** be skipped during promotion in favor of smaller parties that fit. | P2 |
| FR-017 | Capacity increase **SHOULD** automatically trigger promotion of waitlisted users to fill new slots. | P2 |
| FR-018 | Every state transition **SHOULD** be logged in an audit trail with: previous_state, new_state, timestamp, actor, and reason. | P2 |
| FR-019 | Capacity reduction below accepted count **MUST** require explicit organizer confirmation before bumping RSVPs. [NEEDS CLARIFICATION: LIFO bumping order, or organizer-selected?] | P3 |
| FR-020 | The system **SHOULD** validate: end_time > start_time, capacity > 0, party_size >= 1. | P1 |
| FR-021 | API responses **MUST** use a consistent envelope: `{ "<resource>": {...}, "meta": {...} }` for single resources and `{ "<resources>": [...], "meta": {...}, "links": {...} }` for collections. | P1 |
| FR-022 | Error responses **MUST** include: `error.code` (machine-readable), `error.message` (human-readable), and `error.details` (contextual data). | P1 |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-001 | Concurrent RSVP creation for the same event **MUST NOT** result in accepted_count exceeding capacity under any load. |
| NFR-002 | The RSVP creation endpoint **SHOULD** respond within 200ms at p95 under normal load. |
| NFR-003 | Background promotion jobs **MUST** be idempotent — safe to retry without double-promoting. |
| NFR-004 | The system **MUST** use database-level constraints (unique, check) as safety nets beneath application logic. |

---

## 4. Key Entities

### Event
Event {
  id:                      integer (PK)
  title:                   string (required)
  description:             text
  location:                string
  start_time:              datetime (UTC, required)
  end_time:                datetime (UTC, required)
  time_zone:               string (IANA identifier, required)
  capacity:                integer (required, > 0)
  registration_opens_at:   datetime (UTC, nullable — null means immediately)
  registration_closes_at:  datetime (UTC, nullable — null means at start_time)
  attendee_visibility:     enum [organizer_only, attendees_only, count_only, public] (default: organizer_only)
  accepted_count:          integer (default: 0, counter cache)
  organizer_id:            integer (FK → User)
  created_at:              datetime
  updated_at:              datetime
}


### RSVP
RSVP {
  id:                integer (PK)
  event_id:          integer (FK → Event, required)
  user_id:           integer (FK → User, required)
  status:            enum [pending, accepted, waitlisted, declined, promoted, expired, no_show] (required)
  waitlist_position: integer (nullable, set when status is waitlisted)
  party_size:        integer (default: 1, >= 1)
  undo_token:        string (nullable, set on cancellation)
  undo_expires_at:   datetime (nullable)
  created_at:        datetime
  updated_at:        datetime

  UNIQUE(user_id, event_id)
  CHECK(status IN ('pending','accepted','waitlisted','declined','promoted','expired','no_show'))
  CHECK(party_size >= 1)
}


### User
User {
  id:         integer (PK)
  name:       string (required)
  email:      string (required, unique)
  created_at: datetime
  updated_at: datetime
}


### RsvpTransition (Audit Trail)
RsvpTransition {
  id:             integer (PK)
  rsvp_id:        integer (FK → RSVP)
  from_status:    string (nullable for initial creation)
  to_status:      string (required)
  actor_type:     enum [user, system, organizer]
  actor_id:       integer (nullable)
  reason:         string (e.g., "user_cancelled", "promotion", "capacity_change", "timeout")
  created_at:     datetime
}


### Relationships
User ──< RSVP >── Event
          │
          └──< RsvpTransition


- User has many RSVPs
- Event has many RSVPs
- Event belongs to User (as organizer)
- RSVP has many RsvpTransitions

---

## 5. RSVP State Machine

pending    ──→ accepted    (capacity available)
pending    ──→ waitlisted  (at capacity)
accepted   ──→ declined    (user cancels, after undo grace period)
waitlisted ──→ promoted    (spot opens, if confirmation required)
waitlisted ──→ accepted    (spot opens, if auto-promote)
waitlisted ──→ declined    (user cancels while waiting)
promoted   ──→ accepted    (user confirms)
promoted   ──→ expired     (confirmation window closes)
promoted   ──→ declined    (user declines promotion)
accepted   ──→ no_show     (post-event marking by organizer)


**Invalid transitions (must raise 422):** `declined → accepted`, `accepted → waitlisted`, `no_show → *`, any transition on a past event (except → no_show).

---

## 6. API Endpoints Summary

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /events | Create event | Organizer |
| GET | /events | List events (paginated) | Public |
| GET | /events/:id | Event details | Public |
| PATCH | /events/:id | Update event | Organizer |
| DELETE | /events/:id | Cancel event | Organizer |
| POST | /events/:id/rsvps | Create RSVP | Authenticated |
| GET | /events/:id/rsvps | List RSVPs (visibility rules apply) | Varies |
| DELETE | /rsvps/:id | Cancel RSVP | RSVP owner |
| POST | /rsvps/:id/undo | Undo cancellation | RSVP owner |

---

## 7. Success Criteria

| # | Criterion | Measurement |
|---|-----------|-------------|
| SC-001 | Capacity is never exceeded under concurrent load | Multi-threaded integration test: 100 concurrent RSVPs for an event with 1 remaining slot results in exactly 1 accepted, 99 waitlisted. |
| SC-002 | Waitlist promotion fires correctly after cancellation | Test: cancel accepted RSVP → after grace period → first waitlisted RSVP is promoted. Verified via RSVP status and audit trail. |
| SC-003 | Duplicate RSVP is idempotent | Test: POST /rsvps twice for same user+event → second returns 200 with same RSVP, no duplicate records. |
| SC-004 | Undo grace period works end-to-end | Test: cancel → undo within 5 min → RSVP restored, no promotion triggered. Cancel → wait 5 min → undo fails with 410. |
| SC-005 | Invalid state transitions are rejected | Test matrix: every invalid transition pair returns 422. |
| SC-006 | Registration window is enforced | Tests for RSVP before open, after close, and during valid window. |
| SC-007 | All P1 user scenarios pass as automated integration tests | Green CI on the feature branch. |
| SC-008 | Party size is accounted for in capacity checks | Test: event with 2 remaining slots, RSVP with party_size 3 is waitlisted. |
