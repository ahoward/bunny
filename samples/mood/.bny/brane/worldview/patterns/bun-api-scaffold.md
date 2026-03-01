# Bun API Scaffold Pattern

A minimal, repeatable structure for JSON APIs on Bun.

## Handler Registry (app.call)

- Single `app.ts` exports `register(path, handler)` and `call(path, params)`
- Handlers are pure functions: `(params: Record<string, unknown>) => Promise<Result>`
- Registration happens in `index.ts` — one import per handler, explicit wiring
- `server.ts` is a thin HTTP skin: parse request, route to `app.call`, serialize response
- This separation means handlers are testable without HTTP — call `app.call` directly in tests

## Result Envelope

- Every handler returns `{status: "success", data}` or `{status: "error", error: {message}}`
- `result.ts` provides `ok(data)` and `err(message)` helpers
- HTTP status codes derive from result status (200 for success, 400/500 for error)
- Clients always get a predictable shape — no raw strings or bare objects

## Filesystem JSON Store

- `store.ts` wraps read/write of a single JSON file (e.g., `data/moods.json`)
- Auto-creates data directory on first write
- Acceptable for prototypes; last-write-wins on concurrent access
- Store functions are pure read/write — no business logic inside

## Guard-Early Validation

- Validate at the top of each handler, return `err()` immediately on bad input
- Check type, range, and presence before any side effects
- Integer validation: reject floats via `Math.floor(n) !== n`
- Keep validation inline in the handler — no validation framework for simple cases

## Test Structure

- One test file per handler in `tests/handlers/`
- Tests call `app.call()` directly (no HTTP layer)
- `invariants.test.ts` covers structural properties (all paths registered, result shapes)
- Clean state before each test (reset or recreate the data file)
