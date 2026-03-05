# Edge Cases and Gotchas
Semver range resolution has numerous edge cases; the pre-release gate and zero-major caret behavior caused the most implementation complexity.

## Pre-release Gate (FR-011) — The Hardest Part
The pre-release inclusion rule is the single most complex piece of `satisfies`:
- If a version has a prerelease tag, it only matches a comparator set where **at least one comparator** references the **same major.minor.patch tuple** and **itself has a prerelease**
- This is checked per-comparator-set (each `||` alternative), not per-range
- `>=1.0.0` does NOT match `1.0.0-beta` (no prerelease on comparator)
- `>=1.0.0-alpha` DOES match `1.0.0-beta` (same tuple, comparator has prerelease)
- `>=1.0.0-0` does NOT match `2.0.0-alpha` (different major.minor.patch tuple)
- `*` desugars to `>=0.0.0` — no prerelease tag → blocks all pre-releases. This is correct npm behavior.

### Implementation: the gate is 6 lines in `test_comparator_set()`
```typescript
if (version.prerelease.length > 0) {
  const has_matching = set.some(c =>
    c.version.major === version.major &&
    c.version.minor === version.minor &&
    c.version.patch === version.patch &&
    c.version.prerelease.length > 0
  )
  if (!has_matching) return false
}
```

## Zero-Major Caret Behavior
- `^0.2.3` → `>=0.2.3 <0.3.0` (NOT `<1.0.0`)
- `^0.0.3` → `>=0.0.3 <0.0.4` (exact patch lock)
- `^0.0` → `>=0.0.0 <0.1.0`
- `^0` → `>=0.0.0 <1.0.0`

The caret expansion logic uses a priority chain: check `M !== 0` first, then `m !== 0`, then whether patch is present. The `null` vs `0` distinction in `PartialVersion` is critical here.

## Hyphen Range vs Pre-release Ambiguity
`1.2.3-2.0.0` — is this a hyphen range or version `1.2.3` with prerelease `2.0.0`?
- Answer: it's a prerelease. Hyphen ranges require ` - ` (space-hyphen-space)
- The regex `/^(.+)\s+-\s+(.+)$/` enforces this

## Partial Versions in Ranges
- `^1.2` → `>=1.2.0 <2.0.0` (missing patch filled with 0 for lower, major+1 for upper)
- `~1.2` → `>=1.2.0 <1.3.0`
- `1.2 - 2.3` → `>=1.2.0 <2.4.0` (left fills zeros, partial right bumps next significant)

## Pre-release Ordering
- `1.0.0-alpha < 1.0.0-alpha.1 < 1.0.0-alpha.beta < 1.0.0-beta < 1.0.0`
- Numeric segments compare as integers (not strings): `1.0.0-2 < 1.0.0-10`
- Numeric < string: `1.0.0-1 < 1.0.0-alpha`
- Shorter array < longer (when shared identifiers are equal)
- No prerelease (release) > has prerelease

## Build Metadata
- Parsed and preserved but ignored in ALL comparisons
- `1.0.0+build1` and `1.0.0+build2` compare as equal

## Input Validation
- Leading zeros in numeric identifiers are invalid: `01.2.3`, `1.0.0-01`
- Empty prerelease/build segments invalid: `1.0.0-`, `1.0.0+`
- Length limits: 256 chars for versions, 1024 for ranges (ReDoS prevention)
- `null`/`undefined` input returns error result, never throws
