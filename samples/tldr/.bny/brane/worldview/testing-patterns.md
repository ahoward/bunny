# Testing Patterns

## Two-Layer Testing Strategy

### Layer 1: Invariant Tests (Framework Contract)

Tests that verify the app structure and pattern compliance, not business logic:

- Registry populated (at least one handler)
- All handlers return correct Result envelope shape
- Status is only "success" or "error" (never "exception")
- No exceptions escape handlers
- Every file in `src/handlers/*.ts` exports a `handler` function
- Unknown paths return error Result, not exception

These are portable — they work for any app built on the pattern, unchanged.

### Layer 2: Handler-Specific Tests

Test guards, edge cases, integration, and Result structure for each handler:

- Null/missing params
- Each validation guard individually
- Happy path with expected output shape
- Error cases from external dependencies
- Meta shape verification
- **Mutual exclusion** — when handler accepts multiple input sources, test that providing zero or multiple returns structured errors
- **Per-source validation** — test each input source path independently (e.g., file_path errors, URL fetch errors, empty content)

## Mock Strategy for External APIs

Use `mock.module()` (bun:test) to replace SDK at module level:

```typescript
const mock_create = mock(() => Promise.resolve({ ... }))
mock.module("@anthropic-ai/sdk", () => ({
  default: class Anthropic {
    messages = { create: mock_create }
  }
}))
```

Key: mock the constructor to return an object with the right method shape. Enables deterministic tests without credentials or network.

### Mocking fetch for URL Tests

Use `globalThis.fetch = mock(...)` or `mock.module` to intercept HTTP calls. Return controlled responses for success, error status codes, network failures, and oversized content. Always restore the original after tests.

## Fixture Convention

```
tests/fixtures/{handler}/
  input.json      # Expected params shape
  expected.json   # Expected result structure
  sample.txt      # Test data files
```

Fixtures are POD — no logic, just data.

## Test Counting

When adding a new input source or param to an existing handler, expect roughly 3-4 new tests per source (validation, happy path, error cases, edge cases). The mutual exclusion guard adds 2 tests (zero sources, multiple sources). Plan test counts during specification to set clear acceptance criteria.
