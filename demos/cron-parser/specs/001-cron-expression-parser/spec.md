# Feature Specification: a cron expression parser that validates standard 5-field cron expressions and computes the next N scheduled times from a given start time

**Feature Branch**: `001-cron-expression-parser`
**Created**: 2026-03-05
**Status**: Draft

# Feature Spec: Cron Expression Parser

**Branch:** `001-cron-expression-parser`
**Date:** 2026-03-05

---

## 1. User Scenarios & Testing

### P1 — Core Parsing & Validation

**US-1: Parse a valid 5-field cron expression**

> As a caller, I want to parse a standard 5-field cron expression so that I get a structured representation of the schedule.

| # | Given | When | Then |
|---|-------|------|------|
| 1.1 | expression `"*/15 0 1,15 * 1-5"` | I call `parse(expr)` | I receive a `ParsedCron` with minutes `[0,15,30,45]`, hours `[0]`, days_of_month `[1,15]`, months `[1..12]`, days_of_week `[1,2,3,4,5]` |
| 1.2 | expression `"0 0 * * *"` | I call `parse(expr)` | minutes `[0]`, hours `[0]`, all days/months/dow |
| 1.3 | expression `"5 4 * * 0,7"` | I call `parse(expr)` | days_of_week normalizes both 0 and 7 to `[0]` (Sunday) |

**US-2: Reject invalid cron expressions**

> As a caller, I want clear errors for malformed expressions so I can report problems upstream.

| # | Given | When | Then |
|---|-------|------|------|
| 2.1 | expression `"* * *"` (3 fields) | I call `parse(expr)` | error result with message indicating wrong field count |
| 2.2 | expression `"60 * * * *"` (minute out of range) | I call `parse(expr)` | error result citing field 0 and allowed range 0–59 |
| 2.3 | expression `"* 24 * * *"` | I call `parse(expr)` | error result citing field 1 and allowed range 0–23 |
| 2.4 | expression `"* * 0 * *"` (day-of-month 0) | I call `parse(expr)` | error result citing field 2 and allowed range 1–31 |
| 2.5 | expression `"* * * 13 *"` | I call `parse(expr)` | error result citing field 3 and allowed range 1–12 |
| 2.6 | expression `"* * * * 8"` | I call `parse(expr)` | error result citing field 4 and allowed range 0–7 |
| 2.7 | expression `""` (empty string) | I call `parse(expr)` | error result |
| 2.8 | expression `"*/0 * * * *"` (step of zero) | I call `parse(expr)` | error result indicating invalid step value |

**US-3: Compute next N scheduled times**

> As a caller, I want the next N fire times from a start time so I can display or act on upcoming schedules.

| # | Given | When | Then |
|---|-------|------|------|
| 3.1 | expression `"0 * * * *"`, start `2026-03-05T10:30:00Z`, N=3 | I call `next_times(expr, start, 3)` | `[2026-03-05T11:00:00Z, 2026-03-05T12:00:00Z, 2026-03-05T13:00:00Z]` |
| 3.2 | expression `"*/15 * * * *"`, start `2026-03-05T10:00:00Z`, N=4 | I call `next_times(expr, start, 4)` | `[2026-03-05T10:15:00Z, 2026-03-05T10:30:00Z, 2026-03-05T10:45:00Z, 2026-03-05T11:00:00Z]` |
| 3.3 | expression `"0 0 1 1 *"`, start `2026-03-05T00:00:00Z`, N=2 | I call `next_times(expr, start, 2)` | `[2027-01-01T00:00:00Z, 2028-01-01T00:00:00Z]` |

### P2 — Temporal Edge Cases

**US-4: Handle year and month rollover**

| # | Given | When | Then |
|---|-------|------|------|
| 4.1 | expression `"59 23 31 12 *"`, start `2026-12-31T23:58:00Z`, N=2 | I call `next_times(...)` | `[2026-12-31T23:59:00Z, 2027-12-31T23:59:00Z]` |
| 4.2 | expression `"0 0 29 2 *"`, start `2026-01-01T00:00:00Z`, N=2 | I call `next_times(...)` | `[2028-02-29T00:00:00Z, 2032-02-29T00:00:00Z]` (leap years only) |

**US-5: Day-of-month and day-of-week OR semantics**

| # | Given | When | Then |
|---|-------|------|------|
| 5.1 | expression `"0 0 13 * 5"`, start `2026-03-01T00:00:00Z`, N=5 | I call `next_times(...)` | result includes both every Friday AND every 13th of the month (union/OR) |
| 5.2 | expression `"0 0 * * *"` (both day fields are `*`) | I call `next_times(...)` | fires every day (wildcard–wildcard is not affected by OR rule) |

### P3 — Convenience & Robustness

**US-6: Handle whitespace variations**

| # | Given | When | Then |
|---|-------|------|------|
| 6.1 | expression `"  0   0  *  *  *  "` (extra spaces) | I call `parse(expr)` | parses successfully, same as `"0 0 * * *"` |
| 6.2 | expression `"0\t0\t*\t*\t*"` (tabs) | I call `parse(expr)` | parses successfully |

**US-7: N boundary values**

| # | Given | When | Then |
|---|-------|------|------|
| 7.1 | any valid expression, N=0 | I call `next_times(...)` | returns empty array |
| 7.2 | any valid expression, N=1 | I call `next_times(...)` | returns array with exactly 1 element |

---

## 2. Edge Cases

| ID | Condition | Expected Behavior |
|----|-----------|-------------------|
| EC-1 | Expression `"0 0 31 2 *"` — Feb 31 never exists | `parse` succeeds (syntactically valid); `next_times` returns empty array with no hang |
| EC-2 | Expression `"0 0 30 2 *"` — Feb 30 never exists | Same as EC-1 |
| EC-3 | Expression `"0 0 31 4,6,9,11 *"` — 30-day months | `next_times` skips those months, fires only in months with 31 days if other months also listed |
| EC-4 | Step exceeds range: `"1-5/10 * * * *"` | Produces only `[1]` — step overshoots range, single value is valid |
| EC-5 | Start time exactly matches expression | Start time is **excluded**; next fire time is strictly after start |
| EC-6 | Large N with sparse schedule (`N=100`, `"0 0 29 2 *"`) | Must terminate; MUST NOT scan more than 10 years per result (guard) |
| EC-7 | Malformed tokens: `"1--5 * * * *"`, `"*/ * * * *"`, `"/5 * * * *"` | All return error results |
| EC-8 | Non-numeric input: `"JAN"`, `"MON"`, `"abc"` | Error result — named values not supported in standard 5-field format |
| EC-9 | Negative numbers: `"-1 * * * *"` | Error result |
| EC-10 | Leading zeros: `"07 * * * *"` | Accepted — parsed as `7` |
| EC-11 | Range with start > end: `"5-1 * * * *"` | Error result — invalid range |
| EC-12 | Day-of-week 7 normalized to 0 (Sunday) | `"* * * * 7"` and `"* * * * 0"` produce identical results |

---

## 3. Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | The system MUST parse standard 5-field cron expressions into an expanded-sets data model (sorted arrays of valid values per field). | P1 |
| FR-002 | The system MUST validate each field against its allowed numeric range: minute 0–59, hour 0–23, day-of-month 1–31, month 1–12, day-of-week 0–7. | P1 |
| FR-003 | The system MUST support wildcard (`*`), list (`,`), range (`-`), and step (`/`) syntax in each field. | P1 |
| FR-004 | The system MUST reject expressions with fewer or more than 5 fields. | P1 |
| FR-005 | The system MUST reject step values of 0 (e.g., `*/0`). | P1 |
| FR-006 | The system MUST reject ranges where start exceeds end (e.g., `5-1`). | P1 |
| FR-007 | The system MUST compute the next N fire times strictly after a given UTC start time. | P1 |
| FR-008 | The system MUST use OR semantics when both day-of-month and day-of-week are non-wildcard: a time matches if it satisfies either field. | P1 |
| FR-009 | The system MUST account for variable month lengths (28/29/30/31 days) and leap years when computing fire times. | P1 |
| FR-010 | The system MUST normalize day-of-week value 7 to 0 (both represent Sunday). | P1 |
| FR-011 | The system MUST return results as POD — an array of ISO 8601 UTC date strings or Unix timestamps, not class instances. | P1 |
| FR-012 | The system MUST return errors via a result envelope (not thrown exceptions). | P1 |
| FR-013 | The system MUST return an empty array when N=0. | P2 |
| FR-014 | The system MUST enforce a maximum iteration guard to prevent infinite loops on degenerate expressions (e.g., Feb 30). The limit SHOULD be configurable with a sensible default (e.g., 10,000 iterations). | P2 |
| FR-015 | The system SHOULD tolerate leading/trailing whitespace and multiple spaces/tabs between fields. | P3 |
| FR-016 | The system MUST reject non-numeric/named values (e.g., `JAN`, `MON`). Named values are out of scope. | P1 |
| FR-017 | [NEEDS CLARIFICATION] When an expression is syntactically valid but can never fire (e.g., `"0 0 31 2 *"`), should `parse` succeed and `next_times` return empty, or should `parse` itself reject it? **Current assumption:** `parse` succeeds; `next_times` returns empty. |
| FR-018 | [NEEDS CLARIFICATION] Should leading zeros in numeric values (e.g., `07`) be accepted or rejected? **Current assumption:** Accepted, parsed as the numeric value. |

---

## 4. Key Entities

ParsedCron (POD)
├── minutes: number[]        # sorted, values 0–59
├── hours: number[]          # sorted, values 0–23
├── days_of_month: number[]  # sorted, values 1–31
├── months: number[]         # sorted, values 1–12
└── days_of_week: number[]   # sorted, values 0–6 (normalized)

CronResult<T>
├── ok: true
│   └── value: T
└── ok: false
    └── error: string        # human-readable error message

next_times input
├── expression: string       # raw 5-field cron string
├── start: Date | string     # UTC start time
└── n: number                # count of fire times to compute

next_times output
└── CronResult<string[]>     # ISO 8601 UTC strings, sorted ascending


**Relationships:**
- `parse(expression)` → `CronResult<ParsedCron>`
- `next_times(expression, start, n)` calls `parse` internally, then iterates using the `ParsedCron` sets
- Day-of-month validity is checked dynamically against month/year context during `next_times` computation (not at parse time)
- Day-of-month and day-of-week interact via OR semantics only when both are non-wildcard

---

## 5. Success Criteria

| Criterion | Measure |
|-----------|---------|
| All P1 acceptance scenarios pass | 100% of US-1, US-2, US-3 scenarios green |
| All P2 acceptance scenarios pass | 100% of US-4, US-5 scenarios green |
| Edge cases covered | All EC-1 through EC-12 have corresponding test cases that pass |
| No infinite loops | `next_times` with any valid expression and N ≤ 1000 completes within 5 seconds |
| Deterministic output | Same inputs always produce identical output (verified by running each test 3× in CI) |
| POD contract | Return types contain no class instances — plain objects and arrays only |
| Error contract | No function throws; all errors returned via `CronResult` envelope |
| Zero dependencies | Implementation uses only Bun/TypeScript standard library |
