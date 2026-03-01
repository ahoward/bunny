# Tasks: Core bookmark API

**Input**: Design documents from `/specs/007-core-bookmark-api/`

## Phase 1: Setup

- [x] T001 Create framework files: app.ts, lib/types.ts, lib/result.ts, lib/log.ts
- [x] T002 Create handlers/ping.ts health check handler

## Phase 2: Foundation

- [x] T003 Create lib/store.ts — SQLite storage with bookmarks table (bun:sqlite)
- [x] T004 Create tests/invariants.test.ts — contract tests for all handlers

## Phase 3: User Story 1+2 — Save & List (P1)

- [x] T005 [US1] Create handlers/save_bookmark.ts — validate url/tags/title/notes, persist to SQLite
- [x] T006 [US2] Create handlers/list_bookmarks.ts — read all bookmarks, newest first
- [x] T007 Create src/index.ts — register all handlers
- [x] T008 [P] [US1] Create tests/handlers/save_bookmark.test.ts — 16 test cases
- [x] T009 [P] [US2] Create tests/handlers/list_bookmarks.test.ts — 4 test cases

## Phase 4: User Story 3 — Delete (P2)

- [x] T010 [US3] Create handlers/delete_bookmark.ts — find by id, delete, return deleted
- [x] T011 [P] [US3] Create tests/handlers/delete_bookmark.test.ts — 7 test cases

## Phase 5: Polish

- [x] T012 Run all tests — 34 pass, 0 fail
- [x] T013 Update spec.md, plan.md, tasks.md with real content
