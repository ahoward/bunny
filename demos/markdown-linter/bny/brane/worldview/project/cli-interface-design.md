# CLI Interface Design
The CLI is minimal and Unix-conventional: positional args for files, flags for options, structured exit codes.

## Implemented Interface

```
mlint file.md                    # lint one file
mlint docs/                      # lint directory recursively
mlint --format json file.md      # machine-readable output
mlint --help                     # usage information
```

## Output Formats (v1)

- **human**: `file:line:col severity  message  rule_id` with optional suggestion line, plus summary
- **json**: pretty-printed LintResult array
- **compact**: one line per issue with `[rule_id]` suffix

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | No issues found |
| 1 | Warnings only |
| 2 | Errors found |
| 3 | No files specified / fatal |

## Implementation Notes

- `parse_args()` is a simple loop over argv — no arg parsing library needed for this scope
- `collect_files()` recurses directories finding `.md` files, or accepts individual paths
- File reading uses `Bun.file(path).text()` (Bun-native, fast)
- Directory traversal uses `node:fs/promises` (readdir with recursive option)

## Not Yet Implemented

- `--fix` / `--fix-dry-run` (auto-fix capability)
- `--stdin` (pipe support)
- `--config` (custom config file)
- SARIF output format
- Inline disable comments (`<!-- mlint-disable -->`)
- Per-directory config overrides
