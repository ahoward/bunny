# Implementation Strategies
Expansion-to-primitives proved to be the right architecture — all range sugar desugars into `>=`/`<`/`<=`/`>`/`=` comparators, making `satisfies` pure arithmetic.

## Chosen: Expansion to Primitives
Parse range string → desugar all sugar (`^`, `~`, hyphen, x-range) into primitive comparators → evaluate as `compare()` against operator. This is what node-semver does internally.

### Why It Worked
- Evaluation logic is trivial: 5-case switch on operator + numeric comparison
- All complexity concentrates in one place: `parse_range.ts` (~300 lines)
- Testing is straightforward: verify desugaring produces correct comparator pairs, then `satisfies` is just arithmetic

### Key Implementation Pattern: Pipeline Dispatch
Each comparator set token runs through a priority pipeline:
1. Hyphen range detection (` - ` pattern)
2. Caret expansion (`^`)
3. Tilde expansion (`~`)
4. X-range expansion (wildcard detection)
5. Primitive comparator parsing (fallback)

Order matters: hyphen must be checked before splitting on whitespace (it contains spaces). Caret/tilde before x-range because `^1.x` is a caret with partial version, not an x-range.

### Data Model (Validated)
```typescript
type SemVer = { major: number; minor: number; patch: number; prerelease: readonly (string | number)[]; build: readonly string[] }
type Comparator = { operator: '>=' | '>' | '<=' | '<' | '='; version: SemVer }
type ComparatorSet = readonly Comparator[]  // AND
type Range = readonly ComparatorSet[]       // OR
```

All types are readonly POD. No classes, no methods on data. This made every function pure and independently testable.

### PartialVersion: The Hidden Key Type
The internal `PartialVersion` type (major/minor/patch as `number | null`) was essential for desugaring. It distinguishes between "segment is 0" and "segment is missing/wildcard", which determines how caret, tilde, and x-range expand. This is not exposed in the public API.

## Rejected Approaches
- **AST-based**: Over-engineered for this scope. Range manipulation (intersection, simplification) wasn't needed.
- **Regex pipeline**: Fragile and hard to debug. The hand-written parser in `parse_range.ts` is longer but far more maintainable.

## Line Budget
Final implementation: ~400 lines across 7 source files. `parse_range.ts` is the largest (~300 lines), containing all desugaring logic. Everything else is compact.
