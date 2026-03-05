# Patterns and Lessons
Reusable implementation patterns that emerged from building the semver resolver.

## Pattern: Desugaring Pipeline
When a domain has multiple syntactic sugar forms that all reduce to the same primitives, implement as a priority-ordered pipeline of expansion functions. Each function either returns expanded results or `null` (not my syntax). First non-null wins.

```
for (const token of tokens) {
  const caret = expand_caret(token)
  if (caret) { result.push(...caret); continue }
  const tilde = expand_tilde(token)
  if (tilde) { result.push(...tilde); continue }
  // ... fallback to primitive
}
```

Benefits: each expansion function is independently testable, order is explicit, adding new syntax is just adding a new function to the chain.

## Pattern: Nullable Fields for Partial Data
When a type has "missing" vs "zero" semantics, use `number | null` rather than `number | undefined` or optional fields. This makes the distinction explicit in every branch:
- `minor === null` → segment was not provided (wildcard/partial)
- `minor === 0` → segment was explicitly zero

This was critical for correct caret expansion where `^0.0` and `^0.0.0` produce different results.

## Pattern: Guard-at-Boundary, Trust Internally
- Public functions (`parse`, `satisfies`, `parse_range`) validate all inputs and return result types
- Internal functions (`expand_caret`, `compare`, `full_version`) trust their callers and use direct types
- This keeps internal code clean while maintaining safety at the API surface

## Lesson: Concentrate Complexity
Rather than spreading parsing logic across multiple files, keeping all desugaring in one file (`parse_range.ts`) made it easier to reason about interactions between range types. The file is larger (~300 lines) but the locality pays off.

## Lesson: Pre-release Semantics Are Per-ComparatorSet
The pre-release gate operates at the comparator-set level (each `||` alternative), not at the range level. This means `>=1.0.0 || >=1.0.0-alpha` can match `1.0.0-beta` (via the second set) even though the first set would reject it. Getting this scoping right was the key insight.
