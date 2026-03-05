# Challenge: 001-cron-expression-parser

### 1. Sub-Minute Precision Handling
- **Gap**: The specification states that `next_times` computes fire times "strictly after" the start time, but cron expressions only have minute-level resolution. It is undefined how seconds and milliseconds in the `start` parameter are handled. If `start` has non-zero seconds, returning the current minute's `00` second would violate the "strictly after" rule.
- **Severity**: critical
- **Scenario**: 
  - **Given** expression `"* * * * *"` and start time `2026-03-05T10:30:45.000Z`
  - **When** I call `next_times(expr, start, 1)`
  - **Then** it is ambiguous whether the system should return `2026-03-05T10:31:00Z` (truncating seconds and advancing) or try to fire at `10:31:45Z`.

### 2. Iteration Guard Return State
- **Gap**: FR-014 dictates a maximum iteration guard to prevent infinite loops (e.g., Feb 30), but fails to define the function's return state when this limit is hit. Returning a partial array is misleading, and throwing an exception violates FR-012.
- **Severity**: high
- **Scenario**:
  - **Given** expression `"0 0 30 2 *"` (February 30) and start time `2026-01-01T00:00:00Z`
  - **When** I call `next_times(expr, start, 5)` and the 10,000 iteration limit is reached
  - **Then** the function should return a `CronResult` with `ok: false` and a timeout/iteration error, rather than hanging or returning an empty/partial array.

### 3. Step Suffix Applicability in Lists
- **Gap**: FR-003 says the system must support list (`,`), range (`-`), and step (`/`) syntax, but does not specify if they can be combined arbitrarily. Standard cron allows steps on ranges (e.g., `1-10/2`), but behavior for steps applied to lists or inside lists is highly ambiguous.
- **Severity**: high
- **Scenario**:
  - **Given** expression `"1,5,10-20/5 * * * *"`
  - **When** I call `parse(expr)`
  - **Then** it is undefined whether the `/5` applies only to the `10-20` range, the entire list, or if this should be rejected as a syntax error.

### 4. Step Values Exceeding Maximum Range
- **Gap**: FR-005 explicitly rejects step values of 0, but ignores step values that exceed the logical maximum for a field.
- **Severity**: medium
- **Scenario**:
  - **Given** expression `"*/60 * * * *"` (minute step 60)
  - **When** I call `parse(expr)`
  - **Then** it is undefined whether this should result in a validation error or gracefully evaluate to `[0]`.

### 5. Missing Validation for Whitespace Inside Expressions
- **Gap**: FR-015 specifies tolerating whitespace *between* fields, but fails to define behavior for whitespace *inside* fields (e.g., around commas or dashes).
- **Severity**: medium
- **Scenario**:
  - **Given** expression `"0 0 1, 15 * *"`
  - **When** I call `parse(expr)`
  - **Then** it is undefined whether this parses successfully by trimming internal whitespace or fails due to strict tokenization.

### 6. Timezone/Local Time Leakage via `Date` Object
- **Gap**: The `start` parameter accepts a JS `Date` object, which implicitly carries system local time concepts depending on how it's queried (e.g., `.getHours()` vs `.getUTCHours()`). If the implementation inadvertently uses local time getters, DST shifts will cause catastrophic drift in `next_times` output.
- **Severity**: high
- **Scenario**:
  - **Given** expression `"0 0 * * *"` and a `start` Date object created with `new Date("2026-03-05T00:00:00-05:00")`
  - **When** I call `next_times(expr, start, 1)` on a machine in the PST timezone
  - **Then** the implementation must strictly use UTC getters to return `2026-03-06T00:00:00Z`, bypassing all local timezone and DST adjustments.

### 7. Zero-Length Ranges
- **Gap**: FR-006 rejects ranges where start exceeds end (e.g., `5-1`), but does not clarify behavior for zero-length ranges (e.g., `1-1`).
- **Severity**: low
- **Scenario**:
  - **Given** expression `"1-1 * * * *"`
  - **When** I call `parse(expr)`
  - **Then** it is undefined whether this is rejected as malformed or simplified to a single value `[1]`.

### 8. One Wildcard, One Restricted Day Field
- **Gap**: FR-008 clarifies OR semantics when *both* day fields are non-wildcard, but US-5 lacks an explicit test for when exactly *one* is a wildcard to ensure AND semantics are strictly maintained.
- **Severity**: medium
- **Scenario**:
  - **Given** expression `"0 0 * * 5"` and start `2026-03-01T00:00:00Z`
  - **When** I call `next_times(expr, start, 5)`
  - **Then** the result must ONLY include Fridays. It must not fire every day of the month (which would happen if OR semantics were mistakenly applied to the wildcard).
