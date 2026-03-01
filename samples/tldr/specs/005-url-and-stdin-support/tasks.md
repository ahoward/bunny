# Tasks: URL and stdin support

**Input**: `specs/005-url-and-stdin-support/spec.md`

## Phase 1: Tests

- [x] T001 [US1] Add URL success/error tests to tests/summarize.test.ts
- [x] T002 [US2] Add content/stdin success/error tests to tests/summarize.test.ts
- [x] T003 [US3] Add multi-source rejection test to tests/summarize.test.ts

## Phase 2: Handler

- [x] T004 [US1][US2][US3] Refactor src/handlers/summarize.ts to support file_path, url, and content params
- [x] T005 [US1] Add URL validation (http/https prefix, valid format) and fetch with error handling
- [x] T006 [US2] Add content param support with empty/whitespace validation and custom source label
- [x] T007 [US3] Add mutual exclusion guard — exactly one input source required

## Phase 3: CLI

- [x] T008 [US3] Update bin/tldr to auto-detect URL vs file path from args
- [x] T009 [US2] Add stdin detection (isTTY check) and explicit `-` flag support
- [x] T010 Update usage/help text with new input modes

## Validation

- [x] T011 All 24 tests pass (./dev/test)
- [x] T012 Type check clean (./dev/post_flight ok)
