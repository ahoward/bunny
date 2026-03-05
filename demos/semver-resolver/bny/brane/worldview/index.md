# Semver Resolver Knowledge Base

Zero-dependency TypeScript library (~400 LOC) that parses semver 2.0.0 versions and evaluates npm-style range expressions.

## Contents

- **[Overview](semver-resolver.md)** — Architecture, public API (`parse`, `format`, `compare`, `parse_range`, `satisfies`), file structure, design decisions
- **[Implementation Strategies](implementation-strategies.md)** — Expansion-to-primitives architecture, pipeline dispatch (hyphen → caret → tilde → x-range → primitive), `PartialVersion` as the hidden key type
- **[Edge Cases & Gotchas](edge-cases-and-gotchas.md)** — Pre-release gate (hardest part, 6 lines), zero-major caret, hyphen vs prerelease ambiguity, partial versions in ranges, build metadata
- **[Spec Tensions](semver-spec-tensions.md)** — Where semver 2.0.0 is ambiguous: pre-release inclusion, leading zeros, coercion, `=` operator semantics
- **[Ecosystem & Alternatives](ecosystem-and-alternatives.md)** — node-semver, Rust semver, Go semver; differentiation via POD types and error quality
- **[Testing Strategy](testing-strategy.md)** — Layered test architecture: contracts, boundaries, properties, golden files; antagonistic testing protocol
- **[Patterns & Lessons](patterns-and-lessons.md)** — Reusable patterns: desugaring pipeline, nullable fields for partial data, guard-at-boundary

## Key Insights

- `parse_range.ts` holds ~75% of complexity; everything else is simple arithmetic
- The pre-release gate in `satisfies` is the subtlest semantic rule
- `null` vs `0` in `PartialVersion` is critical for correct caret/tilde expansion
- All range sugar desugars to `>=`/`<`/`<=`/`>`/`=` primitives — evaluation is just `compare()` + operator switch
