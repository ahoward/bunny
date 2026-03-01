# Tasks: Core summarizer

**Input**: Design documents from `/specs/004-core-summarizer/`

## Phase 1: Setup

- [x] T001 Create project structure: `src/`, `src/lib/`, `src/handlers/`, `tests/`, `tests/fixtures/`
- [x] T002 Fix tsconfig.json — add `allowImportingTsExtensions`

## Phase 2: Framework

- [x] T003 [P] Create `src/lib/types.ts` — Result, Params, Handler, Emit, Meta types
- [x] T004 [P] Create `src/lib/result.ts` — success/error/required/invalid helpers
- [x] T005 [P] Create `src/lib/log.ts` — structured JSON logging to stderr
- [x] T006 Create `src/app.ts` — app.call interface with handler registry
- [x] T007 Create `src/handlers/ping.ts` — health check handler
- [x] T008 Create `src/index.ts` — register ping handler

## Phase 3: Invariant Tests

- [x] T009 Create `tests/invariants.test.ts` — 6 framework invariant tests

**Checkpoint**: Framework works, ping handler passes all invariants

## Phase 4: Core Summarizer (P1)

- [x] T010 Create `tests/fixtures/summarize/sample.txt` — test input file
- [x] T011 Create `tests/summarize.test.ts` — 8 tests with mocked Anthropic SDK
- [x] T012 Create `src/handlers/summarize.ts` — Claude API summarization handler
- [x] T013 Register `/summarize` in `src/index.ts`

**Checkpoint**: 14 tests pass, type check clean

## Phase 5: CLI

- [x] T014 Create `bin/tldr` — CLI entry point, parses argv, calls `/summarize`, prints to stdout

## Results

- 14 tests passing (6 invariants + 8 summarize)
- Type check: zero errors
- post_flight: ok
