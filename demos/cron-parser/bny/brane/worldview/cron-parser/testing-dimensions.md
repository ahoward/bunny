# Testing Dimensions
Five test axes plus implementation-discovered challenges for thorough cron parser coverage.

## Test Organization (As Implemented)

```
tests/
  contracts/         # API contract tests (parse, next_times)
  property/          # Property-based tests (invariants across inputs)
  golden/            # Golden file tests (known-good output snapshots)
  boundary/          # Edge cases and boundary conditions
  fixtures/          # Deterministic test data (JSON golden files)
```

Tests use `node:test` and `node:assert` (not `bun:test`), making them runtime-agnostic.

## Axis 1: Syntax Validation

- Valid expressions with every feature combination
- Invalid field counts, out-of-range values
- Malformed tokens: `1--5`, `*/`, `/5`, trailing commas
- Whitespace tolerance: leading, trailing, multiple spaces, tabs
- Non-numeric characters rejected (named values out of scope)

## Axis 2: Computation Correctness

- Known fire times for common expressions
- Year/month rollover with varying month lengths
- Leap year February 29
- Day-of-week + day-of-month OR semantics
- Step alignment verification

## Axis 3: Determinism & Reproducibility

- Same inputs → same outputs (property tests verify sorted, in-bounds, no duplicates)
- Golden file tests lock known-good output for complex schedules

## Axis 4: Performance & Limits

- N=0 → empty, N=1 → exactly one
- Degenerate expressions (Feb 30) hit iteration guard → error
- Large N with sparse schedule terminates within guard

## Axis 5: API Contract

- Return type is POD (arrays of ISO 8601 strings)
- Errors via `CronResult` envelope, never thrown
- Null/undefined inputs handled

## Implementation-Discovered Challenges

| Challenge | What It Tests |
|-----------|---------------|
| Sub-minute precision | Start with seconds > 0; next time should be next whole minute |
| Iteration guard state | Degenerate expression returns error (not partial results) |
| Timezone leakage | `Date` constructed with offset string; output must be UTC |
| Exclusive start | Start time matching expression is excluded from results |
