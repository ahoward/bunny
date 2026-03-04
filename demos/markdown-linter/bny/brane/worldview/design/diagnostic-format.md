# Diagnostic Output Format
Standard `file:line:col: severity [rule] message` format matching industry conventions.

## Implemented Format

```
path/to/file.md:3:1: warning [trailing-whitespace] Trailing whitespace
```

This matches the output style of eslint, clang, and rustc — enabling editor integration and shell piping without custom parsers.

## Diagnostic Shape (POD)

```typescript
type Diagnostic = {
  file: string
  line: number       // 1-indexed
  column: number     // 1-indexed
  severity: 'error' | 'warning' | 'info'
  rule: string
  message: string
}
```

Note: `fix` field from early design was deferred (auto-fix is not MVP).

## Indexing Convention
Line and column are **1-indexed** to match editor display. Internally, rules work with 0-indexed arrays but add 1 when creating diagnostics.

## Output Routing
- Diagnostics → stdout
- Errors (missing files, etc.) → stderr
- Silent on success (no output when clean)

## Future Formatters (Not Yet Implemented)
- **json** — array of diagnostics
- **sarif** — GitHub Code Scanning compatible
- **compact** — one-line-per-issue (already the default effectively)
