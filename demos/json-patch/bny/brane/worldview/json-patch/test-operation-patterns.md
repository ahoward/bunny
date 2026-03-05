# Test Operation Patterns
The `test` op transforms JSON Patch from a blind mutation tool into a conditional update mechanism.

## Optimistic Concurrency

Prepend a `test` operation to assert the expected current value before mutating. If another writer changed the value, the test fails and the entire patch rolls back. This is optimistic locking without a lock.

```json
[
  {"op": "test", "path": "/version", "value": 3},
  {"op": "replace", "path": "/name", "value": "updated"},
  {"op": "replace", "path": "/version", "value": 4}
]
```

## Guard Clauses

Test that a field exists (or has a specific shape) before operating on dependent fields. Prevents nonsensical patches from applying to documents in unexpected states.

## Deep Equality

The RFC requires deep equality comparison for `test`. This means:
- Object key order doesn't matter
- Array order does matter
- `null` equals `null`
- No type coercion (`1` ≠ `"1"`)

## Open Question

Should `test` support partial matching or regex? The RFC says no — strict deep equality only. But real-world use cases often want "test that this field exists" without caring about the value. A common workaround: test against the known current value, which couples the patch to the document state.
