# Design Decisions
Every simple tool hides a tree of choices that shape its personality.

## Decisions Made

| Choice | Decision | Rationale |
|--------|----------|-----------|
| Output format | Columnar default, JSON via `--json` | Muscle memory for `wc` users, structured output for pipelines |
| Character counting | UTF-8 code points | Bytes confuse users; grapheme clusters too complex for v1 |
| Word splitting | Whitespace-separated sequences | POSIX behavior, predictable, no segmentation library needed |
| Line counting | Number of `\n` characters | Matches `wc`, simple, well-understood |
| Multiple files | Per-file counts, no totals | Simpler; totals can be added later without breaking output |
| Stdin support | `-` or no file argument | Unix convention |
| Error handling | Stderr + exit 1 per error | Fail loud, don't silently skip |

## Output Format
- Columnar like `wc`? JSON? Both via flags?
- **Resolved**: columnar default, `--json` flag for structured output
- Column order: lines, words, characters, filename (matches `wc`)

## Counting Semantics
- **Words**: split on whitespace (POSIX `wc` behavior)
- **Lines**: number of newline characters
- **Characters**: UTF-8 code points (not bytes, not grapheme clusters)
- `wc` conflates bytes and characters — we fix that

## Input Sources
- File paths and stdin (via `-` or no argument)
- Shell handles glob expansion
- Directories: error
- Symlinks: follow (read the target)

## Error Handling
- File not found: stderr message, exit 1
- Permission denied: stderr message, exit 1
- Empty file: 0/0/0 (not an error)
