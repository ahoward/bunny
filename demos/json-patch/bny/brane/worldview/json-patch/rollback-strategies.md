# Rollback Strategies
Deep clone before apply was chosen for atomicity — simplest correct approach for POD-only data.

## Strategy Chosen: Deep Clone Before Apply

The implementation clones the entire document via `structuredClone()` before applying any operations. On failure, the clone is simply discarded — the original document reference was never touched.

**Why `structuredClone`**: Available natively in Bun (and modern Node/browsers). Handles all JSON value types correctly. One-liner implementation. For POD-only JSON data, it's the optimal built-in choice.

**Tradeoff accepted**: O(n) memory for every patch, even single-op patches on large documents. This is acceptable for correctness-first design. Optimization (lazy clone, single-op fast path) deferred to when benchmarks demand it.

## Alternatives Considered

### Reverse Patch Generation
Generate inverse operations as you go; on failure, apply them in reverse. O(k) memory but complex to implement correctly (especially for move operations that shift array indices). Risk of double-failure leaving inconsistent state.

### Structural Sharing / Copy-on-Write
Use immutable data structures. Rollback is free. But requires immutable infrastructure (Immer, persistent data structures) which conflicts with POD-only constraint and adds dependencies.

## Implementation Detail

Operations mutate the cloned document in-place and return `Result<JsonValue>` where the value is the (possibly new) root. The root can change when `add` or `replace` targets the empty path — in that case the operation returns the new value as the root, and `apply()` updates its working reference.
