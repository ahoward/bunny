# Implementation Plan: 001-typescript-library-parses

**Date**: 2026-03-05
**Spec**: specs/001-typescript-library-parses/spec.md

# Implementation Plan: Semver Version Parser & Range Resolver

**Feature branch:** `001-typescript-library-parses`
**Date:** 2026-03-05

---

## 1. Summary

Build a zero-dependency TypeScript library that parses semver 2.0.0 version strings and evaluates npm-style range expressions. The architecture follows the **expansion-to-primitives** strategy: all range sugar (`^`, `~`, hyphen, x-range) is desugared into primitive comparators (`>=`, `<`, `<=`, `>`, `=`), then `satisfies` reduces to arithmetic on `major.minor.patch.prerelease` tuples. All public functions return `ParseResult<T>` (never throw). All data types are immutable POD.

---

## 2. Technical Context

| Dimension | Choice |
|-----------|--------|
| Language | TypeScript (strict mode) |
| Runtime | Bun |
| Test runner | `bun test` (built-in, Jest-compatible) |
| Dependencies | Zero runtime dependencies |
| Target | ESM module, `src/` source tree |
| Conventions | snake_case, POD only, guard-early, null over undefined, result types |
| Constraints | max 20 files, max 500 lines changed, 0 new deps (`bny/guardrails.json`) |

---

## 3. Project Structure

src/
  types.ts              # SemVer, Comparator, ComparatorSet, Range, ParseResult types
  parse.ts              # parse(input, opts?) → ParseResult<SemVer>
  format.ts             # format(version) → string
  compare.ts            # compare(a, b) → -1 | 0 | 1
  parse_range.ts        # parse_range(input) → ParseResult<Range>
  satisfies.ts          # satisfies(version, range) → boolean
  index.ts              # public API re-exports
tests/
  parse.test.ts         # US-001, US-002, US-012, EC-01..06
  compare.test.ts       # US-003, EC-14..16
  parse_range.test.ts   # US-011, EC-07..13, EC-17..19, challenge items
  satisfies.test.ts     # US-004..010, high-value node-semver vectors
  round_trip.test.ts    # SC-06: parse(format(parse(s))) identity


Total: 12 files. Well within the 20-file guardrail.

---

## 4. Implementation Phases

### Phase 1: Types & Version Parsing

**Deliverable:** `src/types.ts`, `src/parse.ts`, `src/format.ts`

**`src/types.ts`** — Define all POD types:

typescript
export type SemVer = {
  readonly major: number
  readonly minor: number
  readonly patch: number
  readonly prerelease: readonly (string | number)[]
  readonly build: readonly string[]
}

export type Comparator = {
  readonly operator: '>=' | '>' | '<=' | '<' | '='
  readonly version: SemVer
}

export type ComparatorSet = readonly Comparator[]

export type Range = readonly ComparatorSet[]

export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string }

export type ParseOptions = { readonly loose?: boolean }


**`src/parse.ts`** — `parse(input: string, opts?: ParseOptions) → ParseResult<SemVer>`

Implementation steps:
1. Guard: reject null/undefined/non-string → error result
2. Guard: reject strings > 256 chars (ReDoS prevention, FR-018)
3. If `opts.loose`, strip leading `v` or `=` prefix; otherwise reject them
4. Split on `+` first to extract build metadata, then split remainder on `-` (first occurrence after core) to separate version-core from prerelease
5. Split core on `.` — require exactly 3 segments (or fill missing in loose mode)
6. Validate each core segment: no leading zeros, parseable as integer, ≤ `Number.MAX_SAFE_INTEGER` (challenge #1)
7. If prerelease present, split on `.`, validate each identifier: numeric (no leading zeros, parse as number) or alphanumeric string; reject empty identifiers (EC-05)
8. If build present, split on `.`, validate non-empty identifiers (EC-06)
9. Return `{ ok: true, value: { major, minor, patch, prerelease, build } }`

**`src/format.ts`** — `format(v: SemVer) → string`

Straightforward: `` `${major}.${minor}.${patch}` `` + optional `-${prerelease.join('.')}` + optional `+${build.join('.')}`.

---

### Phase 2: Version Comparison

**Deliverable:** `src/compare.ts`

**`compare(a: SemVer, b: SemVer) → -1 | 0 | 1`**

Implementation steps:
1. Compare `major`, then `minor`, then `patch` numerically
2. If all equal, compare prerelease arrays per semver 2.0.0 §11:
   - No prerelease > has prerelease (release beats pre-release)
   - Walk identifiers pairwise:
     - Both numeric → compare as integers
     - Both string → compare lexicographically
     - Numeric < string
   - Shorter array < longer array (if all shared identifiers are equal)
3. Build metadata is ignored entirely (FR-013)

Helper: `compare_identifiers(a: string | number, b: string | number) → -1 | 0 | 1`

---

### Phase 3: Range Parsing & Desugaring

**Deliverable:** `src/parse_range.ts`

**`parse_range(input: string) → ParseResult<Range>`**

This is the most complex module. Implementation steps:

1. **Guard:** reject null/undefined → error; reject strings > 1024 chars (FR-018)
2. **Normalize whitespace:** collapse multiple spaces to single, trim
3. **Split on `||`** → array of raw comparator-set strings (flat, no nesting — EC-19)
4. **For each comparator-set string**, parse into `ComparatorSet`:

   a. **Detect and expand hyphen ranges** (`A - B`):
      - Pattern: two version-like tokens separated by ` - ` (spaces required — challenge #2)
      - Partial left fills zeros: `1.2` → `1.2.0` → `>=1.2.0`
      - Full right: `<=B`
      - Partial right: bump next significant → `<`: `2.3` → `<2.4.0` (EC-10)

   b. **Detect and expand X-ranges** (`1.x`, `1.2.*`, `*`, `1.x.x` — challenge #7):
      - `*` / `x` / `X` / `` → `>=0.0.0` (match any — but see `*` pre-release note)
      - `1.x` / `1.*` / `1.x.x` → `>=1.0.0 <2.0.0`
      - `1.2.x` / `1.2.*` → `>=1.2.0 <1.3.0`

   c. **Detect and expand caret ranges** (`^version`):
      - `^1.2.3` → `>=1.2.3 <2.0.0` (standard)
      - `^0.2.3` → `>=0.2.3 <0.3.0` (zero-major — EC-07)
      - `^0.0.3` → `>=0.0.3 <0.0.4` (zero-zero-major — EC-08)
      - `^1.2` → `>=1.2.0 <2.0.0`, `^0.0` → `>=0.0.0 <0.1.0` (EC-09, FR-020)
      - `^1.2.3-beta.1` → `>=1.2.3-beta.1 <2.0.0` (challenge #3)

   d. **Detect and expand tilde ranges** (`~version`):
      - `~1.2.3` → `>=1.2.3 <1.3.0`
      - `~1.2` → `>=1.2.0 <1.3.0`
      - `~1` → `>=1.0.0 <2.0.0`

   e. **Parse primitive comparators** (`>=1.0.0`, `<2.0.0`, `=1.0.0`, bare `1.2.3`):
      - Extract operator prefix (`>=`, `>`, `<=`, `<`, `=`, or none → `=`)
      - Parse the version part using a relaxed internal parser (accepts partial versions for range context)
      - Bare version `1.2.3` → `= 1.2.3` (EC-13)

5. **Return** `{ ok: true, value: comparator_sets }` as `Range`

Internal helper types needed:
- `PartialVersion`: `{ major: number, minor?: number, patch?: number, prerelease?, build? }` — used during desugaring before converting to full `SemVer`
- `parse_partial(token: string) → ParseResult<PartialVersion>` — tolerates `1.2`, `1`, `*`, `1.x`

---

### Phase 4: Satisfies

**Deliverable:** `src/satisfies.ts`

**`satisfies(version: string | SemVer, range: string | Range) → boolean`**

Implementation steps:
1. If `version` is string, parse it (strict mode). Return `false` on parse failure.
2. If `range` is string, parse it via `parse_range`. Return `false` on parse failure.
3. For each `ComparatorSet` in the `Range` (OR):
   a. **Pre-release gate (FR-011):** If the version has a non-empty prerelease array, check if at least one comparator in this set references the same `major.minor.patch` tuple AND has a non-empty prerelease. If not, skip this set (return false for this set).
   b. For each `Comparator` in the set (AND):
      - Evaluate: `compare(version, comparator.version)` against the operator
      - `>=` → cmp >= 0, `>` → cmp > 0, `<=` → cmp <= 0, `<` → cmp < 0, `=` → cmp === 0
   c. If all comparators in the set pass → return `true`
4. If no set passed → return `false`

Special case for `*` / empty range (FR-019, challenge #4):
- `*` desugars to `[[ >= 0.0.0 ]]` — the pre-release gate means `*` does NOT match pre-release versions
- This matches npm behavior

---

### Phase 5: Public API & Index

**Deliverable:** `src/index.ts`

typescript
export { parse } from './parse'
export { format } from './format'
export { compare } from './compare'
export { parse_range } from './parse_range'
export { satisfies } from './satisfies'
export type { SemVer, Comparator, ComparatorSet, Range, ParseResult, ParseOptions } from './types'


---

## 5. Dependencies & Execution Order

Phase 1: types.ts → parse.ts, format.ts     (no deps, start here)
              │
              ▼
Phase 2: compare.ts                          (depends on SemVer type)
              │
              ▼
Phase 3: parse_range.ts                      (depends on types, uses internal partial parser)
              │
              ▼
Phase 4: satisfies.ts                        (depends on parse, parse_range, compare)
              │
              ▼
Phase 5: index.ts                            (depends on all modules)


**Parallel opportunities:**
- `parse.ts` and `format.ts` can be written simultaneously (Phase 1)
- `compare.ts` (Phase 2) and `parse_range.ts` (Phase 3) are independent of each other — both only depend on `types.ts`. They CAN be parallelized.
- Tests for each phase can be written alongside (or before, per antagonistic testing protocol) implementation

**Blocking dependencies:**
- `satisfies.ts` blocks on all other modules — it is the integration point
- `parse_range.ts` is the highest-risk module (most complex logic, most edge cases) — allocate the most review attention here

**Test execution order:**
1. `tests/parse.test.ts` — run first, validates foundation
2. `tests/compare.test.ts` — validates ordering
3. `tests/parse_range.test.ts` — validates desugaring
4. `tests/satisfies.test.ts` — integration, validates everything together
5. `tests/round_trip.test.ts` — property-based validation

---

## 6. Key Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Hyphen range vs pre-release ambiguity (challenge #2) | Require ` - ` (space-hyphen-space) for hyphen ranges; `1.2.3-alpha` is always a pre-release version |
| `Number.MAX_SAFE_INTEGER` overflow (challenge #1) | Check `n > Number.MAX_SAFE_INTEGER` after parseInt, return error |
| ReDoS via complex ranges (challenge #5) | Length limit (1024 chars) + hand-written parser (no regex backtracking) |
| `*` matching pre-releases (challenge #4) | Pre-release gate in satisfies handles this — `*` desugars to `>=0.0.0` which has no pre-release tag |
| 500-line PR limit | Tight POD types, no boilerplate. Estimated ~400 lines of source across 7 files |

---

It looks like the file write was blocked by permissions. Would you like me to try writing it again, or is the plan above (rendered inline) sufficient?
