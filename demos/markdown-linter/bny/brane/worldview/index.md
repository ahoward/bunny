# Knowledge Base Index

## Project
- [Project Overview](project/overview.md) — CLI tool for static analysis of markdown files
- [Competitive Landscape](competitive/landscape.md) — markdownlint, remark-lint, mdformat, Vale; differentiation via speed, zero-config, auto-fix

## Design
- [AST Parsing](design/ast-parsing.md) — remark-parse as stateless singleton, CommonMark baseline, mdast position tracking
- [Rule Architecture](design/rule-architecture.md) — POD objects with discriminated union (`line` | `ast`), no classes or visitors
- [Rule Catalog](design/rule-catalog.md) — structural, whitespace, link, code, list, content, and meta rule categories
- [Diagnostic Format](design/diagnostic-format.md) — `file:line:col: severity [rule] message`, 1-indexed, future JSON/SARIF formatters

## Implementation
- [Lint Engine](implementation/lint-engine-pattern.md) — parse → lint → sort → format pipeline, fault isolation per rule, exit codes 0/1/2
- [Rule Pattern](implementation/rule-pattern.md) — POD `{ name, kind, check }` objects, line rules dominate (3 of 4 MVP)
- [Testing Patterns](implementation/testing-patterns.md) — inline content strings, `check()` wrapper, CLI integration via `Bun.spawnSync()`

## Philosophy & Constraints
- [Unix Philosophy](philosophy/unix-philosophy.md) — composability, silent on success, Bun's fast startup advantage
- [Scope Creep Risks](concerns/scope-creep.md) — MVP = structural + whitespace rules only, no network I/O or prose analysis
- [Testing Strategy](concerns/testing-strategy.md) — rule units, parser fidelity, integration, snapshots, antagonistic review

## Conventions
- **Data**: Plain Old Data only — no classes
- **Naming**: `snake_case` functions/vars, `PascalCase` types
- **Null**: `null` over `undefined`
- **Testing**: Antagonistic — Claude designs, Gemini reviews, then implement
