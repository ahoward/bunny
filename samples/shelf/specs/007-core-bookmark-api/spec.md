# Feature Specification: Core bookmark API

**Feature Branch**: `007-core-bookmark-api`
**Created**: 2026-03-01
**Status**: Complete
**Input**: User description: "Core bookmark API"

## User Scenarios & Testing

### User Story 1 - Save a bookmark (Priority: P1)

A user saves a URL with optional tags, title, and notes. The system persists it in SQLite and returns the created bookmark with a generated id and timestamp.

**Why this priority**: Without saving bookmarks, nothing else works. This is the core write path.

**Independent Test**: Call `/bookmarks/save` with a URL and verify the response contains the bookmark with id, url, tags, title, notes, and created_at.

**Acceptance Scenarios**:

1. **Given** no bookmarks exist, **When** user saves `{ url: "https://example.com" }`, **Then** response is success with created bookmark including generated id and timestamp
2. **Given** no bookmarks exist, **When** user saves `{ url: "https://example.com", tags: ["dev"], title: "Example", notes: "good site" }`, **Then** response includes all provided fields
3. **Given** no params, **When** user calls save, **Then** response is error with validation messages

---

### User Story 2 - List all bookmarks (Priority: P1)

A user retrieves all saved bookmarks, sorted newest first.

**Why this priority**: Users need to see what they've saved. Core read path, equally critical as save.

**Independent Test**: Save two bookmarks, call `/bookmarks/list`, verify both returned sorted newest-first with correct count.

**Acceptance Scenarios**:

1. **Given** no bookmarks exist, **When** user lists, **Then** response is `{ bookmarks: [], count: 0 }`
2. **Given** two bookmarks saved, **When** user lists, **Then** response contains both, count is 2, newest first

---

### User Story 3 - Delete a bookmark (Priority: P2)

A user removes a bookmark by id. The system confirms deletion by returning the deleted bookmark.

**Why this priority**: Users need to manage their collection. Less critical than save/list but essential for CRUD.

**Independent Test**: Save a bookmark, delete it by id, verify it's gone from the list.

**Acceptance Scenarios**:

1. **Given** a bookmark exists, **When** user deletes by id, **Then** response is success with deleted bookmark and it no longer appears in list
2. **Given** no bookmark with that id, **When** user deletes, **Then** response is error

---

### Edge Cases

- Empty string or whitespace-only url is rejected
- Non-array tags are rejected; non-string tag elements are rejected
- Whitespace-only title/notes stored as null
- Multiple validation errors reported simultaneously
- Non-existent id on delete returns error, not exception

## Requirements

### Functional Requirements

- **FR-001**: System MUST save bookmarks with url (required), tags (optional array), title (optional string), notes (optional string)
- **FR-002**: System MUST generate a unique id (UUID) and created_at timestamp for each bookmark
- **FR-003**: System MUST validate all input fields and report all errors simultaneously
- **FR-004**: System MUST list all bookmarks sorted by created_at descending (newest first)
- **FR-005**: System MUST delete bookmarks by id and return the deleted bookmark
- **FR-006**: System MUST persist bookmarks in SQLite (bun:sqlite)
- **FR-007**: System MUST trim whitespace from strings; store whitespace-only optional fields as null
- **FR-008**: System MUST filter empty strings from tags array after trimming

### Key Entities

- **Bookmark**: A saved URL — id (UUID), url (string), title (string|null), tags (string[]), notes (string|null), created_at (ISO timestamp)

## Success Criteria

### Measurable Outcomes

- **SC-001**: All 34 tests pass (invariants + handler contract tests)
- **SC-002**: Save, list, delete operations work through app.call interface
- **SC-003**: Data persists in SQLite across calls
- **SC-004**: All handlers return well-formed Result envelopes
