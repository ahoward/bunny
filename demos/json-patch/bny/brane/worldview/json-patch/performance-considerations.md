# Performance Considerations
JSON Patch performance matters most at scale — large documents, long patch sequences, or high-frequency application.

## Hot Paths

1. **JSON Pointer resolution**: Every operation resolves a path. O(depth) per resolution. Caching resolved paths is unsafe because each operation mutates the document.
2. **Deep clone for atomicity**: O(n) where n = document size. Dominates cost for large documents with small patches.
3. **Deep equality for test**: O(n) where n = subtree size at test path.

## Optimization Opportunities

- **Lazy clone**: Only clone subtrees that are actually modified (copy-on-write without full immutable infrastructure)
- **Batch pointer parsing**: Parse all pointers upfront, validate syntax once
- **Fast-path single operations**: Skip clone overhead when patch has exactly one operation (failure = no partial state)
- **Typed arrays / binary paths**: For extreme performance, avoid string splitting on every pointer resolution

## Benchmarking Targets

- 1K-element array, single add → should be < 1ms
- 10K-key object, 100-operation patch → should be < 10ms
- 1MB document, single replace → clone cost dominates
