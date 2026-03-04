# Spec: CLI Tool Counts

## Summary

A CLI tool that counts words, lines, and characters in files.

## Interface

```
wc <file> [--json] [--words] [--lines] [--chars]
```

- Default: prints all three counts (words, lines, characters) plus filename
- `--json`: output as JSON object
- `--words`, `--lines`, `--chars`: show only the requested counts
- Multiple files: per-file counts, no totals
- No file argument or `-`: read from stdin

## Output Format

### Default (columnar)
```
  10   50  300 file.txt
```
Order: lines, words, characters, filename (matches `wc` convention)

### JSON (`--json`)
```json
{"file":"file.txt","lines":10,"words":50,"chars":300}
```

## Counting Semantics

- **Words**: sequences of non-whitespace characters separated by whitespace (POSIX `wc` behavior)
- **Lines**: number of newline characters (`\n`)
- **Characters**: number of UTF-8 code points (not bytes)

## Error Handling

- File not found: print error to stderr, exit 1
- Permission denied: print error to stderr, exit 1
- Empty file: 0/0/0 (not an error)

## Constraints

- No runtime dependencies
- Bun + TypeScript only
- POD data structures only
