# Feature Specification: a TypeScript library that parses semver version strings and evaluates npm-style range expressions (^, ~, >=, ||, hyphen ranges, x-ranges) to test whether versions satisfy constraints

**Feature Branch**: `001-typescript-library-parses`
**Created**: 2026-03-05
**Status**: Draft

# Feature Spec: Semver Version Parser & Range Resolver

**Feature branch:** `001-typescript-library-parses`
**Date:** 2026-03-05
**Status:** Draft

---

## 1. User Scenarios & Testing

### P1 — Core Version Parsing

**US-001: Parse a valid semver string into structured components**

> As a developer, I want to parse `"1.2.3"` into its major, minor, and patch components so I can inspect or compare them programmatically.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | version string `"1.2.3"` | I call `parse("1.2.3")` | I get `{ major: 1, minor: 2, patch: 3, prerelease: [], build: [] }` |
| 2 | version string `"0.0.0"` | I call `parse("0.0.0")` | I get `{ major: 0, minor: 0, patch: 0, prerelease: [], build: [] }` |
| 3 | version with pre-release `"1.0.0-alpha.1"` | I call `parse(...)` | I get `{ major: 1, minor: 0, patch: 0, prerelease: ["alpha", 1], build: [] }` |
| 4 | version with build metadata `"1.0.0+build.42"` | I call `parse(...)` | I get `{ major: 1, minor: 0, patch: 0, prerelease: [], build: ["build", "42"] }` |
| 5 | version with both `"1.0.0-beta.2+sha.abc"` | I call `parse(...)` | prerelease is `["beta", 2]`, build is `["sha", "abc"]` |

**US-002: Reject invalid version strings with clear errors**

> As a developer, I want parse to return an error for malformed input so I can handle it gracefully.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | string `"not.a.version"` | I call `parse(...)` | I get an error result indicating invalid version |
| 2 | string `"1.2"` (missing patch) | I call `parse(...)` | I get an error — strict mode requires all three components |
| 3 | string `"01.2.3"` (leading zero) | I call `parse(...)` | I get an error — leading zeros in numeric identifiers are invalid |
| 4 | empty string `""` | I call `parse(...)` | I get an error |
| 5 | string `"1.2.3.4"` (extra segment) | I call `parse(...)` | I get an error |

---

### P1 — Version Comparison & Ordering

**US-003: Compare two versions for precedence**

> As a developer, I want to compare versions so I can sort them or determine which is newer.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | versions `"1.0.0"` and `"2.0.0"` | I call `compare(a, b)` | result is negative (a < b) |
| 2 | versions `"1.2.3"` and `"1.2.3"` | I call `compare(a, b)` | result is `0` |
| 3 | versions `"1.0.0-alpha"` and `"1.0.0"` | I call `compare(a, b)` | result is negative — pre-release is lower than release |
| 4 | versions `"1.0.0-alpha"` and `"1.0.0-alpha.1"` | I call `compare(a, b)` | result is negative — fewer fields is lower |
| 5 | versions `"1.0.0-alpha"` and `"1.0.0-beta"` | I call `compare(a, b)` | result is negative — lexicographic string comparison |
| 6 | versions `"1.0.0-1"` and `"1.0.0-alpha"` | I call `compare(a, b)` | result is negative — numeric identifiers sort before string |
| 7 | versions `"1.0.0+build1"` and `"1.0.0+build2"` | I call `compare(a, b)` | result is `0` — build metadata is ignored for precedence |

---

### P1 — Range Evaluation (satisfies)

**US-004: Test a version against a simple comparator range**

> As a developer, I want to check if a version satisfies a comparator like `>=1.0.0` so I can resolve dependency constraints.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | version `"1.2.3"`, range `">=1.0.0"` | I call `satisfies(v, r)` | `true` |
| 2 | version `"0.9.0"`, range `">=1.0.0"` | I call `satisfies(v, r)` | `false` |
| 3 | version `"1.0.0"`, range `"<2.0.0"` | I call `satisfies(v, r)` | `true` |
| 4 | version `"2.0.0"`, range `"<2.0.0"` | I call `satisfies(v, r)` | `false` |
| 5 | version `"1.0.0"`, range `"=1.0.0"` | I call `satisfies(v, r)` | `true` |
| 6 | version `"1.0.1"`, range `"=1.0.0"` | I call `satisfies(v, r)` | `false` |

**US-005: Test a version against a caret range**

> As a developer, I want `^` ranges to allow compatible changes per npm semantics.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | version `"1.9.9"`, range `"^1.2.3"` | `satisfies` | `true` — allows minor/patch bumps under same major |
| 2 | version `"2.0.0"`, range `"^1.2.3"` | `satisfies` | `false` — different major |
| 3 | version `"0.2.9"`, range `"^0.2.3"` | `satisfies` | `true` — zero-major: allows patch bumps under same minor |
| 4 | version `"0.3.0"`, range `"^0.2.3"` | `satisfies` | `false` — zero-major: minor bump not allowed |
| 5 | version `"0.0.3"`, range `"^0.0.3"` | `satisfies` | `true` — zero-zero-major: exact patch only |
| 6 | version `"0.0.4"`, range `"^0.0.3"` | `satisfies` | `false` — zero-zero-major: locked to exact patch |

**US-006: Test a version against a tilde range**

> As a developer, I want `~` ranges to allow patch-level changes.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | version `"1.2.9"`, range `"~1.2.3"` | `satisfies` | `true` — allows patch bumps |
| 2 | version `"1.3.0"`, range `"~1.2.3"` | `satisfies` | `false` — minor bump not allowed |
| 3 | version `"1.2.3"`, range `"~1.2"` | `satisfies` | `true` — `~1.2` → `>=1.2.0 <1.3.0` |
| 4 | version `"1.3.0"`, range `"~1.2"` | `satisfies` | `false` |

**US-007: Test a version against compound and union ranges**

> As a developer, I want space-separated ranges (AND) and `||`-separated ranges (OR) to work correctly.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | version `"1.5.0"`, range `">=1.0.0 <2.0.0"` | `satisfies` | `true` — both comparators pass |
| 2 | version `"2.0.0"`, range `">=1.0.0 <2.0.0"` | `satisfies` | `false` — fails the `<2.0.0` comparator |
| 3 | version `"2.5.0"`, range `"^1.0.0 \|\| ^2.0.0"` | `satisfies` | `true` — matches second alternative |
| 4 | version `"3.0.0"`, range `"^1.0.0 \|\| ^2.0.0"` | `satisfies` | `false` — matches neither |
| 5 | version `"1.2.3"`, range `"1.x \|\| >=2.5.0 \|\| 5.0.0 - 7.2.3"` | `satisfies` | `true` — matches `1.x` |

---

### P1 — Hyphen Ranges

**US-008: Test a version against a hyphen range**

> As a developer, I want `A - B` to be an inclusive version range.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | version `"1.2.3"`, range `"1.2.3 - 2.3.4"` | `satisfies` | `true` — inclusive lower bound |
| 2 | version `"2.3.4"`, range `"1.2.3 - 2.3.4"` | `satisfies` | `true` — inclusive upper bound |
| 3 | version `"2.3.5"`, range `"1.2.3 - 2.3.4"` | `satisfies` | `false` — above upper bound |
| 4 | version `"2.4.0"`, range `"1.2.3 - 2.3"` | `satisfies` | `false` — partial right: `>=1.2.3 <2.4.0` |
| 5 | version `"2.3.9"`, range `"1.2.3 - 2.3"` | `satisfies` | `true` — partial right: `<2.4.0` |
| 6 | version `"1.2.0"`, range `"1.2 - 2.3.4"` | `satisfies` | `true` — partial left fills zeros: `>=1.2.0` |

---

### P1 — X-Ranges (Wildcards)

**US-009: Test a version against an X-range**

> As a developer, I want wildcard ranges like `1.x`, `1.2.*`, and `*` to match appropriately.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | version `"1.9.9"`, range `"1.x"` | `satisfies` | `true` |
| 2 | version `"2.0.0"`, range `"1.x"` | `satisfies` | `false` |
| 3 | version `"1.2.9"`, range `"1.2.*"` | `satisfies` | `true` |
| 4 | version `"1.3.0"`, range `"1.2.*"` | `satisfies` | `false` |
| 5 | version `"99.99.99"`, range `"*"` | `satisfies` | `true` — any version matches |
| 6 | version `"0.0.0"`, range `""` | `satisfies` | `true` — empty range treated as `*` |

---

### P2 — Pre-release Semantics

**US-010: Pre-release versions follow npm inclusion rules**

> As a developer, I want pre-release versions to only match ranges that explicitly reference the same major.minor.patch tuple with a pre-release comparator.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | version `"1.0.0-beta"`, range `">=1.0.0"` | `satisfies` | `false` — pre-release excluded from ranges without pre-release tag |
| 2 | version `"1.0.0-beta"`, range `">=1.0.0-alpha"` | `satisfies` | `true` — same tuple, comparator has pre-release |
| 3 | version `"2.0.0-alpha"`, range `">=1.0.0-0"` | `satisfies` | `false` — different major.minor.patch tuple |
| 4 | version `"1.0.0-alpha.1"`, range `"1.0.0-alpha.1"` | `satisfies` | `true` — exact pre-release match |
| 5 | version `"1.0.1-beta"`, range `"~1.0.0-alpha"` | `satisfies` | `false` — pre-release on a different patch |

---

### P2 — Range Parsing Errors

**US-011: Invalid range strings produce clear errors**

> As a developer, I want descriptive errors when a range string is malformed.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | range `">=abc"` | I call `parse_range(...)` | error indicating non-numeric version component |
| 2 | range `"^"` (operator with no version) | I call `parse_range(...)` | error indicating missing version |
| 3 | range `"1.2.3 - "` (incomplete hyphen) | I call `parse_range(...)` | error indicating missing upper bound |
| 4 | range `">>>1.0.0"` (invalid operator) | I call `parse_range(...)` | error indicating unrecognized operator |

---

### P3 — Version Coercion (Loose Mode)

**US-012: Optionally coerce non-strict version strings**

> As a developer working with real-world registries, I want an opt-in loose parsing mode that tolerates common deviations.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | string `"v1.2.3"`, loose mode on | I call `parse(..., { loose: true })` | successfully parses, stripping `v` prefix |
| 2 | string `"1.2"`, loose mode on | I call `parse(..., { loose: true })` | parses as `1.2.0` (fills missing patch) |
| 3 | string `"1"`, loose mode on | I call `parse(..., { loose: true })` | parses as `1.0.0` |
| 4 | string `"v1.2.3"`, loose mode off (default) | I call `parse(...)` | returns an error — strict by default |

---

## 2. Edge Cases

### Version Parsing Boundaries
- **EC-01:** Maximum numeric values — `999999999.999999999.999999999` MUST parse successfully (no arbitrary limits below Number.MAX_SAFE_INTEGER)
- **EC-02:** Pre-release with mixed identifiers — `1.0.0-alpha.1.beta.2` has alternating string/numeric segments
- **EC-03:** Build metadata with dots — `1.0.0+20260305.sha.abc123` MUST parse all dot-separated segments
- **EC-04:** Pre-release numeric identifiers MUST NOT have leading zeros — `1.0.0-01` is invalid
- **EC-05:** Empty pre-release identifiers — `1.0.0-` is invalid
- **EC-06:** Empty build identifiers — `1.0.0+` is invalid

### Range Evaluation Boundaries
- **EC-07:** Caret with zero-major is the most commonly misunderstood behavior — `^0.2.3` → `>=0.2.3 <0.3.0`, NOT `<1.0.0`
- **EC-08:** Caret with zero-zero-major — `^0.0.3` → `>=0.0.3 <0.0.4` (exact patch lock)
- **EC-09:** Caret/tilde with missing components — `^1.2` → `>=1.2.0 <2.0.0`, `~1.2` → `>=1.2.0 <1.3.0`
- **EC-10:** Hyphen range with partial right side — `1.2.3 - 2.3` → `>=1.2.3 <2.4.0`
- **EC-11:** Whitespace normalization — extra spaces between comparators MUST be tolerated
- **EC-12:** X-range variants — `x`, `X`, `*` are all valid wildcards
- **EC-13:** Bare version in a range — `"1.2.3"` is equivalent to `"=1.2.3"`

### Pre-release Edge Cases
- **EC-14:** Pre-release ordering: `1.0.0-alpha < 1.0.0-alpha.1 < 1.0.0-alpha.beta < 1.0.0-beta < 1.0.0`
- **EC-15:** Numeric pre-release segments compare numerically — `1.0.0-2 > 1.0.0-10` is FALSE (`2 < 10`)
- **EC-16:** Pre-release with only numeric identifiers — `1.0.0-0` is the lowest possible pre-release

### Error Scenarios
- **EC-17:** `null` or `undefined` input MUST return an error, never throw
- **EC-18:** Extremely long input strings (>10KB) SHOULD return an error to prevent ReDoS
- **EC-19:** Nested `||` grouping does not exist — `||` is flat, no parentheses

---

## 3. Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| **FR-001** | The library MUST parse valid semver 2.0.0 version strings into a structured `SemVer` POD type with `major`, `minor`, `patch`, `prerelease`, and `build` fields. | MUST |
| **FR-002** | The library MUST reject invalid semver strings with a descriptive error result (not an exception). | MUST |
| **FR-003** | The library MUST compare two `SemVer` values for precedence per the semver 2.0.0 specification, ignoring build metadata. | MUST |
| **FR-004** | The library MUST provide a `satisfies(version, range)` function that returns `true` if the version matches the range. | MUST |
| **FR-005** | The library MUST support these range operators: `=`, `>`, `>=`, `<`, `<=`, `^` (caret), `~` (tilde). | MUST |
| **FR-006** | The library MUST support `\|\|`-separated range unions (OR semantics). | MUST |
| **FR-007** | The library MUST support space-separated comparator sets (AND semantics). | MUST |
| **FR-008** | The library MUST support hyphen ranges (`A - B`) including partial version bounds. | MUST |
| **FR-009** | The library MUST support X-ranges (`1.x`, `1.2.*`, `*`, `x`, `X`). | MUST |
| **FR-010** | Caret ranges with zero-major versions MUST follow npm semantics: `^0.2.3` → `>=0.2.3 <0.3.0`, `^0.0.3` → `>=0.0.3 <0.0.4`. | MUST |
| **FR-011** | Pre-release versions MUST only match ranges where at least one comparator in the set references the same `major.minor.patch` tuple with a pre-release tag. | MUST |
| **FR-012** | Pre-release identifier ordering MUST follow semver 2.0.0 rules: numeric < string, numeric segments compared as integers, string segments compared lexicographically. | MUST |
| **FR-013** | Build metadata MUST be parsed and preserved but MUST be ignored in all precedence comparisons. | MUST |
| **FR-014** | The library MUST internally desugar all range sugar (`^`, `~`, hyphen, x-range) into primitive comparators (`>=`, `<`, `<=`, `>`, `=`) before evaluation. | MUST |
| **FR-015** | The library SHOULD provide a `parse_range(range_string)` function that returns the parsed `Range` structure (union of intersections of comparators). | SHOULD |
| **FR-016** | The library SHOULD provide an opt-in loose parsing mode that tolerates leading `v`/`=` prefixes and missing patch/minor components. | SHOULD |
| **FR-017** | All public functions MUST return result types (success or error), never throw exceptions for invalid input. | MUST |
| **FR-018** | The library SHOULD reject input strings exceeding a reasonable length limit to prevent ReDoS. | SHOULD |
| **FR-019** | The library MUST treat an empty range string or `*` as matching any version. [NEEDS CLARIFICATION: Should empty string match pre-release versions?] | MUST |
| **FR-020** | The library MUST handle missing components in caret/tilde ranges: `^1.2` → `>=1.2.0 <2.0.0`, `^1` → `>=1.0.0 <2.0.0`. | MUST |

---

## 4. Key Entities

SemVer (immutable POD)
├── major: number
├── minor: number
├── patch: number
├── prerelease: readonly (string | number)[]
└── build: readonly string[]

Comparator (immutable POD)
├── operator: '>=' | '>' | '<=' | '<' | '='
└── version: SemVer

ComparatorSet = Comparator[]
  // AND semantics — all comparators must match
  // Also carries: has_prerelease_comparator flag per major.minor.patch
  // (used for pre-release inclusion check, FR-011)

Range = ComparatorSet[]
  // OR semantics — at least one set must match

ParseResult<T> = { ok: true, value: T } | { ok: false, error: string }


### Entity Relationships

Range ──1:N──▶ ComparatorSet ──1:N──▶ Comparator ──1:1──▶ SemVer
                                          │
                                    operator enum


### Key Functions (Public API Surface)

| Function | Signature | Description |
|----------|-----------|-------------|
| `parse` | `(input: string, opts?: { loose?: boolean }) → ParseResult<SemVer>` | Parse a version string |
| `compare` | `(a: SemVer, b: SemVer) → -1 \| 0 \| 1` | Compare two versions for precedence |
| `satisfies` | `(version: string \| SemVer, range: string \| Range) → boolean` | Test if version matches range |
| `parse_range` | `(input: string) → ParseResult<Range>` | Parse a range string into structured form |
| `format` | `(version: SemVer) → string` | Render a SemVer back to a string |

---

## 5. Success Criteria

| # | Criterion | Measurement |
|---|-----------|-------------|
| **SC-01** | All P1 user scenario acceptance tests pass | 100% of Given/When/Then cases in US-001 through US-009 are green |
| **SC-02** | All P2 user scenario acceptance tests pass | 100% of Given/When/Then cases in US-010 through US-011 are green |
| **SC-03** | Zero-major caret behavior is correct | `^0.2.3`, `^0.0.3`, `^0.x` edge cases all pass (EC-07, EC-08, EC-09) |
| **SC-04** | Pre-release inclusion follows npm semantics | EC-14 through EC-16 all pass; no pre-release leaks through non-pre-release ranges |
| **SC-05** | No exceptions thrown on any input | Fuzz with 10,000 random strings — all return `ParseResult`, none throw |
| **SC-06** | `parse(format(parse(s)))` round-trips | For all valid version strings, formatting and re-parsing yields identical `SemVer` values |
| **SC-07** | Comparison is a total order | `compare` is reflexive, antisymmetric, and transitive across all test versions |
| **SC-08** | Satisfies monotonicity | If `satisfies(v, A)` is true, then `satisfies(v, "A \|\| B")` is also true for any B |
| **SC-09** | node-semver compatibility | Results agree with node-semver on its own test vectors (high-value cases from testing strategy) |
| **SC-10** | All public functions return POD types only | No classes, no `this`, no prototype chains in any return value |
