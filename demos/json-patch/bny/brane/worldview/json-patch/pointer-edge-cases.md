# JSON Pointer Edge Cases
RFC 6901 pointer resolution hides surprising complexity that breaks naive implementations.

## The `-` Token

The `-` token references the element *after* the last element of an array. It is valid only for `add` operations (appending). Using `-` with `remove`, `replace`, or `test` must produce an error. The implementation checks the last segment of the parsed pointer for each operation type.

## Escaped Characters

- `~1` decodes to `/`
- `~0` decodes to `~`
- **Decoding order matters**: replace `~1` → `/` first, then `~0` → `~`. This is the RFC 6901 specified order. Example: `~01` → first pass leaves `~01` unchanged (no `~1` match at that position) → second pass converts `~0` → `~` → result is `~1` as a literal key. Getting this order wrong breaks keys containing literal `~1`.

## Root Document Targeting

An empty string `""` targets the entire document. `add` with path `""` replaces the whole document. `replace` with path `""` also replaces the root. `remove` with path `""` is an error — you cannot remove the root. This asymmetry requires explicit handling.

## Numeric Array Indices

- Leading zeros are forbidden (`/01` is invalid) — validated with regex `/^[1-9]\d*$/` plus special-casing `"0"`
- Out-of-bounds indices are errors for all operations except `add` at exactly `length`
- Non-numeric tokens against arrays are errors

## Missing Intermediate Objects

Unlike lodash `_.set`, JSON Patch does NOT auto-create intermediate paths. `/a/b/c` fails if `/a/b` doesn't exist. This is intentional — patches are precise, not fuzzy.

## Prototype Pollution

Pointer segments targeting `__proto__`, `constructor`, or `prototype` must be rejected. This is not in the RFC but is a critical security concern for any JavaScript implementation that sets object properties from untrusted input. The implementation maintains a `DANGEROUS_KEYS` set checked during pointer parsing.
