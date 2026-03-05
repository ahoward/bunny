# Semver Resolver
A zero-dependency TypeScript library (~400 LOC) that parses semver 2.0.0 versions and evaluates npm-style range expressions.

## Architecture
Expansion-to-primitives: all range sugar (`^`, `~`, hyphen, x-range) desugars into primitive comparators (`>=`, `<`, `<=`, `>`, `=`). Then `satisfies` is just arithmetic on version tuples.

## Public API
| Function | Signature | Purpose |
|----------|-----------|--------|
| `parse` | `(input: string, opts?: { loose?: boolean }) → ParseResult<SemVer>` | Parse version string |
| `format` | `(v: SemVer) → string` | Render SemVer to string |
| `compare` | `(a: SemVer, b: SemVer) → -1 \| 0 \| 1` | Precedence comparison |
| `parse_range` | `(input: string) → ParseResult<Range>` | Parse range into comparator sets |
| `satisfies` | `(version: string \| SemVer, range: string \| Range) → boolean` | Test version against range |

## Supported Range Syntax
| Syntax | Example | Expansion |
|--------|---------|----------|
| Comparators | `>=1.0.0`, `<2.0.0` | Direct |
| Caret | `^1.2.3` | `>=1.2.3 <2.0.0` |
| Tilde | `~1.2.3` | `>=1.2.3 <1.3.0` |
| Hyphen | `1.2.3 - 2.3.4` | `>=1.2.3 <=2.3.4` |
| X-range | `1.x`, `1.2.*`, `*` | `>=1.0.0 <2.0.0`, etc |
| Union | `^1 \|\| ^2` | OR semantics |
| Intersection | `>=1 <2` (space) | AND semantics |

## File Structure
```
src/types.ts        # POD types (23 lines)
src/parse.ts        # Version parsing (115 lines)
src/format.ts       # Version formatting (9 lines)
src/compare.ts      # Version comparison (39 lines)
src/parse_range.ts  # Range parsing & desugaring (299 lines)
src/satisfies.ts    # satisfies() integration (57 lines)
src/index.ts        # Public re-exports (7 lines)
```

## Design Decisions
- **Result types over exceptions**: All public functions return `ParseResult<T>`, never throw
- **POD only**: No classes, no `this`, no prototype chains
- **Internal PartialVersion**: `{ major: number | null, minor: number | null, patch: number | null }` — distinguishes missing from zero, critical for correct desugaring
- **Length limits**: 256 chars for versions, 1024 for ranges (ReDoS prevention)
- **Strict by default**: Loose mode is opt-in for `parse()` only
