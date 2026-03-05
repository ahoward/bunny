# Implementation Patterns
Durable patterns that emerged from building the cron expression parser.

## Result Envelope Pattern

`CronResult<T>` as a discriminated union (`{ ok: true; value: T } | { ok: false; error: string }`) with `ok()` and `err()` helper constructors. Every public function returns this — no exceptions for control flow. Errors propagate by early-returning the inner error with a contextual prefix:

```ts
if (!result.ok) return err(`field ${i} (${name}): ${result.error}`)
```

This gives callers a chain of context without stack traces.

## Wildcard Tracking for Semantic Dispatch

The `dom_wild` and `dow_wild` booleans on `ParsedCron` were essential. You cannot determine OR-vs-AND semantics from the expanded arrays alone — `[1..31]` could come from `*` or from `1-31`. The raw token intent must be preserved as metadata alongside the expanded values.

**Pattern:** When expansion loses information about the original input's intent, carry a boolean flag forward.

## Field-by-Field Forward Search

The next-times algorithm processes fields from most-significant (month) to least-significant (minute), jumping directly to the next valid value. Key mechanics:

1. **find_next()** — linear scan through a sorted array for the first value ≥ target. Returns null when exhausted, triggering rollover to the next higher field.
2. **Cascading reset** — when advancing a higher field (e.g., month), all lower fields reset to their minimum (day=1, hour=0, minute=0).
3. **Dynamic day validation** — valid days are recomputed each iteration because they depend on the current month/year context.

## Cursor Initialization for Exclusive Start

To exclude the start time itself (EC-5: start matching expression is not included), the cursor advances +1 minute from start, truncated to minute boundary. This is simpler than a "match then skip" check.

## Iteration Guard Design

The guard uses `n * 10_000` max iterations. When exhausted, it returns an **error** (not partial results). This is a deliberate choice: partial results could silently mislead callers. The degenerate case (Feb 30, which never fires) correctly returns an error rather than hanging.

## days_in_month Trick

```ts
new Date(Date.UTC(year, month, 0)).getUTCDate()
```

Day 0 of month M is the last day of month M-1. This handles leap years automatically via the Date constructor. Note: `month` here is 1-based, which maps to JS's 0-based months correctly (month 2 → `Date.UTC(year, 2, 0)` → last day of February).

## OR Semantics for Day Fields

When both day-of-month and day-of-week are non-wildcard, valid days = union of both sets. When only one is specified (the other is `*`), only that field filters. When both are `*`, every day matches. The four-case dispatch in `compute_valid_days` covers this cleanly.

## Day-of-Week Normalization

Both 0 and 7 mean Sunday. Normalization happens in `parse()` after field expansion: map 7→0, deduplicate, filter to 0–6, re-sort. The `expand_field` function intentionally does NOT normalize — it stays generic, and the domain-specific adjustment lives in `parse`.
