# Verification: 001-cron-expression-parser

### 1. The 2-Digit Year `Date.UTC` Mutation Trap
- **Issue**: The implementation relies on `new Date(Date.UTC(year, month, ...))` to instantiate cursors, compute month boundaries, and resolve days of the week. In JavaScript, `Date.UTC()` silently mutates years `0` through `99` into `1900` through `1999`. If a caller requests a start date in the first century, the system warps the computation to the 20th century, returning completely incorrect timestamps and computing leap years against the wrong century.
- **Severity**: critical
- **Suggested Test**: 
  - **Given** start `0050-01-01T00:00:00Z` and expression `0 0 1 1 *`
  - **When** calling `next_times`
  - **Then** ensure the result returns `0051-01-01T00:00:00.000Z` rather than `1951-01-01T00:00:00.000Z`.

### 2. Semantic Breakage on Equivalent Wildcards (e.g., `*/1`)
- **Issue**: The parser determines OR vs AND semantics for day fields using strict literal checks (`const dom_wild = tokens[2] === "*"`). If a user passes an equivalent wildcard expression like `*/1` or `1-31` for the day-of-month, `dom_wild` evaluates to `false`. If the day-of-week is also specified, `both_specified` evaluates to `true`, incorrectly triggering OR semantics. This causes `0 0 */1 * 1` to fire *every single day* of the month rather than strictly on Mondays.
- **Severity**: high
- **Suggested Test**:
  - **Given** expression `0 0 */1 * 1` and start `2026-03-01T00:00:00Z`
  - **When** calling `next_times`
  - **Then** ensure the results *only* contain Mondays (enforcing AND semantics), rather than unioning with every day of the month.

### 3. Violation of 10-Year Calendar Scan Limit (EC-6)
- **Issue**: Specification EC-6 explicitly demands: `MUST NOT scan more than 10 years per result (guard)`. The implementation mistakenly tracks *loop iterations* instead of calendar time (`max_iter = n * 10_000`). Because the algorithm heavily optimizes execution by jumping whole months or days per iteration rather than advancing minute-by-minute, `10,000` iterations can cover over `800` calendar years. An impossible date like `0 0 30 2 *` will quietly scan centuries before the arbitrary iteration guard finally stops it.
- **Severity**: high
- **Suggested Test**:
  - **Given** expression `0 0 30 2 *` and start `2026-01-01T00:00:00Z`
  - **When** calling `next_times`
  - **Then** assert the result aborts and returns an error specifying the `10 year limit` was exceeded, rather than hitting a generic iteration limit after simulating centuries.

### 4. Infinite Loop Spin on `NaN` / Invalid Start Dates
- **Issue**: The `next_times` function accepts `Date | string` for the start time. If the caller provides an invalid date string (e.g., `"invalid-date"`), `s.getTime()` evaluates to `NaN`. The function silently propagates `NaN` to `year`, `month`, and `day`, and enters the core `while` loop. Because it cannot find `NaN` inside the valid arrays, it spins for the entire `max_iter` (up to millions of loops) doing dead math before returning an `iteration limit reached` error. This masks the invalid input and wastes CPU cycles.
- **Severity**: medium
- **Suggested Test**:
  - **Given** expression `* * * * *` and start time `"invalid-date"`
  - **When** calling `next_times`
  - **Then** ensure it immediately returns a `CronResult.err` explicitly citing an invalid start date, bypassing the iteration loop entirely.
