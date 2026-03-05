# Challenge: 001-typescript-library-implementing

### 1. Security Concerns

**Gap**: The specification lacks protection against Prototype Pollution. In JavaScript/TypeScript environments, JSON Pointers that resolve to `__proto__`, `constructor`, or `prototype` can traverse into the prototype chain of built-in objects. Modifying these can compromise the entire JavaScript runtime environment.
**Severity**: critical
**Scenario**:
- Given a document `{}`
- When I apply `[{"op": "add", "path": "/__proto__/isAdmin", "value": true}]`
- Then the patch must be rejected with an error, ensuring `Object.prototype.isAdmin` is not set to `true`.

### 2. Missing Edge Cases & Boundary Conditions

**Gap**: The behavior of the `remove` operation targeting the root document (`path: ""`) is undefined. RFC 6902 does not explicitly forbid it, but removing the root document results in no document at all (or `undefined` in JavaScript), which violates the requirement that the output must be a valid `JsonValue`.
**Severity**: high
**Scenario**:
- Given a document `{"a": 1}`
- When I apply `[{"op": "remove", "path": ""}]`
- Then the operation must fail with an error indicating the root document cannot be removed (or handled explicitly).

**Gap**: The specification explicitly addresses existence checks for `replace` (EC-025) and `remove` (EC-026), but misses the explicit requirement that the `from` path MUST exist for `copy` and `move` operations.
**Severity**: high
**Scenario**:
- Given a document `{"a": 1}`
- When I apply `[{"op": "copy", "from": "/nonexistent", "path": "/b"}]`
- Then the operation must fail with an error indicating the `from` location does not exist.

### 3. Ambiguous Requirements & Contradictions

**Gap**: EC-012 states that a `move` operation where `from` equals `path` is a "No-op (document unchanged, no error)". This contradicts RFC 6902, which mandates that the `from` location MUST exist. If `/nonexistent` is moved to `/nonexistent`, EC-012 implies a silent success, whereas it must strictly fail.
**Severity**: medium
**Scenario**:
- Given a document `{"a": 1}`
- When I apply `[{"op": "move", "from": "/b", "path": "/b"}]`
- Then the operation must fail with an error indicating the `from` path does not exist.

**Gap**: The `JsonValue` type allows TypeScript `number`. In JavaScript, `number` includes `NaN`, `Infinity`, and `-Infinity`, which are invalid according to the strict JSON specification (RFC 8259). Passing these would break "POD-only data flow" when passing through standard `JSON.stringify`.
**Severity**: medium
**Scenario**:
- Given a document `{}`
- When I apply `[{"op": "add", "path": "/badNum", "value": NaN}]`
- Then the operation must fail validation because `NaN` is not a valid JSON literal.

### 4. Concurrency and Ordering Issues

**Gap**: The specification forbids `move` into its own subtree (FR-010, EC-011) but overlooks the implementation risk of `copy` into its own subtree. If the cloning mechanism is not strictly sequenced *before* insertion, copying a parent into its own child can trigger infinite recursion or out-of-memory errors during application.
**Severity**: high
**Scenario**:
- Given a document `{"a": {}}`
- When I apply `[{"op": "copy", "from": "/a", "path": "/a/b"}]`
- Then the result must be `{"a": {"b": {}}}` and must not trigger an infinite recursion loop during the deep clone or apply phases.

### 5. Data Validation Gaps

**Gap**: The specification rejects leading zeros for array indices (FR-013, EC-004), but fails to define behavior for `-0`. In JSON Pointer (RFC 6901), `-0` is considered a string key, not the numeric index `0`, and attempting to use it as an array index should be explicitly rejected.
**Severity**: low
**Scenario**:
- Given a document `{"list": [1, 2, 3]}`
- When I apply `[{"op": "add", "path": "/list/-0", "value": 4}]`
- Then the operation must fail with an error indicating invalid array index syntax.

**Gap**: The specification does not define validation behavior for malformed JSON Pointers that lack a leading slash (and are not the empty string), or that contain invalid escape sequences (e.g., `~2` or `~a`).
**Severity**: medium
**Scenario**:
- Given a document `{"a": 1}`
- When I apply `[{"op": "test", "path": "a", "value": 1}]` (missing leading slash) OR `[{"op": "test", "path": "/~2", "value": 1}]` (invalid escape)
- Then the operation must fail validation before execution, indicating invalid JSON Pointer syntax.

**Gap**: Patch input validation (US-010, FR-019) focuses on the structure of individual operations but assumes the top-level patch is already an array. It does not dictate the envelope response if the patch itself is malformed at the root (e.g., passing an object or null instead of an `Operation[]`).
**Severity**: low
**Scenario**:
- Given a document `{"a": 1}`
- When I apply a patch payload `{"op": "add", "path": "/b", "value": 2}` (an object, not an array)
- Then the library must return a handled `ErrResult` rather than throwing an unhandled runtime exception (e.g., `TypeError`).
