# Error Model
Result envelopes with operation index tracking provide structured, exception-free error handling.

## Design Choice: Result Envelopes

The implementation uses `Result<T> = OkResult<T> | ErrResult` where:
- `OkResult<T>` = `{ ok: true, value: T }`
- `ErrResult` = `{ ok: false, message: string, index: number }`

No exceptions are thrown for RFC-defined failure conditions. This matches the POD-only constraint.

## Index Semantics

- `index` = the 0-based position of the failing operation in the patch array
- `index = -1` for structural errors (validation failures, pointer parse errors) that aren't tied to a specific operation during execution
- During `apply()`, pointer parse errors get re-mapped to the current operation index

## Two-Phase Error Detection

1. **Validation phase** (`validate()`): Catches structural problems — missing `op`, unknown operations, missing `path`/`value`/`from`, invalid pointer syntax. Runs before any mutations.
2. **Execution phase** (`apply()` loop): Catches semantic problems — target doesn't exist, index out of bounds, test mismatch, move prefix violation.

This two-phase approach rejects malformed patches cheaply before cloning the document.

## RFC-Defined Failures

- Target location does not exist (for remove, replace, test)
- Target location's parent does not exist (for add)
- Array index out of bounds
- Move into own subtree
- Test value mismatch
- Invalid JSON Pointer syntax
- Unknown operation type

## Strictness

The implementation ignores unknown fields in operation objects (per RFC recommendation) by using `[key: string]: unknown` index signatures on operation types. This provides forward-compatibility.
