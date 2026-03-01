# app.call Dispatch Pattern

Central request dispatcher that routes string paths to registered handlers.

## Interface

```typescript
async function call(path: string, params: Params, emit?: Emit): Promise<Result>
```

## Responsibilities

1. **Handler registry**: `Map<string, Handler>` keyed by path (e.g., `/summarize`)
2. **Unified error boundary**: catches all handler exceptions, wraps in Result envelope
3. **Performance tracking**: measures `duration_ms` via `performance.now()`
4. **Structured logging**: every call logged as JSON line to stderr
5. **Metadata enrichment**: adds path, timestamp, duration_ms to every response

## Registration

Single `index.ts` file imports and registers all handlers — one place to see all endpoints. Adding a handler is two lines: import + register.

## Design Insight

This pattern decouples handler logic from transport. The same handler works behind:
- A CLI entry point (bin/tldr)
- A test harness (direct app.call)
- A future HTTP server (wrap app.call in request handler)

The CLI is a thin presentation layer: call handler, format Result for humans, set exit code.
