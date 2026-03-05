# Challenge: 001-typescript-library-parses

### 1. Integer Precision Loss Limit
- **Gap**: The specification demands successful parsing up to `Number.MAX_SAFE_INTEGER`, but it does not specify what happens when an input number exceeds this limit (e.g., `9007199254740992.0.0`). JavaScript will silently coerce these to floats, causing precision loss and making `9007199254740992` equal to `9007199254740993`, destroying comparison logic.
- **Severity**: Critical
- **Scenario**: 
  - **Given** version string `"9007199254740992.0.0"` and `"9007199254740993.0.0"`
  - **When** I call `compare(a, b)`
  - **Then** the result must not be `0` (it must explicitly return an error during parsing for numbers exceeding safe integer limits).

### 2. Hyphen Range Ambiguity vs Pre-release Identifiers
- **Gap**: The specification does not explicitly define whitespace requirements for hyphen ranges (`A - B`). In semver, `1.2.3-2.0.0` is a valid single version string (where `2.0.0` is the pre-release identifier), whereas `1.2.3 - 2.0.0` is a hyphen range.
- **Severity**: High
- **Scenario**:
  - **Given** a range string `"1.2.3-2.0.0"` and version `"1.2.4"`
  - **When** I call `satisfies(v, r)`
  - **Then** it must return `false` because it should be parsed as an exact match comparator for the pre-release version `1.2.3-2.0.0`, not as a hyphen range `1.2.3 <= v <= 2.0.0`.

### 3. Caret / Tilde Ranges with Pre-release Base Versions
- **Gap**: The specification (FR-011) explains how pre-releases match ranges, but fails to define the boundary limits when the range operator itself contains a pre-release tag (e.g., `^1.2.3-beta.1`). By npm semantics, this allows `1.2.3-beta.2`, but it does *not* allow `1.2.4-alpha.1` because pre-release opt-in only applies to the exact `major.minor.patch` tuple.
- **Severity**: High
- **Scenario**:
  - **Given** version `"1.2.4-alpha.1"` and range `"^1.2.3-beta.1"`
  - **When** I call `satisfies(v, r)`
  - **Then** it must return `false` (does not cross the patch boundary for pre-releases).

### 4. Wildcard Range Pre-release Leakage (The `*` Problem)
- **Gap**: FR-019 leaves ambiguity on whether `*` or `""` matches pre-release versions. Standard semver logic dictates that `*` matches `>=0.0.0`, which strictly excludes *all* pre-release versions because the comparator has no pre-release tag. There is no `includePrerelease` option defined in the API to override this.
- **Severity**: High
- **Scenario**:
  - **Given** version `"1.0.0-rc.1"` and range `"*"`
  - **When** I call `satisfies(v, r)`
  - **Then** it must return `false`.

### 5. Algorithmic Complexity / ReDoS Vectors
- **Gap**: FR-018 mentions rejecting "strings exceeding a reasonable length limit" but ignores structural complexity attacks. A string could be short but contain hundreds of `||` operators or overlapping spaces, leading to exponential backtracking if desugaring/parsing relies on naive regular expressions.
- **Severity**: High
- **Scenario**:
  - **Given** a 500-character range string consisting entirely of `1||1||1||...`
  - **When** I call `parse_range(r)`
  - **Then** it must resolve in `O(N)` time and not hang the JavaScript event loop.

### 6. Missing `<` and `<=` Pre-release Cross-Contamination
- **Gap**: It is deeply unintuitive how `<` interacts with pre-releases. Does `<2.0.0` allow `2.0.0-alpha`? (No). Does `<2.0.0` allow `1.9.9-alpha`? (No, different tuple). The spec states "at least one comparator... references the same tuple", but needs strict edge-case validation for upper bounds.
- **Severity**: Medium
- **Scenario**:
  - **Given** version `"2.0.0-alpha"` and range `"<2.0.0"`
  - **When** I call `satisfies(v, r)`
  - **Then** it must return `false`.

### 7. Multi-segment Wildcards
- **Gap**: The spec mentions `1.x` and `1.2.*` but does not explicitly address `1.x.x` or `*.*.*`, which are extremely common in the npm ecosystem and represent valid X-ranges.
- **Severity**: Medium
- **Scenario**:
  - **Given** version `"1.2.3"` and range `"1.x.x"`
  - **When** I call `satisfies(v, r)`
  - **Then** it must return `true`.

### 8. `v` Prefix in Strict Mode Ranges
- **Gap**: The spec says loose mode tolerates `v` prefixes (US-012). It does not clarify if range parsing in strict mode tolerates `v` prefixes inside comparators (e.g., `>=v1.2.3`). In practice, many strict parsers still strip `v` in ranges because users copy-paste git tags.
- **Severity**: Medium
- **Scenario**:
  - **Given** range `">=v1.2.3"` in strict mode
  - **When** I call `parse_range(r)`
  - **Then** it must explicitly return an error (or the spec must be amended to allow `v` in comparators globally).

### 9. Desugaring Data Structures
- **Gap**: FR-014 states range sugar must be desugared into primitive comparators (`>=`, `<`, `<=`, `>`, `=`). The `Comparator` entity lacks an operator for "any" (which `*` desugars into). If `*` desugars to `>=0.0.0`, it permanently loses the semantic difference between `*` and `>=0.0.0` (which matters for certain formatting or serialization tasks).
- **Severity**: Low
- **Scenario**:
  - **Given** range `"*"`
  - **When** I call `parse_range("*")`
  - **Then** the resulting `Comparator` struct must have a valid representation that doesn't artificially inject `0.0.0` if `format(parse_range("*"))` is expected to output `*`.
