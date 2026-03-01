# POD Types Convention

Plain Old Data — no classes, no methods on data objects.

## Rules

- Define types with `type` keyword, not `interface` or `class`
- Data flows as plain objects through function parameters and return values
- Behavior lives in standalone functions that accept POD, not methods on objects
- Use `null` for explicit absence, never `undefined`
- Optional fields use `field?: type | null` but stored values are always `null` not `undefined`

## Key Types for APIs

- **Result<T>**: `{status: "success", data: T} | {status: "error", error: {message: string}}`
- **Entity types**: Include `id` (uuid string), `timestamp` (ISO 8601 string)
- Generate IDs with `crypto.randomUUID()` at creation time
- Generate timestamps with `new Date().toISOString()` at creation time

## Why

- POD serializes cleanly to/from JSON with no surprises
- No prototype chain issues, no hidden state
- Easy to test — construct literals, compare with deep equality
- Three similar lines of POD manipulation beats a premature abstraction
