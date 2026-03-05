# Implementation Patterns
Key architectural patterns that emerged from building the RFC 6902 library.

## Module Decomposition

Eight files, clear dependency chain:
- `types.ts` — pure type definitions, no logic
- `pointer.ts` — RFC 6901 parsing and resolution (parse, resolve, resolve_parent)
- `deep_clone.ts` / `deep_equal.ts` — single-purpose utilities
- `validate.ts` — structural validation before execution
- `ops.ts` — six operation functions, all pure mutations on pre-cloned data
- `apply.ts` — orchestrator: validate → clone → loop → return
- `index.ts` — barrel re-export of public API

The dependency flows one direction: `apply` → `ops` → `pointer` + `deep_*` → `types`.

## Root Replacement Pattern

Every operation function returns `Result<JsonValue>` where the value is the document root. Most operations mutate in-place and return the same root reference. But `add` and `replace` at the empty path return a completely new root. The `apply()` loop must update its working `doc` variable after every operation: `doc = result.value`. This is easy to forget and causes silent bugs if missed.

## Resolve-Parent Pattern

Most operations need the parent container and the final key, not the target value itself. `resolve_parent(doc, segments)` resolves all-but-last segments and returns `{ parent, key }`. This avoids duplicating traversal logic across operations. Only `test` and `copy` (reading, not writing) use `resolve()` directly.

## Move Decomposition

`op_move` decomposes into `resolve` (capture value) → `op_remove` → `op_add`. The value must be captured *before* removal because removal mutates the document. The prefix check (`from` is not a proper prefix of `path`) must happen *before* any mutation.

## Validate-Before-Mutate

The `validate()` function runs as the first step of `apply()`. It checks structural correctness (required fields, valid ops, pointer syntax) without touching the document. This means malformed patches are rejected before the expensive deep clone. Within `validate()`, pointer syntax is checked via `parse_pointer()` on both `path` and `from` fields.

## Security: Prototype Pollution Guard

Pointer parsing rejects segments matching `__proto__`, `constructor`, or `prototype`. This prevents prototype pollution attacks when setting object properties from parsed pointers. The check lives in `parse_pointer()` so it applies universally — both during validation and execution.

## Unknown Fields Pass Through

Operation types use `[key: string]: unknown` index signatures, and validation only checks required fields. Unknown fields on operation objects are silently ignored per RFC recommendation. This provides forward-compatibility for RFC extensions.
