# Move and Copy Semantics
Move and copy are composite operations with subtle ordering, index shifting, and validation requirements.

## Move = Remove + Add (But Atomic)

`move` removes the value at `from` and adds it at `path`. Implementation order:
1. Check prefix restriction (before any mutation)
2. Check same-location no-op (verify source exists, then return unchanged)
3. Resolve source value (capture before removal)
4. Remove at `from`
5. Add captured value at `path`

The value must be captured before removal because removal mutates the document and may shift array indices.

### Array Index Shifting Example

```json
{"op": "move", "from": "/a/0", "path": "/a/1"}
```

In array `[1, 2, 3]`: remove index 0 → `[2, 3]`, then add at index 1 → `[2, 1, 3]`.

## Move Prefix Restriction

A move operation MUST NOT move a value into one of its own children. Moving `/a/b` to `/a/b/c/d` is illegal. The check: if `from` segments are a proper prefix of `path` segments (fewer segments, and all matching), reject. This must happen before any mutation to avoid a corrupted intermediate state.

## Same-Location Move

When `from` equals `path` (same segments), the move is a no-op — but the implementation still verifies the source exists via `resolve()`. This ensures error behavior is consistent (moving a nonexistent value to itself still fails).

## Copy Semantics

`copy` reads from `from`, deep-clones the value, then adds at `path`. The deep clone (`structuredClone`) prevents the shared-reference trap where mutations to the copy affect the original.

## From vs Path

Only `move` and `copy` use `from`. Validation enforces this — `from` is required for move/copy and ignored on other operations (unknown fields pass through).
