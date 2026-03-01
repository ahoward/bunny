# Tasks: Core mood API

**Input**: specs/001-core-mood-api/

## Phase 1: Setup

- [x] T001 [P] Create src/lib/types.ts — POD types (Result, MoodEntry, Trend, etc.)
- [x] T002 [P] Create src/lib/result.ts — Result envelope helpers
- [x] T003 [P] Create src/lib/log.ts — Structured JSON logging

## Phase 2: Foundation

- [x] T004 Create src/app.ts — Handler registry (app.call, register, paths)
- [x] T005 Create src/lib/store.ts — Filesystem JSON store for mood entries
- [x] T006 [P] Create src/handlers/ping.ts — Ping handler
- [x] T007 Create src/index.ts — Register all handlers

## Phase 3: User Story 1 — Post a mood (P1)

- [x] T008 Create tests/handlers/create_mood.test.ts — Tests first
- [x] T009 Create src/handlers/create_mood.ts — POST /moods handler
- [x] T010 Run ./dev/test — Verify tests pass

## Phase 4: User Story 2 — List moods (P2)

- [x] T011 Create tests/handlers/list_moods.test.ts — Tests first
- [x] T012 Create src/handlers/list_moods.ts — GET /moods handler
- [x] T013 Run ./dev/test — Verify tests pass

## Phase 5: User Story 3 — View trends (P3)

- [x] T014 Create tests/handlers/trends.test.ts — Tests first
- [x] T015 Create src/handlers/trends.ts — GET /trends handler
- [x] T016 Run ./dev/test — Verify tests pass

## Phase 6: Integration

- [x] T017 Create src/handlers/health.ts — Deep health check
- [x] T018 Update src/index.ts — Register all handlers
- [x] T019 Create tests/invariants.test.ts — Structural invariant tests
- [x] T020 Create src/server.ts — Bun.serve HTTP layer
- [x] T021 Run ./dev/test — Final pass
- [x] T022 Run ./dev/post_flight — Pre-commit validation
