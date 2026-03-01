# Worldview — Architecture Knowledge Base

Patterns and conventions that define how this application is built.

## Core Patterns

- **[Result Envelope](result-envelope-pattern.md)** — Uniform `Result<T>` wrapper for all handler responses. Errors are data, never exceptions. Discriminated on `status`, with hierarchical error maps and always-present metadata.

- **[app.call Dispatch](app-call-dispatch.md)** — Central `app.call(path, params)` router that decouples handler logic from transport. Provides unified error boundary, performance tracking, and structured logging.

- **[Guard Early Validation](guard-early-validation.md)** — All validation at the top of every handler, cheapest checks first. Each guard returns a structured error Result. Business logic only runs after all guards pass. Includes mutual exclusion guards for multi-source inputs.

- **[Multi-Source Input](multi-source-input.md)** — Pattern for handlers that accept content from multiple sources (file, URL, stdin). Enforces exactly-one via guards, normalizes to common shape, keeps handler transport-agnostic.

## Layers

- **[CLI as Presentation Layer](cli-as-presentation-layer.md)** — `bin/` entry points do zero business logic: parse argv, detect input mode, dispatch to handler, format output, set exit code. Handlers stay transport-agnostic.

## Testing

- **[Testing Patterns](testing-patterns.md)** — Two-layer strategy: invariant tests (framework contract, portable across apps) and handler-specific tests (guards, edge cases, mocks). Fixtures are POD in `tests/fixtures/`. Includes fetch mocking for URL-based handlers.
