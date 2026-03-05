# Ecosystem and Alternatives
Understanding existing implementations reveals both proven patterns and opportunities for differentiation.

## node-semver (npm)
- The de facto standard, ~1600 lines of JS
- Uses regex-heavy parsing with expansion to comparator sets
- Handles loose mode (tolerant parsing) and strict mode
- Weaknesses: mutable SemVer class, regex complexity, no TypeScript types built-in
- Weekly downloads: 200M+ — the most depended-on npm package

## rust: semver crate
- Strict parsing, no loose mode
- Uses a proper parser (not regex)
- Excellent error messages with spans
- Different range syntax than npm (Cargo-style: no `||`, uses `,` for AND)

## Go: Masterminds/semver
- Supports both npm-style and Cargo-style constraints
- Clean constraint interface

## Differentiation Opportunities
- **Type-safe POD**: no classes, just data in/out — aligns with project conventions
- **Explain mode**: instead of just true/false, show WHY a version does/doesn't satisfy a range
- **Range algebra**: compute intersection, union, complement of ranges as first-class operations
- **WASM target**: Bun/TypeScript → compile to WASM for polyglot use
- **Streaming/lazy evaluation**: short-circuit on first match in large version lists
- **Error quality**: instead of "invalid range", point to the exact character that fails
