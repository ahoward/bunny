# Testing Patterns
Black-box rule tests with inline content strings, plus end-to-end CLI tests using spawnSync.

## Rule Unit Tests

Each rule gets a minimal test wrapper that hides context construction:

```typescript
const check = (content: string) =>
  rule.check({ file: "test.md", lines: content.split("\n"), content })
```

Tests then focus purely on inputs and outputs:
- Pass markdown content as a string
- Assert diagnostic count, line, column, rule name
- No internal implementation details tested

## Edge Cases Worth Testing

- Empty files → no diagnostics
- Files with only whitespace
- Tab characters (treated same as spaces for trailing whitespace)
- Multiple violations on different lines → all reported
- Rule crash → produces error diagnostic, doesn't abort

## CLI Integration Tests

End-to-end tests use `Bun.spawnSync()` to invoke the actual CLI binary:
- Write temporary fixture files
- Run CLI with fixture paths
- Assert exit code, stdout content, stderr content
- Clean up fixtures after each test

This validates the full pipeline: file I/O → parse → lint → format → exit code.

## What Worked

- Inline content strings (no separate fixture files for unit tests) kept tests readable and self-contained
- The `check()` wrapper pattern made rule tests extremely concise
- Testing exit codes caught integration bugs that unit tests missed
