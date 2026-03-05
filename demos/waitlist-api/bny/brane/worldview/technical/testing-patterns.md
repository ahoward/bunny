# Testing Patterns
How the test suite is organized and patterns for testing a Hono + SQLite API.

## Test App Factory
`create_test_app()` calls `open_db(':memory:')` which replaces the global DB singleton with a fresh in-memory SQLite instance. All tests share the same Hono app instance but get a clean database. This means tests within a file share state — earlier tests' data persists.

## Testing Hono Without a Server
Hono's `app.request()` method allows making requests without starting an HTTP server:
```typescript
const res = await app.request('/health');
const body = await res.json();
```
This is faster than spinning up `Bun.serve` and avoids port conflicts in parallel test runs.

## Auth in Tests
Admin endpoints require `Authorization: Bearer test_key`. The test helper exports an `api_key` constant. Tests pass it via headers:
```typescript
app.request('/waitlists', { method: 'POST', headers: { 'Authorization': 'Bearer test_key', 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Test' }) })
```

## Test Organization
Tests are organized by concern rather than by endpoint:
- `contracts/` — API contract tests (request/response shape, status codes)
- `property/` — Property-based tests (score math invariants)
- `boundary/` — Edge cases and security (SSRF, rate limiting, input validation)
- `golden/` — Position calculation golden-path scenarios

## Known Test Limitation
The global DB singleton pattern means tests cannot run in parallel within a single file if they depend on database isolation. Each file gets a fresh `open_db(':memory:')` call, but all tests in that file see cumulative state.
