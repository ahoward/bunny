# Feature Specification: a TypeScript library implementing RFC 6902 JSON Patch — apply a sequence of add, remove, replace, move, copy, and test operations to a JSON document with atomic rollback on failure

**Feature Branch**: `001-typescript-library-implementing`
**Created**: 2026-03-05
**Status**: Draft

# Feature Specification: RFC 6902 JSON Patch

**Feature branch:** `001-typescript-library-implementing`
**Date:** 2026-03-05

---

## 1. User Scenarios & Testing

### P1 — Core Operations

#### US-001: Apply `add` operation to an object

**As a** developer applying patches to JSON documents,
**I want to** add a new key-value pair to an object,
**So that** I can insert data at a precise location.

**Scenario: Add a new field to a top-level object**
- Given a document `{"name": "Alice"}`
- When I apply `[{"op": "add", "path": "/age", "value": 30}]`
- Then the result is `{"name": "Alice", "age": 30}`

**Scenario: Add a nested field to an existing parent**
- Given a document `{"a": {"b": 1}}`
- When I apply `[{"op": "add", "path": "/a/c", "value": 2}]`
- Then the result is `{"a": {"b": 1, "c": 2}}`

**Scenario: Add replaces an existing field**
- Given a document `{"name": "Alice"}`
- When I apply `[{"op": "add", "path": "/name", "value": "Bob"}]`
- Then the result is `{"name": "Bob"}`

**Scenario: Add to an array by index**
- Given a document `{"list": [1, 2, 3]}`
- When I apply `[{"op": "add", "path": "/list/1", "value": 99}]`
- Then the result is `{"list": [1, 99, 2, 3]}`

**Scenario: Add to end of array using `-` token**
- Given a document `{"list": [1, 2]}`
- When I apply `[{"op": "add", "path": "/list/-", "value": 3}]`
- Then the result is `{"list": [1, 2, 3]}`

**Scenario: Add replaces the entire document at root**
- Given a document `{"old": true}`
- When I apply `[{"op": "add", "path": "", "value": {"new": true}}]`
- Then the result is `{"new": true}`

---

#### US-002: Apply `remove` operation

**As a** developer,
**I want to** remove a value at a target location,
**So that** I can delete fields or array elements precisely.

**Scenario: Remove a field from an object**
- Given a document `{"a": 1, "b": 2}`
- When I apply `[{"op": "remove", "path": "/b"}]`
- Then the result is `{"a": 1}`

**Scenario: Remove an element from an array**
- Given a document `{"list": [1, 2, 3]}`
- When I apply `[{"op": "remove", "path": "/list/1"}]`
- Then the result is `{"list": [1, 3]}`

**Scenario: Remove a deeply nested field**
- Given a document `{"a": {"b": {"c": 3}}}`
- When I apply `[{"op": "remove", "path": "/a/b/c"}]`
- Then the result is `{"a": {"b": {}}}`

---

#### US-003: Apply `replace` operation

**As a** developer,
**I want to** replace a value at an existing location,
**So that** I can update data without adding or removing keys.

**Scenario: Replace a top-level field**
- Given a document `{"name": "Alice"}`
- When I apply `[{"op": "replace", "path": "/name", "value": "Bob"}]`
- Then the result is `{"name": "Bob"}`

**Scenario: Replace an array element**
- Given a document `{"list": [1, 2, 3]}`
- When I apply `[{"op": "replace", "path": "/list/0", "value": 99}]`
- Then the result is `{"list": [99, 2, 3]}`

**Scenario: Replace the root document**
- Given a document `[1, 2, 3]`
- When I apply `[{"op": "replace", "path": "", "value": {"replaced": true}}]`
- Then the result is `{"replaced": true}`

---

#### US-004: Apply `move` operation

**As a** developer,
**I want to** move a value from one location to another,
**So that** I can restructure documents in a single atomic step.

**Scenario: Move a field within an object**
- Given a document `{"a": 1, "b": {"c": 2}}`
- When I apply `[{"op": "move", "from": "/a", "path": "/b/d"}]`
- Then the result is `{"b": {"c": 2, "d": 1}}`

**Scenario: Move an array element (index shifting)**
- Given a document `{"a": [1, 2, 3]}`
- When I apply `[{"op": "move", "from": "/a/0", "path": "/a/1"}]`
- Then the result is `{"a": [2, 1, 3]}`

**Scenario: Move between unrelated paths**
- Given a document `{"source": "value", "target": {}}`
- When I apply `[{"op": "move", "from": "/source", "path": "/target/moved"}]`
- Then the result is `{"target": {"moved": "value"}}`

---

#### US-005: Apply `copy` operation

**As a** developer,
**I want to** copy a value from one location to another,
**So that** I can duplicate data without removing the original.

**Scenario: Copy a field**
- Given a document `{"a": 1}`
- When I apply `[{"op": "copy", "from": "/a", "path": "/b"}]`
- Then the result is `{"a": 1, "b": 1}`

**Scenario: Copy produces a deep clone**
- Given a document `{"a": {"nested": [1, 2]}}`
- When I apply `[{"op": "copy", "from": "/a", "path": "/b"}]`
- Then the result is `{"a": {"nested": [1, 2]}, "b": {"nested": [1, 2]}}`
- And mutating `/b/nested` in a subsequent patch does NOT affect `/a/nested`

---

#### US-006: Apply `test` operation

**As a** developer,
**I want to** assert a value at a location before mutating,
**So that** I can implement optimistic concurrency control.

**Scenario: Test passes, subsequent operations apply**
- Given a document `{"version": 3, "name": "old"}`
- When I apply `[{"op": "test", "path": "/version", "value": 3}, {"op": "replace", "path": "/name", "value": "new"}]`
- Then the result is `{"version": 3, "name": "new"}`

**Scenario: Test fails, entire patch rolls back**
- Given a document `{"version": 3, "name": "old"}`
- When I apply `[{"op": "test", "path": "/version", "value": 5}, {"op": "replace", "path": "/name", "value": "new"}]`
- Then the result is an error indicating test failure at operation index 0
- And the document is unchanged (`{"version": 3, "name": "old"}`)

**Scenario: Test uses deep equality**
- Given a document `{"data": {"b": 2, "a": 1}}`
- When I apply `[{"op": "test", "path": "/data", "value": {"a": 1, "b": 2}}]`
- Then the test passes (object key order is irrelevant)

**Scenario: Test rejects type coercion**
- Given a document `{"count": 1}`
- When I apply `[{"op": "test", "path": "/count", "value": "1"}]`
- Then the test fails (`1` ≠ `"1"`)

---

#### US-007: Atomic rollback on failure

**As a** developer,
**I want** the entire document to remain unchanged if any operation fails,
**So that** I never end up with a partially-applied patch.

**Scenario: Rollback after mid-sequence failure**
- Given a document `{"a": 1, "b": 2}`
- When I apply `[{"op": "replace", "path": "/a", "value": 99}, {"op": "remove", "path": "/nonexistent"}]`
- Then the result is an error indicating failure at operation index 1
- And the document is unchanged (`{"a": 1, "b": 2}`)

**Scenario: Rollback preserves original on multi-op failure**
- Given a document `{"items": [1, 2, 3]}`
- When I apply `[{"op": "add", "path": "/items/0", "value": 0}, {"op": "remove", "path": "/items/99"}]`
- Then the result is an error
- And the document is unchanged (`{"items": [1, 2, 3]}`)

---

### P1 — Sequential Application

#### US-008: Operations see results of previous operations

**As a** developer,
**I want** each operation to apply against the document as modified by prior operations,
**So that** patches compose correctly.

**Scenario: Second operation references result of first**
- Given a document `{}`
- When I apply `[{"op": "add", "path": "/a", "value": {}}, {"op": "add", "path": "/a/b", "value": 1}]`
- Then the result is `{"a": {"b": 1}}`

**Scenario: Remove then add at same path**
- Given a document `{"x": "old"}`
- When I apply `[{"op": "remove", "path": "/x"}, {"op": "add", "path": "/x", "value": "new"}]`
- Then the result is `{"x": "new"}`

---

### P2 — Result Envelope & Error Reporting

#### US-009: Structured error reporting

**As a** developer,
**I want** errors returned as Result envelopes (not thrown exceptions),
**So that** I can handle failures as data.

**Scenario: Successful patch returns ok result**
- Given a valid document and patch
- When I apply the patch
- Then the result has `ok: true` and `value` containing the patched document

**Scenario: Failed patch returns error result**
- Given a patch targeting a nonexistent path
- When I apply the patch
- Then the result has `ok: false`, an error `message`, and the `index` of the failing operation

---

#### US-010: Patch validation before application

**As a** developer,
**I want** patches validated for structural correctness before any operations apply,
**So that** malformed patches are rejected cheaply.

**Scenario: Missing `op` field rejected**
- Given a patch `[{"path": "/a", "value": 1}]`
- When I validate or apply
- Then the result is an error indicating missing `op`

**Scenario: Unknown operation rejected**
- Given a patch `[{"op": "merge", "path": "/a", "value": 1}]`
- When I validate or apply
- Then the result is an error indicating unknown operation `merge`

**Scenario: Missing `path` rejected**
- Given a patch `[{"op": "add", "value": 1}]`
- When I validate or apply
- Then the result is an error indicating missing `path`

**Scenario: Missing `from` on move/copy rejected**
- Given a patch `[{"op": "move", "path": "/a"}]`
- When I validate or apply
- Then the result is an error indicating missing `from`

---

### P2 — JSON Pointer Resolution

#### US-011: Correct pointer parsing

**As a** developer,
**I want** JSON Pointer (RFC 6901) correctly parsed,
**So that** paths with special characters resolve properly.

**Scenario: Escaped tilde**
- Given a document `{"a~b": 1}`
- When I apply `[{"op": "replace", "path": "/a~0b", "value": 2}]`
- Then the result is `{"a~b": 2}`

**Scenario: Escaped slash**
- Given a document `{"a/b": 1}`
- When I apply `[{"op": "replace", "path": "/a~1b", "value": 2}]`
- Then the result is `{"a/b": 2}`

**Scenario: Decode order matters**
- Given a document `{"~1": "found"}`
- When I apply `[{"op": "test", "path": "/~01", "value": "found"}]`
- Then the test passes (`~01` → `~1` as a literal key)

---

### P3 — Value Type Coverage

#### US-012: All JSON value types as operands

**As a** developer,
**I want** patches to work with all JSON value types,
**So that** I can patch any valid JSON document.

**Scenario: Add null value**
- Given a document `{}`
- When I apply `[{"op": "add", "path": "/x", "value": null}]`
- Then the result is `{"x": null}`

**Scenario: Replace with boolean**
- Given a document `{"flag": false}`
- When I apply `[{"op": "replace", "path": "/flag", "value": true}]`
- Then the result is `{"flag": true}`

**Scenario: Add nested array**
- Given a document `{}`
- When I apply `[{"op": "add", "path": "/matrix", "value": [[1,2],[3,4]]}]`
- Then the result is `{"matrix": [[1,2],[3,4]]}`

**Scenario: Test null equality**
- Given a document `{"x": null}`
- When I apply `[{"op": "test", "path": "/x", "value": null}]`
- Then the test passes

---

## 2. Edge Cases

### JSON Pointer Edge Cases

| ID | Condition | Expected Behavior |
|----|-----------|-------------------|
| EC-001 | `-` token used with `remove` | Error: `-` is only valid for `add` |
| EC-002 | `-` token used with `replace` | Error: `-` is only valid for `add` |
| EC-003 | `-` token used with `test` | Error: `-` is only valid for `add` |
| EC-004 | Leading zeros in array index (`/list/01`) | Error: invalid pointer syntax |
| EC-005 | Non-numeric token against array (`/list/abc`) | Error: invalid array index |
| EC-006 | Array index out of bounds for `add` (> length) | Error: index out of bounds |
| EC-007 | Array index out of bounds for `remove` (≥ length) | Error: index out of bounds |
| EC-008 | Empty string path targeting root document | Valid: targets entire document |
| EC-009 | Missing intermediate path (`/a/b/c` when `/a/b` doesn't exist) | Error: parent does not exist (no auto-creation) |
| EC-010 | Pointer with only escaped characters (`/~0~1`) | Valid: resolves to key `~/` |

### Move/Copy Edge Cases

| ID | Condition | Expected Behavior |
|----|-----------|-------------------|
| EC-011 | Move into own subtree (`/a/b` → `/a/b/c/d`) | Error: prefix restriction violation |
| EC-012 | Move to same location (`from` = `path`) | No-op (document unchanged, no error) |
| EC-013 | Copy of complex nested structure | Deep clone; no shared references |
| EC-014 | Move from array shifts indices before add | Correct index-shifted add |

### Test Operation Edge Cases

| ID | Condition | Expected Behavior |
|----|-----------|-------------------|
| EC-015 | Test array order `[1,2]` vs `[2,1]` | Fail: array order matters |
| EC-016 | Test object key order `{"a":1,"b":2}` vs `{"b":2,"a":1}` | Pass: key order irrelevant |
| EC-017 | Test `null` vs missing path | Fail: `null` value ≠ nonexistent path |
| EC-018 | Test `0` vs `false` | Fail: no type coercion |
| EC-019 | Test nested deep equality | Pass only if entire subtree is equal |

### General Edge Cases

| ID | Condition | Expected Behavior |
|----|-----------|-------------------|
| EC-020 | Empty patch array `[]` | Success: document returned unchanged |
| EC-021 | Patch against primitive root document (`42`, `"hello"`, `true`) | Valid: root can be any JSON value |
| EC-022 | Very large patch (1000+ operations) | Applies correctly; performance degrades linearly |
| EC-023 | `add` with `value` of `undefined` | Error: `undefined` is not valid JSON |
| EC-024 | Document with keys containing `/` and `~` | Accessible via `~1` and `~0` escaping |
| EC-025 | `replace` on nonexistent path | Error: target must exist |
| EC-026 | `remove` on nonexistent path | Error: target must exist |
| EC-027 | `add` to array at exactly `length` | Valid: appends to end (equivalent to `-`) |

---

## 3. Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | The library MUST implement all six RFC 6902 operations: `add`, `remove`, `replace`, `move`, `copy`, `test` | MUST |
| FR-002 | The library MUST resolve target locations using RFC 6901 JSON Pointer syntax | MUST |
| FR-003 | The library MUST apply operations sequentially — each operation sees the result of the previous | MUST |
| FR-004 | The library MUST provide atomic rollback — if any operation fails, the original document is returned unchanged | MUST |
| FR-005 | The `add` operation MUST insert into arrays at the specified index, shifting subsequent elements | MUST |
| FR-006 | The `add` operation MUST support the `-` token for appending to arrays | MUST |
| FR-007 | The `add` operation at an empty string path MUST replace the entire root document | MUST |
| FR-008 | The `remove` and `replace` operations MUST error if the target location does not exist | MUST |
| FR-009 | The `move` operation MUST behave as an atomic `remove` from `from` followed by `add` to `path` | MUST |
| FR-010 | The `move` operation MUST reject moves where `from` is a proper prefix of `path` (move into own subtree) | MUST |
| FR-011 | The `copy` operation MUST deep-clone the source value (no shared references) | MUST |
| FR-012 | The `test` operation MUST use deep equality comparison (key order irrelevant, array order significant, no type coercion) | MUST |
| FR-013 | The library MUST reject array indices with leading zeros | MUST |
| FR-014 | The library MUST correctly decode `~0` → `~` and `~1` → `/` in JSON Pointers, with `~0` decoded before `~1` | MUST |
| FR-015 | The library MUST NOT auto-create intermediate paths | MUST |
| FR-016 | The library MUST return results as Result envelopes (`{ok: true, value}` or `{ok: false, ...error}`) — no thrown exceptions for expected failures | MUST |
| FR-017 | Error results MUST include the index of the failing operation | MUST |
| FR-018 | Error results MUST include a human-readable error message | MUST |
| FR-019 | The library SHOULD validate patch structure (missing `op`, missing `path`, unknown `op`, missing `from` on move/copy) before applying any operations | SHOULD |
| FR-020 | The library SHOULD ignore unknown fields in operation objects (per RFC recommendation) | SHOULD |
| FR-021 | The library MUST accept any valid JSON value as the root document (objects, arrays, strings, numbers, booleans, null) | MUST |
| FR-022 | The `add` operation at an existing object key MUST replace the existing value | MUST |
| FR-023 | The library MUST use deep clone for atomicity (snapshot before apply, return snapshot on failure) | MUST |
| FR-024 | The `-` token MUST be rejected for `remove`, `replace`, and `test` operations | MUST |

---

## 4. Key Entities

### `JsonValue`
Any valid JSON value: `string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }`.

### `Operation`
A discriminated union on the `op` field:

AddOperation      { op: "add",     path: string, value: JsonValue }
RemoveOperation   { op: "remove",  path: string }
ReplaceOperation  { op: "replace", path: string, value: JsonValue }
MoveOperation     { op: "move",    from: string, path: string }
CopyOperation     { op: "copy",    from: string, path: string }
TestOperation     { op: "test",    path: string, value: JsonValue }


All operations share `path`. Only `move` and `copy` include `from`. Only `add`, `replace`, and `test` include `value`.

### `Patch`
An ordered array of `Operation` objects: `Operation[]`.

### `Result<T>`
A discriminated union for success/failure:

OkResult<T>    { ok: true,  value: T }
ErrResult      { ok: false, message: string, index: number }


### `JsonPointer`
A parsed representation of an RFC 6901 pointer — an array of decoded path segments. Empty array = root.

### Relationships

Patch ──contains──▶ Operation[]
Operation ──references──▶ JsonPointer (path, from)
apply(document, patch) ──returns──▶ Result<JsonValue>


---

## 5. Success Criteria

| Criterion | Measurement |
|-----------|-------------|
| All six operations implemented correctly | All acceptance scenarios from US-001 through US-012 pass |
| Atomic rollback verified | US-007 scenarios pass — no partial mutations observable after failure |
| Sequential application verified | US-008 scenarios pass — operations compose correctly |
| Edge cases covered | All EC-001 through EC-027 have corresponding test cases that pass |
| Result envelope contract | No thrown exceptions for RFC-defined failure conditions; all errors returned as `ErrResult` |
| Pointer resolution correct | EC-001 through EC-010 and US-011 scenarios all pass |
| Deep equality semantics | US-006 deep equality and type coercion scenarios pass |
| No shared references after copy | US-005 deep clone scenario passes |
| Patch validation | US-010 structural validation scenarios pass (malformed patches rejected before application) |
| Performance baseline | Single operation on 1K-element array < 1ms; 100-operation patch on 10K-key object < 10ms |
| POD-only data flow | All inputs and outputs are plain JSON values — no class instances, no prototype chains |
| Zero runtime dependencies | Library ships with no external dependencies |
