# Edge Cases & Boundary Conditions
A catalog of tricky inputs and temporal boundaries that break naive cron implementations.

## Impossible Schedules

- `0 0 31 2 *` — Feb 31 never exists; should the parser reject it or silently never fire?
- `0 0 30 2 *` — same problem
- `0 0 31 4,6,9,11 *` — April, June, Sept, Nov have 30 days
- What about `0 0 29 2 *`? Fires only on leap years — is that valid or degenerate?

## DST Transitions

Even if v1 is UTC-only, documenting DST pitfalls matters for future work:
- Spring forward: 2:30 AM doesn't exist → skip or fire at 3:00?
- Fall back: 1:30 AM happens twice → fire once or twice?
- Different systems handle this differently (cron implementations vary)

## Wraparound & Overflow

- `59 23 31 12 *` — last minute of the year; next fire is Jan 1 next year
- What's the maximum lookahead? If N=1000 and expression is `0 0 29 2 *`, you need to scan decades
- Should there be a max-iterations guard to prevent infinite loops on degenerate expressions?

## Field Interaction Gotchas

- `0 0 13 * 5` — the 13th OR any Friday (standard OR semantics)
- `0 0 * * *` with both day fields as `*` — AND or OR doesn't matter since both match everything
- Step values on ranges: `1-5/10` — step exceeds range, produces only `1`
- `0/0` — step of zero is undefined; should be a validation error

## Numeric Boundaries

- Day-of-week: 0 and 7 both mean Sunday — normalize internally?
- Month 0 or month 13 — reject
- Minute 60, hour 24 — reject
- Negative numbers — reject
- Leading zeros: `07` — valid or not?
