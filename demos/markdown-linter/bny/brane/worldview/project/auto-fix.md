# Auto-Fix Capability
Detecting problems is table stakes — fixing them automatically is what makes a linter indispensable.

## Fixable vs Unfixable

**Safely fixable** (mechanical transforms):
- Trailing whitespace removal
- Consistent list markers
- Heading style normalization
- Missing final newline
- Consecutive blank line collapse
- Hard tab replacement

**Unfixable** (require human judgment):
- Missing image alt text (what does the image show?)
- Broken links (should they be updated or removed?)
- Heading hierarchy restructuring (semantic change)
- "Click here" link text (what's the right description?)

## Fix Strategy

- `--fix` applies all safe fixes in-place
- `--fix-dry-run` shows what would change (diff format)
- Never fix and report in the same run — fix first, then re-lint
- Fixes must be idempotent: running fix twice produces same result
