# CLI as Thin Presentation Layer

The CLI entry point (e.g., `bin/tldr`) does zero business logic. It is purely:

1. **Parse argv** — extract arguments from `process.argv.slice(2)`
2. **Detect input mode** — auto-detect URL, file path, stdin, or usage
3. **Dispatch** — call `app.call("/handler", { params })`
4. **Format output** — success: print result to stdout; error: print messages to stderr
5. **Set exit code** — 0 for success, 1 for error

## Separation of Concerns

| Layer | Knows About | Doesn't Know About |
|-------|------------|--------------------||
| Handler | Business logic, validation, API calls | CLI args, exit codes, formatting, input detection |
| CLI | argv parsing, stdout/stderr, exit codes, input mode detection | Validation rules, API details |

## Input Mode Detection

The CLI determines which handler param to populate based on argument shape and stdin state:

```
arg starts with http(s):// → { url: arg }
arg is "-" or (no args + !isTTY) → read stdin → { content: text }
arg is present → { file_path: arg }
no args + isTTY → print usage, exit 1
```

This keeps the handler unaware of how input was provided — it receives typed params and validates them uniformly.

## Error Formatting

The CLI iterates the hierarchical error map and formats for humans:
```
tldr: file_path is required
tldr: file not found: /path/to/missing.txt
```

The handler returns structured data; the CLI decides how to present it.

## Why This Matters

- Same handler works in tests (no CLI overhead)
- Same handler works behind HTTP (different presentation layer)
- Testing the handler doesn't require spawning a subprocess
- Input detection logic is testable separately from validation logic
