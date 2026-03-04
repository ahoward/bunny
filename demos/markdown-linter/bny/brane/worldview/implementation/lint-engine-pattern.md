# Lint Engine Pattern
A linear orchestrator that separates parsing, checking, and formatting into independent phases.

## Pipeline

```
Parse (string → AST) → Lint (rules × context → diagnostics[]) → Sort → Format → Output
```

## Key Decisions

### Dual Context
The engine prepares both raw lines and parsed AST upfront, then passes the appropriate context based on `rule.kind`. This avoids re-parsing but means every file gets fully parsed even if only line rules are active. Acceptable trade-off for simplicity.

### Fault Isolation
Each rule's `check()` is wrapped in try/catch. A crashing rule produces an error diagnostic (severity: `error`, message: `Rule crashed: ...`) instead of aborting the entire lint run. This is critical for extensibility — a broken custom rule shouldn't silence all other diagnostics.

### Deterministic Output
Diagnostics are sorted by `(line, column)` before formatting. This makes output stable across runs and rule ordering changes, which matters for snapshot tests and CI diffs.

### Continue on File Error
The CLI processes all files even if some are unreadable. Errors produce stderr messages and set exit code 2, but don't stop processing remaining files.

## Exit Code Convention

| Code | Meaning |
|------|---------|
| 0 | All files clean |
| 1 | Lint issues found |
| 2 | Tool error (missing file, read failure) |
