# Tasks: 001-typescript-library-implementing

# Task List: RFC 6902 JSON Patch Library

## Phase 0: Setup

- [x] T001 Create `package.json` with name `json-patch`, type `module`, no runtime deps, dev deps `typescript` and `@types/bun` — `package.json`
- [x] T002 Create `tsconfig.json` with strict mode, ES2022 target, ESM module, declaration output — `tsconfig.json`
- [x] T003 Create empty barrel export file — `src/index.ts`
- [x] T004 Run `bun install` and verify `bun test` exits clean

**Checkpoint: Project compiles, `bun test` runs with 0 tests.**

---

## Phase 1: Foundational — Types & Utilities

- [x] T005 Define `JsonValue`, all `Operation` union members, `Patch`, `Result<T>`, `OkResult<T>`, `ErrResult` types — `src/types.ts`
- [x] T006 [P] Implement `parse_pointer(pointer: string): Result<string[]>` with `~1`→`/` then `~0`→`~` decoding, empty-string handling, leading-slash validation — `src/pointer.ts` [US11]
- [x] T007 [P] Implement `resolve(doc, segments): Result<JsonValue>` — walk document by segments, validate numeric array indices, reject leading zeros — `src/pointer.ts` [US11]
- [x] T008 [P] Implement `resolve_parent(doc, segments): Result<{parent, key}>` — resolve all-but-last segment, return parent container and final key — `src/pointer.ts` [US11]
- [x] T009 [P] Implement `deep_clone(value: JsonValue): JsonValue` using `structuredClone` — `src/deep_clone.ts` [US7]
- [x] T010 [P] Implement `deep_equal(a: JsonValue, b: JsonValue): boolean` — type-strict, key-order-independent objects, order-dependent arrays, recursive — `src/deep_equal.ts` [US6]

**Checkpoint: `parse_pointer`, `resolve`, `resolve_parent`, `deep_clone`, `deep_equal` all implemented. Pointer tests pass.**

---

## Phase 2: Foundational — Validation

- [x] T011 Implement `validate(patch: unknown): Result<Patch>` — check array, require `op` string, whitelist ops, require `path` string, require `value` for add/replace/test, require `from` for move/copy, validate pointer syntax on all path/from fields — `src/validate.ts` [US10]

**Checkpoint: Malformed patches rejected before any operations apply. Validation tests pass.**

---

## Phase 3: User Stories P1 — Core Operations

- [x] T012 Implement `op_add(doc, path, value): Result<JsonValue>` — root replacement on empty path, array splice with index/`-` validation, object key set, reject leading zeros in array indices — `src/ops.ts` [US1]
- [x] T013 Implement `op_remove(doc, path, op_index): Result<JsonValue>` — reject empty path and `-` token, validate target exists, array splice, object delete — `src/ops.ts` [US2]
- [x] T014 Implement `op_replace(doc, path, value, op_index): Result<JsonValue>` — root replacement on empty path, reject `-` token, require target exists, then set — `src/ops.ts` [US3]
- [x] T015 Implement `op_move(doc, from, path, op_index): Result<JsonValue>` — reject `from` as proper prefix of `path`, no-op when `from === path`, remove then add — `src/ops.ts` [US4]
- [x] T016 Implement `op_copy(doc, from, path, op_index): Result<JsonValue>` — resolve `from`, deep clone value, add at `path` — `src/ops.ts` [US5]
- [x] T017 Implement `op_test(doc, path, value, op_index): Result<JsonValue>` — reject `-` token, resolve path, deep equal comparison, return doc on match or error on mismatch — `src/ops.ts` [US6]

**Checkpoint: All six operation functions implemented. Individual operation tests pass.**

---

## Phase 4: User Stories P1 — Orchestration & Atomicity

- [x] T018 Implement `apply(document: JsonValue, patch: unknown): Result<JsonValue>` — validate patch, deep clone document, iterate operations sequentially dispatching to op functions, return `OkResult` on success or `ErrResult` with failing index on failure — `src/apply.ts` [US7] [US8] [US9]
- [x] T019 Wire up public API re-exports: `apply`, `validate`, and all types from `src/index.ts` — `src/index.ts`

**Checkpoint: `apply` returns Result envelopes, atomic rollback works, sequential composition works. Rollback, sequential, and result tests pass.**

---

## Phase 5: Polish — Edge Cases & Full Coverage

- [x] T020 Verify `-` token rejection in `op_remove`, `op_replace`, `op_test` and add explicit error messages referencing the RFC — `src/ops.ts` [US2] [US3] [US6]
- [x] T021 Verify array index out-of-bounds errors in `op_add` (> length) and `op_remove`/`op_replace` (≥ length) produce clear error messages — `src/ops.ts`
- [x] T022 Verify missing intermediate path errors (no auto-creation) in `resolve_parent` — `src/pointer.ts`
- [x] T023 Verify all JSON value types work as operands (null, boolean, nested arrays, primitives as root) — `src/ops.ts` [US12]
- [x] T024 Run full test suite (`bun test`), fix any remaining failures
- [x] T025 Run `./dev/post_flight` and confirm clean
- [x] T026 Append decision to `bny/decisions.md`

**Checkpoint: All US-001–US-012 scenarios pass. All EC-001–EC-027 edge cases pass. Post-flight clean.**
