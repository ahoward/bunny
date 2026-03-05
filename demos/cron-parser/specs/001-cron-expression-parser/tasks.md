# Tasks: 001-cron-expression-parser

# Task List: 001-cron-expression-parser

## Phase 1: Setup

- [ ] T001 Create directory structure: `src/cron/` and `specs/cron/`
- [ ] T002 Run `./dev/pre_flight` to confirm environment is ready

**Checkpoint:** Directories exist, environment is green.

---

## Phase 2: Foundational — Types & Constants

- [ ] T003 [P] [US1][US2][US3] Implement `CronResult<T>` type, `ok()` and `err()` helpers in `src/cron/types.ts`
- [ ] T004 [P] [US1] Implement `ParsedCron` type (with `dom_wild` and `dow_wild` booleans) in `src/cron/types.ts`
- [ ] T005 [US1] Implement `FIELD_DEFS` constant array in `src/cron/types.ts`

**Checkpoint:** `src/cron/types.ts` exports all types and constants. `./dev/test` passes (no regressions).

---

## Phase 3: Foundational — Field Expansion

- [ ] T006 [US1][US2] Implement wildcard (`*`) expansion in `src/cron/expand_field.ts`
- [ ] T007 [US1][US2] Implement single numeric value parsing with validation in `src/cron/expand_field.ts`
- [ ] T008 [US1][US2] Implement range (`a-b`) expansion with start > end rejection in `src/cron/expand_field.ts`
- [ ] T009 [US1][US2] Implement step (`*/s`, `a/s`, `a-b/s`) expansion with step=0 rejection in `src/cron/expand_field.ts`
- [ ] T010 [US1][US2] Implement list (`,`) splitting, merging, sort, and dedup in `src/cron/expand_field.ts`
- [ ] T011 [US2] Implement malformed token rejection (non-numeric, `--`, `//`, `/5`, leading `-`, etc.) in `src/cron/expand_field.ts`
- [ ] T012 Run `./dev/test` — expand_field tests green

**Checkpoint:** `src/cron/expand_field.ts` handles all token patterns. Tests pass.

---

## Phase 4: User Stories P1 — Parse

- [ ] T013 [US1][US2][US6] Implement `parse()`: trim, split on `\s+`, reject field count ≠ 5 in `src/cron/parse.ts`
- [ ] T014 [US1][US2] Implement per-field expansion via `expand_field` with error propagation in `src/cron/parse.ts`
- [ ] T015 [US1] Implement day-of-week normalization (7→0, re-sort, dedup, clamp to 0–6) in `src/cron/parse.ts`
- [ ] T016 [US1] Track `dom_wild` and `dow_wild` booleans from raw tokens in `src/cron/parse.ts`
- [ ] T017 Run `./dev/test` — parse tests green (US-1, US-2, US-6, EC-4, EC-7–EC-12)

**Checkpoint:** `parse()` handles all valid and invalid expressions. Tests pass.

---

## Phase 5: User Stories P1 — Next Times Core

- [ ] T018 [US3] Implement `days_in_month(year, month)` helper in `src/cron/next_times.ts`
- [ ] T019 [US3] Implement `next_times()` scaffolding: guards (n≤0 → empty, parse error propagation, start coercion, cursor initialization at start+1min truncated) in `src/cron/next_times.ts`
- [ ] T020 [US3] Implement month advancement logic (skip to next valid month) in `src/cron/next_times.ts`
- [ ] T021 [US3][US5] Implement valid-days-in-month computation with OR semantics for dom/dow in `src/cron/next_times.ts`
- [ ] T022 [US3] Implement day, hour, and minute advancement logic in `src/cron/next_times.ts`
- [ ] T023 [US3] Implement match detection, result collection, and iteration guard (max `n * 10_000`) in `src/cron/next_times.ts`
- [ ] T024 Run `./dev/test` — next_times core tests green (US-3)

**Checkpoint:** `next_times()` computes correct fire times for basic expressions. Tests pass.

---

## Phase 6: User Stories P2 — Temporal Edge Cases

- [ ] T025 [US4] Verify year/month rollover (Dec 31 → Jan 1, leap year Feb 29) in `src/cron/next_times.ts` — fix any failures
- [ ] T026 [US5] Verify OR semantics for combined dom+dow expressions — fix any failures in `src/cron/next_times.ts`
- [ ] T027 Run `./dev/test` — US-4 and US-5 tests green

**Checkpoint:** All P2 temporal edge cases pass.

---

## Phase 7: User Stories P3 — Convenience & Edge Cases

- [ ] T028 [US6] Verify whitespace tolerance (extra spaces, tabs) — fix any failures in `src/cron/parse.ts`
- [ ] T029 [US7] Verify N boundary values (N=0, N=1) — fix any failures in `src/cron/next_times.ts`
- [ ] T030 Verify edge cases EC-1 through EC-6 (impossible dates, leading zeros, large N with sparse schedule) — fix any failures in `src/cron/next_times.ts`
- [ ] T031 Run `./dev/test` — all edge case tests green

**Checkpoint:** All P3 and edge case tests pass.

---

## Phase 8: Polish — Integration & Export

- [ ] T032 Create `src/cron/index.ts` exporting `parse`, `next_times`, `ParsedCron`, and `CronResult`
- [ ] T033 Run `./dev/test` — full suite green, zero failures
- [ ] T034 Run `./dev/post_flight` — clean
- [ ] T035 Append decision to `bny/decisions.md`: implemented cron expression parser with parse + next_times

**Checkpoint:** Feature complete. All tests pass. Post-flight clean.
