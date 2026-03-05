# RFC 6902 JSON Patch
A zero-dependency TypeScript library for applying structured mutations to JSON documents with atomic rollback.

## Core Concept

JSON Patch (RFC 6902) defines a JSON document structure for expressing a sequence of operations to apply to a target JSON document. The patch itself is a JSON array of operation objects.

## Operations

| Operation | Description | Required Fields |
|-----------|-------------|----------------|
| `add` | Insert a value at a target location | `path`, `value` |
| `remove` | Remove the value at a target location | `path` |
| `replace` | Replace the value at a target location | `path`, `value` |
| `move` | Remove from one location, add to another | `from`, `path` |
| `copy` | Copy from one location to another | `from`, `path` |
| `test` | Assert a value exists at a target location | `path`, `value` |

## Key Design Properties

- **Atomic rollback on failure** — if any operation fails, the original document is returned unchanged (achieved via deep clone before apply)
- **Sequential application** — operations are applied in order; each sees the result of the previous
- **Declarative mutations** — patches are data (POD), not code
- **Validate-before-mutate** — structural validation runs before cloning or applying
- **Result envelopes** — all errors returned as `{ ok: false, message, index }`, never thrown

## Public API

```typescript
apply(document: JsonValue, patch: unknown): Result<JsonValue>
validate(patch: unknown): Result<Patch>
```

`apply` accepts `unknown` for the patch and validates internally. This makes the boundary safe — callers don't need to pre-validate.

## Architecture

```
apply() → validate() → deep_clone() → loop: parse_pointer() → op_*() → Result
```

Eight source files, zero runtime dependencies, ~180 lines of implementation.
