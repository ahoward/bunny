# Result Envelope Pattern

Every handler returns a uniform `Result<T>` envelope. Errors are data, never exceptions.

## Shape

```typescript
interface Result<T = unknown> {
  status:  "success" | "error"
  result:  T | null          // null on error
  errors:  ErrorMap | null   // null on success
  meta:    Meta              // path, timestamp, duration_ms
}
```

## Key Principles

- **Discriminated union on `status`**: enables type-safe branching
- **Hierarchical errors**: keyed by field/subsystem (`{ file_path: [...], api: [...] }`), allows multiple errors per field
- **null semantics**: explicit absence — never undefined
- **Generic payload**: `Result<T>` lets handlers declare their output type
- **Metadata always present**: path, timestamp, duration_ms on every response

## Factory Helpers

```typescript
success<T>(result: T, meta?)   // { status: "success", result, errors: null }
error(errors: ErrorMap, meta?) // { status: "error", result: null, errors }
required(field)                // { code: "required", message: "${field} is required" }
invalid(field, reason)         // { code: "invalid", message: "${field} ${reason}" }
```

## Why This Over Exceptions

- Composable: callers branch on data, not try/catch
- Serializable: Result is POD, trivially JSON-encodable
- Uniform: every handler, every path, same shape — enables framework-level invariant tests
- Transparent: meta.duration_ms gives observability for free
