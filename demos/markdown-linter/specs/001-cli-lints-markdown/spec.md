# Feature: CLI Lints Markdown

## Summary

A CLI tool (`mdlint`) that reads markdown files and reports structural and whitespace issues as diagnostics.

## Requirements

1. Accept one or more file paths as CLI arguments
2. Parse each file into a markdown AST (using remark/mdast)
3. Run a set of built-in rules against the AST
4. Output diagnostics to stdout in human-readable format (file:line:col message)
5. Exit code 0 = no issues, 1 = issues found, 2 = tool error

## MVP Rules

- **trailing-whitespace** — no trailing spaces on lines
- **no-multiple-blanks** — collapse consecutive blank lines (max 1)
- **heading-hierarchy** — no skipping heading levels (h1 -> h3)
- **final-newline** — file must end with exactly one newline

## Diagnostic Shape (POD)

```typescript
type Severity = 'error' | 'warning' | 'info'

type Diagnostic = {
  file: string
  line: number
  column: number
  severity: Severity
  rule: string
  message: string
}
```

## Interface

```
mdlint <file...>
```

Diagnostics printed to stdout, one per line:
```
path/to/file.md:3:1: warning [trailing-whitespace] Trailing whitespace
```

## Non-Goals (MVP)

- Auto-fix
- Configuration file
- JSON/SARIF output
- Link checking
- Inline disable directives
