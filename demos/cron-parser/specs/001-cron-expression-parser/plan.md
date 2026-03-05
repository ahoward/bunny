# Implementation Plan: 001-cron-expression-parser

**Date**: 2026-03-05
**Spec**: specs/001-cron-expression-parser/spec.md

# Implementation Plan: Cron Expression Parser

**Feature:** `001-cron-expression-parser`
**Date:** 2026-03-05

---

## 1. Summary

Build a zero-dependency cron expression parser in Bun/TypeScript that validates standard 5-field cron expressions and computes the next N scheduled UTC fire times from a given start time. The approach uses **expanded sorted sets** as the internal data model and a **precomputed-sets algorithm with dynamic day-of-month adjustment** for next-time computation. All functions return POD via a `CronResult<T>` envelope — no exceptions for control flow.

---

## 2. Technical Context

| Aspect | Choice |
|--------|--------|
| Runtime | Bun |
| Language | TypeScript (strict) |
| Test framework | `bun:test` |
| Dependencies | Zero (stdlib only) |
| Target platform | Any Bun-compatible environment |
| Time handling | UTC only (`Date` in UTC) |
| Code style | snake_case, POD only, guard-early, no classes for data |

---

## 3. Project Structure

src/
  cron/
    types.ts          # CronResult<T>, ParsedCron, FieldDef, FIELD_DEFS constant
    parse.ts          # parse(expression: string) → CronResult<ParsedCron>
    next_times.ts     # next_times(expression: string, start: Date | string, n: number) → CronResult<string[]>
    expand_field.ts   # expand_field(token: string, min: number, max: number) → CronResult<number[]>
specs/
  cron/
    parse.test.ts     # US-1, US-2, US-6, EC-4, EC-7–EC-12
    next_times.test.ts # US-3, US-4, US-5, US-7, EC-1–EC-3, EC-5, EC-6
    expand_field.test.ts # Unit tests for field expansion logic


---

## 4. Implementation Phases

### Phase 1: Types & Constants

**File:** `src/cron/types.ts`

**Deliverables:**
- `CronResult<T>` type: `{ ok: true; value: T } | { ok: false; error: string }`
- `ParsedCron` type: `{ minutes: number[]; hours: number[]; days_of_month: number[]; months: number[]; days_of_week: number[] }`
- `FIELD_DEFS` constant array:

ts
const FIELD_DEFS = [
  { name: "minute",       min: 0, max: 59 },
  { name: "hour",         min: 0, max: 23 },
  { name: "day_of_month", min: 1, max: 31 },
  { name: "month",        min: 1, max: 12 },
  { name: "day_of_week",  min: 0, max: 7  },
] as const


- Helper constructors: `ok<T>(value: T): CronResult<T>` and `err<T>(error: string): CronResult<T>`

---

### Phase 2: Field Expansion

**File:** `src/cron/expand_field.ts`

**Signature:**
ts
function expand_field(token: string, min: number, max: number): CronResult<number[]>


**Logic (in order):**

1. **Wildcard** — `*` → return `[min..max]`
2. **Split on `,`** — process each sub-token, merge into a sorted deduplicated set
3. **For each sub-token**, detect pattern:
   - `a-b/s` → range with step
   - `a-b` → range (step=1)
   - `*/s` or `a/s` → step from `a` (or `min` for `*`) through `max`
   - `n` → single numeric value
4. **Validate** at each stage:
   - Reject non-numeric characters (letters, `--`, `//`, trailing `,`, etc.)
   - Reject values outside `[min, max]`
   - Reject step = 0
   - Reject range where start > end
5. **Return** sorted, deduplicated `number[]`

**Key detail:** This function does NOT normalize day-of-week 7→0. That happens in `parse`.

---

### Phase 3: Parse

**File:** `src/cron/parse.ts`

**Signature:**
ts
function parse(expression: string): CronResult<ParsedCron>


**Logic:**

1. Guard: reject null/undefined/empty input
2. Split on `/\s+/` after trimming — reject if field count ≠ 5
3. For each field, call `expand_field(token, FIELD_DEFS[i].min, FIELD_DEFS[i].max)` — propagate first error
4. **Normalize day-of-week:** replace any `7` with `0`, re-sort, deduplicate
5. **Clamp day-of-week max:** after normalization, filter to `[0, 6]` range
6. Return `ok({ minutes, hours, days_of_month, months, days_of_week })`

---

### Phase 4: Next Times Computation

**File:** `src/cron/next_times.ts`

**Signature:**
ts
function next_times(expression: string, start: Date | string, n: number): CronResult<string[]>


**Algorithm — field-by-field forward search:**

1. Guard: `n <= 0` → return `ok([])`
2. Parse expression — propagate error if invalid
3. Coerce `start` to `Date`; set cursor to start + 1 minute (truncated to minute boundary — seconds/ms zeroed). This ensures EC-5 (start time excluded).
4. Determine OR semantics flag: `both_day_fields_specified = (days_of_month was not from a plain `*` token) AND (days_of_week was not from a plain `*` token)`. **Important:** store a `dom_is_wild` and `dow_is_wild` boolean in `ParsedCron` (or pass alongside) — extend the type to include `{ dom_wild: boolean; dow_wild: boolean }`.
5. **Search loop** (max iterations = `n * 10_000`, default guard):

while results.length < n AND iterations < max:
  - if cursor.month not in months → advance to 1st day of next valid month, reset day/hour/min, continue
  - compute days_valid_this_month:
      actual_days = days_in_month(cursor.year, cursor.month)
      dom_valid = days_of_month.filter(d => d <= actual_days)
      if both_day_fields_specified:
        dow_valid = all days in this month whose weekday is in days_of_week
        valid_days = union(dom_valid, dow_valid), sorted
      else:
        if dom_is_wild: valid_days = filter by dow
        else: valid_days = dom_valid  (if dow_is_wild, dom takes precedence)
        (when both wild, every day is valid)
  - if cursor.day not in valid_days → advance to next valid day (or next month if none left), reset hour/min, continue
  - if cursor.hour not in hours → advance to next valid hour (or next day), reset min, continue
  - if cursor.minute not in minutes → advance to next valid minute (or next hour), continue
  - all fields match → push cursor.toISOString(), advance by 1 minute, continue


6. If loop exhausts max iterations → return `ok(results)` (partial results for degenerate expressions, or empty if none found).

**Helper:** `days_in_month(year: number, month: number): number` — use `new Date(Date.UTC(year, month, 0)).getUTCDate()`.

---

### Phase 5: Tests

Tests are written by the antagonist agent per the project protocol. The test files live at:

- `specs/cron/expand_field.test.ts` — field expansion unit tests
- `specs/cron/parse.test.ts` — parsing and validation (US-1, US-2, US-6, EC-4, EC-7–EC-12)
- `specs/cron/next_times.test.ts` — computation and edge cases (US-3, US-4, US-5, US-7, EC-1–EC-3, EC-5, EC-6)

Implementation must pass all tests without modification.

---

### Phase 6: Integration & Wiring

- Export public API from `src/cron/index.ts`:

ts
export { parse } from "./parse"
export { next_times } from "./next_times"
export type { ParsedCron, CronResult } from "./types"


- Run `./dev/test` — all green
- Run `./dev/post_flight` — clean

---

## 5. Dependencies & Execution Order

Phase 1: types.ts
   │
   ▼
Phase 2: expand_field.ts ──────────┐
   │                                │
   ▼                                │ (parallel: tests can be written
Phase 3: parse.ts                   │  against Phase 1 types while
   │                                │  implementation proceeds)
   ▼                                │
Phase 4: next_times.ts ◄───────────┘
   │
   ▼
Phase 5: Tests (written by antagonist, run by implementor)
   │
   ▼
Phase 6: Integration & export


**Parallel opportunities:**
- `expand_field.ts` and test authoring can happen concurrently
- `parse.ts` and `next_times.ts` are sequential (next_times depends on parse)
- Test writing (antagonist) can begin as soon as Phase 1 types are defined

**Blockers:**
- Phase 2 blocks Phase 3 (parse calls expand_field)
- Phase 3 blocks Phase 4 (next_times calls parse)
- All phases block Phase 6 (integration)
