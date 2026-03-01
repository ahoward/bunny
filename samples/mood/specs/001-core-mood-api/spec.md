# Feature Specification: Core mood API

**Feature Branch**: `001-core-mood-api`
**Created**: 2026-03-01
**Status**: Active
**Input**: User description: "Core mood API"

## User Scenarios & Testing

### User Story 1 - Post a mood (Priority: P1)

A team member posts their daily mood (score 1-5) with an optional note, identified by email.

**Why this priority**: Without mood creation, nothing else works.

**Independent Test**: POST /moods with `{user_email, score, note?}` returns the created entry.

**Acceptance Scenarios**:

1. **Given** an empty system, **When** a user POSTs `{user_email: "alice@co.com", score: 4, note: "good day"}`, **Then** the system returns the created mood entry with an id, timestamp, and status "success".
2. **Given** a running system, **When** a user POSTs without a score, **Then** the system returns status "error" with a validation message.
3. **Given** a running system, **When** a user POSTs a score outside 1-5, **Then** the system returns status "error".

---

### User Story 2 - List moods (Priority: P2)

A team member retrieves mood entries — all recent, or filtered by user_email.

**Why this priority**: Viewing data is the next essential after creating it.

**Independent Test**: GET /moods returns all entries; GET /moods with `{user_email}` filters by user.

**Acceptance Scenarios**:

1. **Given** moods exist, **When** a user calls /moods, **Then** the system returns all mood entries sorted newest-first.
2. **Given** moods exist, **When** a user calls /moods with `{user_email: "alice@co.com"}`, **Then** only Alice's moods are returned.
3. **Given** no moods exist, **When** a user calls /moods, **Then** the system returns an empty array with status "success".

---

### User Story 3 - View trends (Priority: P3)

A team member views mood trends — per person and per team over the last 30 days.

**Why this priority**: Trends are the analytical payoff of the data collected.

**Independent Test**: GET /trends returns per-user and team-wide averages.

**Acceptance Scenarios**:

1. **Given** moods exist for multiple users over multiple days, **When** a user calls /trends, **Then** the system returns per-user averages and a team average.
2. **Given** moods exist, **When** a user calls /trends with `{user_email}`, **Then** the system returns trend data for just that user.
3. **Given** no moods in the last 30 days, **When** a user calls /trends, **Then** the system returns empty trend data with status "success".

---

### Edge Cases

- Score must be integer 1-5 (reject 0, 6, 3.5, "happy")
- user_email must be a non-empty string
- Very long notes should be accepted (no arbitrary limit for prototype)
- Concurrent writes to the same JSON file — acceptable for prototype (last-write wins)
- Missing data directory — create on first write

## Requirements

### Functional Requirements

- **FR-001**: System MUST accept mood entries via POST /moods with `{user_email, score, note?}`
- **FR-002**: System MUST validate score is an integer 1-5
- **FR-003**: System MUST validate user_email is a non-empty string
- **FR-004**: System MUST persist mood entries to filesystem as JSON
- **FR-005**: System MUST return all moods via GET /moods, optionally filtered by user_email
- **FR-006**: System MUST return trends via GET /trends — per-user and team averages over last 30 days
- **FR-007**: System MUST return proper Result envelopes for all endpoints
- **FR-008**: No authentication required (prototype)

### Key Entities

- **MoodEntry**: id (uuid), user_email (string), score (1-5 integer), note (string | null), timestamp (ISO 8601)
- **Trend**: user_email (string), average_score (number), entry_count (number), period_days (number)

## Success Criteria

### Measurable Outcomes

- **SC-001**: All endpoints return well-formed Result envelopes
- **SC-002**: Invalid inputs return error status with descriptive messages
- **SC-003**: Moods persist across server restarts (filesystem storage)
- **SC-004**: Trends accurately compute averages from stored data
