# JSON Patch Knowledge Base
RFC 6902 JSON Patch implementation in TypeScript — applying structured mutations to JSON documents.

## Core Concepts

- **[Overview](overview.md)** — Six operations (add, remove, replace, move, copy, test), atomic rollback, sequential application
- **[Pointer Edge Cases](pointer-edge-cases.md)** — `-` token, escape sequences (`~0`, `~1`), root targeting, numeric indices, no auto-creation

## Operations Deep Dive

- **[Move & Copy Semantics](move-copy-semantics.md)** — Move = atomic remove + add, prefix restriction, deep-clone requirement for copy
- **[Test Operation Patterns](test-operation-patterns.md)** — Optimistic concurrency, guard clauses, deep equality rules

## Architecture Decisions

- **[Error Model](error-model.md)** — Result envelopes over exceptions, strictness spectrum, validation phases
- **[Rollback Strategies](rollback-strategies.md)** — Deep clone vs. reverse patch vs. copy-on-write; deep clone chosen for POD-only
- **[Performance Considerations](performance-considerations.md)** — Pointer resolution, clone cost, optimization paths, benchmarking targets
- **[Implementation Patterns](implementation-patterns.md)** — Security guards, module decomposition, validation-first architecture

## Future

- **[Diff Generation](diff-generation.md)** — Generating patches from two documents; LCS-based array diffing, move detection
