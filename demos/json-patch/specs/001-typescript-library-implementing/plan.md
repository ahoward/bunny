# Implementation Plan: 001-typescript-library-implementing

**Date**: 2026-03-05
**Spec**: specs/001-typescript-library-implementing/spec.md

# Implementation Plan: RFC 6902 JSON Patch Library

## 1. Summary

Implement a zero-dependency TypeScript library that applies RFC 6902 JSON Patch operations to JSON documents. The library exposes a single `apply(document, patch)` function returning a `Result` envelope. Atomicity is achieved via deep clone before application. All six operations (`add`, `remove`, `replace`, `move`, `copy`, `test`) are implemented atop a shared JSON Pointer (RFC 6901) resolver. POD-only data flow — no classes, no thrown exceptions for expected failures.

## 2. Technical Context

| Aspect | Choice |
|--------|--------|
| Language | TypeScript (strict mode) |
| Runtime | Bun |
| Testing | `bun test` (built-in, Jest-compatible) |
| Dependencies | Zero runtime dependencies |
| Dev dependencies | `typescript`, `@types/bun` |
| Module format | ESM |
| Target | ES2022 |
| Constraints | Max 20 files, max 500 lines changed, zero new runtime deps (per `bny/guardrails.json`) |

## 3. Project Structure

json-patch/
├── src/
│   ├── types.ts            # JsonValue, Operation, Patch, Result types
│   ├── pointer.ts          # RFC 6901 JSON Pointer: parse, resolve, resolve_parent
│   ├── validate.ts         # Pre-flight patch validation (structure only)
│   ├── ops.ts              # Operation executors: op_add, op_remove, op_replace, op_move, op_copy, op_test
│   ├── apply.ts            # apply(document, patch) → Result<JsonValue>
│   ├── deep_equal.ts       # Deep equality for test operation
│   ├── deep_clone.ts       # structuredClone wrapper / manual clone
│   └── index.ts            # Public API re-exports
├── tests/
│   ├── pointer.test.ts     # US-011, EC-001–010, EC-024
│   ├── add.test.ts         # US-001, EC-006, EC-008, EC-023, EC-027
│   ├── remove.test.ts      # US-002, EC-001, EC-007, EC-026
│   ├── replace.test.ts     # US-003, EC-002, EC-025
│   ├── move.test.ts        # US-004, EC-011–014
│   ├── copy.test.ts        # US-005, EC-013
│   ├── test_op.test.ts     # US-006, EC-003, EC-015–019
│   ├── rollback.test.ts    # US-007
│   ├── sequential.test.ts  # US-008
│   ├── validate.test.ts    # US-010
│   ├── result.test.ts      # US-009
│   ├── values.test.ts      # US-012, EC-020–021
│   └── edge_cases.test.ts  # EC-004, EC-005, EC-009, EC-022
├── package.json
├── tsconfig.json
└── bunfig.toml


**File count: 18** (within 20-file guardrail)

## 4. Implementation Phases

### Phase 0: Project Scaffolding

**Deliverable:** Project compiles, `bun test` runs (0 tests).

- Create `package.json` with `name: "json-patch"`, `type: "module"`, no runtime deps, dev deps: `typescript`, `@types/bun`
- Create `tsconfig.json` — strict mode, ES2022 target, ESM, `src/` root, declaration output
- Create `bunfig.toml` if needed for test config
- Create `src/index.ts` as empty barrel export
- Run `bun install` → verify `bun test` exits clean

### Phase 1: Types & Utilities

**Deliverable:** Core types defined, pointer resolution works, deep clone/equality work.

**1a. `src/types.ts`** — Type definitions (no logic)

typescript
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type AddOperation      = { op: "add";     path: string; value: JsonValue; [key: string]: unknown };
export type RemoveOperation   = { op: "remove";  path: string; [key: string]: unknown };
export type ReplaceOperation  = { op: "replace"; path: string; value: JsonValue; [key: string]: unknown };
export type MoveOperation     = { op: "move";    from: string; path: string; [key: string]: unknown };
export type CopyOperation     = { op: "copy";    from: string; path: string; [key: string]: unknown };
export type TestOperation     = { op: "test";    path: string; value: JsonValue; [key: string]: unknown };

export type Operation = AddOperation | RemoveOperation | ReplaceOperation | MoveOperation | CopyOperation | TestOperation;
export type Patch = Operation[];

export type OkResult<T> = { ok: true;  value: T };
export type ErrResult   = { ok: false; message: string; index: number };
export type Result<T> = OkResult<T> | ErrResult;


Note: `[key: string]: unknown` on each operation type allows unknown fields to pass through (FR-020).

**1b. `src/pointer.ts`** — RFC 6901 JSON Pointer

typescript
export function parse_pointer(pointer: string): Result<string[]>
// "" → []
// "/a/b" → ["a", "b"]
// Decode ~1 → /, ~0 → ~ (order: replace ~1 first, then ~0)
// Reject pointers not starting with "/" (unless empty string)

export function resolve(doc: JsonValue, segments: string[]): Result<JsonValue>
// Walk the document by segments, return the value or error
// Validate: numeric indices for arrays, no leading zeros, in-bounds

export function resolve_parent(doc: JsonValue, segments: string[]): Result<{ parent: JsonValue; key: string }>
// Resolve all but last segment, return parent container + final key
// Used by add/remove/replace to locate the insertion point


**1c. `src/deep_clone.ts`**

typescript
export function deep_clone(value: JsonValue): JsonValue
// Use structuredClone (available in Bun) for POD JSON values


**1d. `src/deep_equal.ts`**

typescript
export function deep_equal(a: JsonValue, b: JsonValue): boolean
// Recursive comparison: type-strict, key-order-independent objects, order-dependent arrays


### Phase 2: Validation

**Deliverable:** `validate(patch)` catches structural errors before application.

**`src/validate.ts`**

typescript
export function validate(patch: unknown): Result<Patch>
// 1. patch must be an array
// 2. Each element must have string `op` field
// 3. `op` must be one of: add, remove, replace, move, copy, test
// 4. All ops must have string `path`
// 5. add, replace, test must have `value` (not undefined)
// 6. move, copy must have string `from`
// 7. Validate pointer syntax on all `path` and `from` fields
// Returns typed Patch on success, ErrResult on failure (index = first bad op)


### Phase 3: Operations

**Deliverable:** Each operation implemented as a pure function mutating the document in-place.

**`src/ops.ts`**

All operation functions mutate the (already-cloned) document and return `Result<JsonValue>` where the value is the new root (needed for root-replacement cases).

typescript
export function op_add(doc: JsonValue, path: string[], value: JsonValue): Result<JsonValue>
// - Empty path → replace root, return new value
// - Array parent: validate index (numeric, no leading zeros, 0..length, or "-" → length)
//   splice(index, 0, value)
// - Object parent: set key
// - "-" only valid here (for arrays)

export function op_remove(doc: JsonValue, path: string[], op_index: number): Result<JsonValue>
// - Empty path → error (cannot remove root? RFC is ambiguous — we'll error)
// - Reject "-" token
// - Array: validate index, splice(index, 1)
// - Object: delete key
// - Error if target doesn't exist

export function op_replace(doc: JsonValue, path: string[], value: JsonValue, op_index: number): Result<JsonValue>
// - Empty path → replace root
// - Reject "-" token
// - Target must exist, then set value

export function op_move(doc: JsonValue, from: string[], path: string[], op_index: number): Result<JsonValue>
// - Check from is not a proper prefix of path (EC-011)
// - If from === path → no-op (EC-012)
// - Remove value at `from`, then add value at `path`

export function op_copy(doc: JsonValue, from: string[], path: string[], op_index: number): Result<JsonValue>
// - Resolve `from`, deep_clone the value, then add at `path`

export function op_test(doc: JsonValue, path: string[], value: JsonValue, op_index: number): Result<JsonValue>
// - Reject "-" token
// - Resolve path, deep_equal against value
// - Return doc unchanged on success, error on mismatch


### Phase 4: Apply (Orchestrator)

**Deliverable:** The main `apply` function — validate, clone, execute sequentially, return result.

**`src/apply.ts`**

typescript
export function apply(document: JsonValue, patch: unknown): Result<JsonValue>
// 1. validate(patch) → if error, return it
// 2. deep_clone(document) → working copy
// 3. For each operation (index i):
//    a. Parse path (and from if applicable)
//    b. Dispatch to op_add/op_remove/op_replace/op_move/op_copy/op_test
//    c. If error, return ErrResult with index i and message
//    d. Update working doc to operation's return value (handles root replacement)
// 4. Return OkResult with final document


**`src/index.ts`** — Public API

typescript
export { apply } from "./apply.ts";
export type { JsonValue, Operation, Patch, Result, OkResult, ErrResult } from "./types.ts";
export { validate } from "./validate.ts";


### Phase 5: Tests

**Deliverable:** All user scenarios (US-001–US-012) and edge cases (EC-001–EC-027) covered.

Tests are written by the antagonist agent per project protocol. The test files map to the spec:

| Test File | Covers |
|-----------|--------|
| `tests/pointer.test.ts` | US-011 (escaping), EC-001–010 (pointer edge cases), EC-024 |
| `tests/add.test.ts` | US-001 (all 6 scenarios), EC-006, EC-008, EC-023, EC-027 |
| `tests/remove.test.ts` | US-002 (all 3 scenarios), EC-001, EC-007, EC-026 |
| `tests/replace.test.ts` | US-003 (all 3 scenarios), EC-002, EC-025 |
| `tests/move.test.ts` | US-004 (all 3 scenarios), EC-011–014 |
| `tests/copy.test.ts` | US-005 (all 2 scenarios), EC-013 |
| `tests/test_op.test.ts` | US-006 (all 4 scenarios), EC-003, EC-015–019 |
| `tests/rollback.test.ts` | US-007 (all 2 scenarios) |
| `tests/sequential.test.ts` | US-008 (all 2 scenarios) |
| `tests/validate.test.ts` | US-010 (all 4 scenarios) |
| `tests/result.test.ts` | US-009 (all 2 scenarios) |
| `tests/values.test.ts` | US-012 (all 4 scenarios), EC-020–021 |
| `tests/edge_cases.test.ts` | EC-004, EC-005, EC-009, EC-022 |

## 5. Dependencies & Execution Order

Phase 0: Scaffolding
   │
   ▼
Phase 1a: types.ts ─────────────────────────┐
   │                                         │
   ├──▶ Phase 1b: pointer.ts (depends on types) ──┐
   │                                               │
   ├──▶ Phase 1c: deep_clone.ts (depends on types) ── parallel
   │                                               │
   ├──▶ Phase 1d: deep_equal.ts (depends on types) ──┘
   │                                         │
   ▼                                         ▼
Phase 2: validate.ts (depends on types, pointer)
   │
   ▼
Phase 3: ops.ts (depends on types, pointer, deep_clone, deep_equal)
   │
   ▼
Phase 4: apply.ts + index.ts (depends on all above)
   │
   ▼
Phase 5: Tests (written by antagonist agent, run against implementation)


**Parallel opportunities:**
- Phase 1b, 1c, 1d can all be implemented in parallel (only depend on 1a)
- All test files can be written in parallel (they only import from `src/index.ts`)
- Within Phase 3, `op_add` and `op_test` can be implemented first (others build on `op_add` patterns; `op_move` calls `op_remove` + `op_add` internally)

**Critical path:** `types.ts` → `pointer.ts` → `ops.ts` → `apply.ts` → green tests

**Estimated file/line budget:** ~14 source + test files, ~400–450 lines of implementation code — within the 500-line guardrail.
