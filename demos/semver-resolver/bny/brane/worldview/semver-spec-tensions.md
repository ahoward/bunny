# Semver Spec Tensions
The semver 2.0.0 specification leaves several areas ambiguous or contested, creating real implementation dilemmas.

## Spec vs. Ecosystem Reality
The semver spec (semver.org) defines version FORMAT but says nothing about ranges. Range syntax is an npm invention that became a de facto standard. Other ecosystems (Cargo, Go, Composer) invented different range syntaxes. There is no "standard" range grammar.

## Pre-release Inclusion: The Biggest Controversy
npm's rule: pre-releases only match if the comparator references the same major.minor.patch. This means `>=1.0.0` excludes `2.0.0-alpha`. The reasoning: users who write `>=1.0.0` want stable releases. But this creates surprising behavior:
- `>=1.0.0-0` DOES match `2.0.0-alpha` (because pre-release tag is present)
- There's no clean way to say "all versions including pre-releases"

## Leading Zeros
- `01.02.03` — invalid per spec (no leading zeros in numeric identifiers)
- But many registries contain such versions in practice
- Strict rejection vs. pragmatic acceptance?

## Version Coercion
- `v1.2.3` → `1.2.3` (strip leading v)
- `1.2` → `1.2.0` (fill missing patch)
- `1` → `1.0.0` (fill missing minor and patch)
- None of these are valid semver, but all appear constantly in the wild

## The `=` Operator Ambiguity
- Is `1.2.3` (bare version in a range) equivalent to `=1.2.3`?
- What about `1.2.3` with pre-release: does `=1.2.3-alpha.1` match only that exact pre-release?
- Yes — `=` means exact match including pre-release

## Ordering at Boundaries
- `1.0.0-alpha` < `1.0.0` — pre-release is LOWER than release
- This is counterintuitive to many developers who think of pre-releases as "newer"
