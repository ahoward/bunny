# Pipeline Architecture
A clean linear pipeline (parse → check → format → exit) keeps each stage testable in isolation.

## The Pipeline

```
CLI (files)  →  Linter (content)  →  Tokenizer (blocks)
                                  →  Rules (messages)
                                  →  Formatter (output)
                                  →  Exit code
```

## Module Responsibilities

| Module | Input | Output | Lines |
|--------|-------|--------|-------|
| tokenizer | string | Block[] | ~150 |
| rules | Block[], string[] | LintMessage[] | ~220 |
| linter | string, filename | LintResult | ~40 |
| formatter | LintResult[] | string | ~55 |
| cli | argv | exit code | ~95 |

## Key Design Decisions

- **Linter is thin**: ~40 lines. It only wires tokenizer to rules and sorts results. Business logic lives in rules.
- **Formatter is separate from linter**: Linting produces data (LintResult), formatting produces text. Different concerns, different modules.
- **CLI owns I/O**: Only cli.ts reads files or writes to stdout. Everything else is pure functions on data.
- **Exit codes encode severity**: 0=clean, 1=warnings, 2=errors, 3=fatal. CI can gate on specific codes.

## Testing Implications

- Tokenizer tests: string → Block[] (unit)
- Rule tests: use `lint_content()` as integration helper, filter by rule_id (focused integration)
- CLI tests: test `parse_args()` and formatters with POD sample data (no filesystem needed)
- 42 tests for ~560 lines of source — high coverage with minimal test infrastructure
