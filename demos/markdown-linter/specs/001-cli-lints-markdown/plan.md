# Plan: CLI Lints Markdown

## Architecture

Hybrid visitor pattern — the engine walks the AST and raw lines, rules declare what they inspect.

Two rule kinds:
1. **AST rules** — receive parsed nodes (e.g., heading-hierarchy)
2. **Line rules** — receive raw text lines (e.g., trailing-whitespace)

## File Structure

```
src/
  types.ts          — Diagnostic, Rule, RuleContext types (POD)
  parse.ts          — markdown string -> mdast AST
  rules/
    trailing_whitespace.ts
    no_multiple_blanks.ts
    heading_hierarchy.ts
    final_newline.ts
    index.ts         — exports all rules
  lint.ts            — run rules against a file, collect diagnostics
  format.ts          — diagnostic -> human-readable string
  cli.ts             — entry point, arg parsing, exit codes
tests/
  rules/
    trailing_whitespace.test.ts
    no_multiple_blanks.test.ts
    heading_hierarchy.test.ts
    final_newline.test.ts
  lint.test.ts
  cli.test.ts
  fixtures/          — .md files for testing
```

## Dependencies

- `remark-parse` + `unified` — markdown -> mdast
- `bun:test` — test runner (no extra dep)

## Approach

1. Set up project (package.json, tsconfig, deps)
2. Define types (Diagnostic, Rule)
3. Implement parser wrapper
4. Implement rules (test-first per constitution)
5. Implement lint engine (walk AST + lines, collect diagnostics)
6. Implement formatter
7. Implement CLI entry point
8. Integration test: CLI invocation with fixtures
