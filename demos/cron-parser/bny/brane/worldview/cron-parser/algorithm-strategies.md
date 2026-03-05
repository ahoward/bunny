# Algorithm Strategies for Next-Time Computation
Field-by-field forward search with dynamic day-of-month — the chosen algorithm for computing cron fire times.

## Chosen: Field-by-Field Forward Search

Process fields from most-significant (month) to least-significant (minute). At each field, jump to the next valid value using `find_next()` on the precomputed sorted set. When a field is exhausted (no valid value ≥ current), roll over to the next higher field and reset all lower fields.

### Core Loop Structure

```
while results < n AND iterations < guard:
  if month invalid → advance to next valid month, reset day/hour/min
  compute valid_days for this month (dynamic)
  if day invalid → advance to next valid day, reset hour/min
  if hour invalid → advance to next valid hour, reset min
  if minute invalid → advance to next valid minute
  all match → record, advance +1 minute
```

### Key Implementation Details

1. **Dynamic day computation** — `compute_valid_days()` is called each iteration because valid days depend on month length (28/29/30/31) and day-of-week mapping for the specific month/year.
2. **find_next()** — simple linear scan over sorted arrays. Binary search would be faster but arrays are small (max 60 elements for minutes).
3. **Iteration guard** — `n * 10_000` max iterations. Returns error on exhaustion rather than partial results.
4. **Cursor +1 minute** — start time is excluded by initializing the cursor 1 minute past start.

## Why Not Minute-by-Minute Walk

Pathologically slow for sparse schedules. `0 0 29 2 *` (leap year only) would scan ~525,600 minutes per year. The field-by-field approach jumps directly to the next valid month.

## Performance Characteristics

- **Dense schedules** (`* * * * *`): ~1 iteration per result
- **Hourly** (`0 * * * *`): ~2-3 iterations per result
- **Yearly** (`0 0 1 1 *`): ~4-5 iterations per result
- **Leap year only** (`0 0 29 2 *`): ~4 iterations per result (jumps by year)
- **Never fires** (`0 0 30 2 *`): hits iteration guard → error
