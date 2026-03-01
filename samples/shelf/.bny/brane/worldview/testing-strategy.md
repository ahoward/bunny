# Testing Strategy

## Two-Layer Test Architecture

### 1. Invariant Tests (Framework Level)

Verify structural contracts that hold across all handlers:
- Every registered path returns a well-formed Result envelope
- No handler throws exceptions (all errors wrapped in Result)
- All handler files export a function
- Unknown paths return error Results, not exceptions
- At least one path is registered

These tests use dynamic discovery (Bun.Glob over handler files) so new handlers are automatically covered.

### 2. Handler Contract Tests (Feature Level)

Per-handler test files covering:
- Happy paths with minimal and full input
- Every validation rule (missing, empty, wrong type, whitespace-only)
- Multiple simultaneous validation errors
- Edge cases (non-existent IDs, empty collections)

## Key Patterns

- **Test through app.call()** — no HTTP layer, no mocking. Tests exercise the full stack from params to SQLite and back.
- **beforeEach isolation** — clear database before each test, not after. Guarantees clean state even if previous test failed.
- **Assert on Result structure** — check status, then safely access result/errors with type narrowing.
- **Separate concerns** — invariant tests never test business logic; handler tests never test framework contracts.
