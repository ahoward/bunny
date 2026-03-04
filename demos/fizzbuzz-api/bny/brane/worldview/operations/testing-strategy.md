# Testing Strategy
Pure computation APIs are the easiest thing to test — so the test suite should be exemplary.

## Unit Tests
- Core fizzbuzz function in isolation (no HTTP)
- Edge cases: 0, 1, negative, MAX_SAFE_INTEGER
- Every divisor boundary: 3, 5, 15, and non-matches

## Integration Tests
- HTTP layer: correct status codes, content types, headers
- Route matching: valid routes return 200, unknown routes return 404
- Error responses: malformed input returns structured error JSON

## Property-Based Tests
- For any `n` divisible by 3, result contains "fizz"
- For any `n` divisible by 5, result contains "buzz"
- For any `n` divisible by 15, result is exactly "fizzbuzz"
- For any `n` not divisible by 3 or 5, result equals `String(n)`

## Load / Boundary Tests
- Large range requests (1 to 1,000,000) — does it stream or OOM?
- Concurrent requests — is the server stateless as claimed?

## What Makes This Interesting
FizzBuzz's determinism means tests can be exhaustive over small ranges and property-based over large ones. No mocks, no fixtures, no flakiness.
