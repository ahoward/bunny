# Data Model Design
Expanded sorted sets with wildcard-tracking booleans — the chosen internal representation for parsed cron expressions.

## Final Design: Expanded Sets + Wild Flags

```ts
type ParsedCron = {
  minutes: number[]        // sorted, values 0–59
  hours: number[]          // sorted, values 0–23
  days_of_month: number[]  // sorted, values 1–31
  months: number[]         // sorted, values 1–12
  days_of_week: number[]   // sorted, values 0–6 (normalized, 7→0)
  dom_wild: boolean        // true if day-of-month token was "*"
  dow_wild: boolean        // true if day-of-week token was "*"
}
```

## Why Expanded Sets

Option B from the original analysis won. Validation is implicit (empty set = invalid), downstream consumption is trivial (`includes()` or `find_next()`), and it aligns with POD-only conventions.

## Why Wild Flags Were Necessary

The expanded array for `*` in day-of-month is `[1..31]` — identical to the expansion of `1-31`. But cron's OR semantics require knowing whether the original token was a wildcard. Without `dom_wild`/`dow_wild`, the four-case day-validation dispatch cannot distinguish "match all days" from "match these specific days".

## Alternatives Considered

| Option | Verdict |
|--------|--------|
| Raw token AST | Too complex for downstream; requires re-expansion at query time |
| Bitmask (bigint) | Overkill for this scale; harder to debug |
| Expanded sets only | Loses wildcard intent — breaks OR semantics |
| Expanded sets + wild flags | **Chosen** — minimal metadata overhead, preserves intent |
