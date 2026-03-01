# Worldview Knowledge Base

## Architecture

- **[app-call-framework.md](app-call-framework.md)** — Handler registry pattern: `app.register()` / `app.call()` with Result envelope wrapping, automatic error handling, and call metadata
- **[pod-architecture.md](pod-architecture.md)** — Plain Old Data principles: interfaces over classes, null over undefined, functions over methods, no premature abstraction

## Data & Storage

- **[sqlite-storage.md](sqlite-storage.md)** — bun:sqlite with lazy singleton, UUID primary keys, JSON-in-TEXT columns, ISO timestamps, thin store functions over prepared statements

## Quality

- **[testing-strategy.md](testing-strategy.md)** — Two-layer tests: invariant tests (structural contracts across all handlers) + handler contract tests (per-feature validation, happy/sad paths). All tests go through `app.call()`, no mocking
- **[validation-patterns.md](validation-patterns.md)** — Guard-early with error accumulation, field-keyed ErrorMap, whitespace normalization, `required()`/`invalid()` helpers

## Key Patterns

- Every response is a **Result envelope** (`status`, `result`, `errors`, `meta`)
- **No classes** for data, no exceptions for control flow
- **snake_case** everywhere, null for absence
- Tests use **beforeEach isolation** with database clearing
