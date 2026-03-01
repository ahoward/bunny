# app.call Framework Pattern

Minimal handler registry that decouples routing from execution.

## Core Design

- `app.register(path, handler)` maps string paths to async functions
- `app.call(path, params?, emit?)` invokes handler, wraps in Result envelope
- `app.paths()` returns sorted registered paths for discovery
- `app.parse_params(json)` safely parses JSON input with error Results on failure

## Handler Signature

```typescript
type Handler = (params: Params, emit?: Emit) => Promise<Result>
```

Handlers receive plain params and return Result envelopes. The framework catches exceptions and converts to error Results — handlers never throw to callers.

## Result Envelope

Every call returns `{ status, result, errors, meta }`. Meta includes path, timestamp, duration_ms. This makes every response self-describing and debuggable.

## Why This Works

- No HTTP layer needed — tests call app.call() directly
- Uniform error handling without try/catch in callers
- Call metadata (timing, path) injected automatically
- Handler registration is explicit and centralized in index.ts
- Structured logging happens in one place (the framework), not in handlers
