# Test Organization for APIs
Separate unit tests (pure logic) from integration tests (HTTP layer) in distinct files.

## Two-File Pattern

```
tests/
  fizzbuzz.test.ts   — pure function tests, no server
  server.test.ts     — HTTP integration tests, real server
```

## Unit Tests

- Import the pure function directly
- Test all boundary cases: 1, 3, 5, 15, non-multiples, large numbers
- Test batch functions (range) for correct count and ordering
- No HTTP, no server lifecycle — fast and isolated

## Integration Tests

- Start a real server on port `0` in `beforeAll`
- Stop it in `afterAll`
- Test via `fetch()` against actual HTTP endpoints
- Verify: status codes, content-type headers, response body structure
- Test error paths: invalid input, missing params, unknown routes

## Why This Split

- Unit tests catch logic bugs instantly (no server overhead)
- Integration tests catch routing, serialization, and header bugs
- Failures are immediately attributable to the right layer
- Both run with `bun test` — no special configuration needed
