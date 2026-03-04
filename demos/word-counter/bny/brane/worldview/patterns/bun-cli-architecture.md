# Bun CLI Architecture
A three-layer pattern for building CLI tools with Bun and TypeScript.

## The Pattern

```
bin/wc.ts          → thin entry point (import + call)
src/cli.ts         → argument parsing, file I/O, output formatting
src/lib/counter.ts → pure functions (no I/O, no side effects)
src/lib/types.ts   → POD type definitions
```

## Why Three Layers

1. **Pure functions** are trivially testable — no mocks, no setup
2. **CLI layer** handles all I/O concerns — testable via subprocess spawning
3. **Entry point** is a one-liner — nothing to test

## Key Decisions Made

- **Characters = UTF-8 code points**, not bytes — breaks from `wc -c` but is what users expect
- **Words = whitespace-split sequences** — POSIX behavior, simple and predictable
- **Lines = newline count** — matches `wc` convention (no trailing newline = no final line)
- **Output order**: lines, words, chars, filename — matches `wc` convention for muscle memory
- **JSON output via `--json` flag** — structured output without breaking default columnar format
- **Selective flags** (`--words`, `--lines`, `--chars`) — filter output without changing semantics

## Testing Strategy

- **Unit tests** for pure counting functions (fast, deterministic)
- **Integration tests** for CLI via `Bun.spawn` (tests real argument parsing and output)
- Tests written before implementation, locked after review
