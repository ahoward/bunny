# JSON Patch Knowledge Base

RFC 6902 JSON Patch implementation in TypeScript — zero dependencies, atomic rollback, result envelopes.

## Core Concepts

- **[Overview](overview.md)** — Six operations (`add`, `remove`, `replace`, `move`, `copy`, `test`), sequential application, public API (`apply`, `validate`)
- **[Pointer Edge Cases](pointer-edge-cases.md)** — `-` token, `~0`/`~1` escape ordering, root targeting, numeric index rules, prototype pollution guard

## Operations

- **[Move & Copy Semantics](move-copy-semantics.md)** — Move = capture → remove → add; prefix restriction; deep-clone for copy; array index shifting
- **[Test Operation Patterns](test-operation-patterns.md)** — Optimistic concurrency, guard clauses, deep equality (order-independent objects, order-dependent arrays)

## Architecture

- **[Error Model](error-model.md)** — `Result<T>` envelopes, operation index tracking, two-phase validation (structural then semantic)
- **[Rollback Strategies](rollback-strategies.md)** — `structuredClone` before apply; alternatives considered (reverse patch, copy-on-write)
- **[Implementation Patterns](implementation-patterns.md)** — 8-file module chain, root replacement pattern, resolve-parent pattern, validate-before-mutate
- **[Performance Considerations](performance-considerations.md)** — Hot paths (pointer resolution, clone cost, deep equality), optimization opportunities, benchmarking targets

## Future

- **[Diff Generation](diff-generation.md)** — Generating patches from two documents; naive replace, LCS array diffing, move detection heuristics
