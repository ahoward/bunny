# Verification: 001-typescript-library-implementing

### Finding 1: Broken Property Tests (Test Suite Failure)
- **Issue**: The property tests do not actually execute because `fc.jsonObject()` is not a valid `fast-check` generator (it should be `fc.jsonValue()` or `fc.object()`). The test runner crashes during suite evaluation, meaning the idempotency and structural invariants are never validated against randomized inputs. A passing test suite is falsely reporting success while skipping these critical checks.
- **Severity**: critical
- **Suggested Test**: Replace `fc.jsonObject()` with `fc.object()` or `fc.dictionary(fc.string(), fc.jsonValue())` in `tests/properties.test.ts` to ensure the property tests run successfully and catch actual structural bugs.

### Finding 2: Reference Leakage of Patch Values (Atomicity / Isolation Violation)
- **Issue**: The `value` provided in `add` and `replace` operations is inserted by reference into the document, rather than being deep-cloned. If the patch object contains a nested object or array, the returned document maintains a shared reference with the input patch. External mutations to the patch payload will silently mutate the successfully applied document, violating the snapshot guarantee and "POD-only data flow" requirements.
- **Severity**: high
- **Suggested Test**: Apply `[{op: 'add', path: '/x', value: {a: 1}}]` to `{}`, then mutate the original patch payload (`patch[0].value.a = 2`). Assert that the applied document remains securely isolated as `{"x": {"a": 1}}`.

### Finding 3: Prototype Traversal in Existence Checks
- **Issue**: Operations like `remove` and `replace` use the `in` operator (`key in obj`) to verify if a target exists in an object. This operator traverses the prototype chain. Attempting to `remove` an inherited method like `/toString` evaluates as "existing" but silently does nothing, while `replace` on `/toString` creates an unintended own-property shadow. Both should fail explicitly since they do not exist as standard JSON properties.
- **Severity**: medium
- **Suggested Test**: Apply `[{op: 'remove', path: '/toString'}]` to `{}`. Assert that the operation fails with an `ErrResult` indicating the target does not exist, rather than returning a silent success.

### Finding 4: Missing Cycle Detection in Validation (Stack Overflow)
- **Issue**: The `validate` function recursively inspects `op.value` (using `Object.values(v).every(...)`) to ensure all nested properties are valid JSON primitives. It lacks cycle detection. If a developer accidentally or maliciously provides a patch with a circular reference in the `value` field, the library crashes the runtime with a fatal `RangeError` (stack overflow) instead of returning a handled `ErrResult`.
- **Severity**: medium
- **Suggested Test**: Apply a patch containing a circular reference: `const val = {}; val.self = val; apply({}, [{op: 'add', path: '/x', value: val}])`. Assert that the library safely catches the invalid JSON structure and returns an `ErrResult`.
