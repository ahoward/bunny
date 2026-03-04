# Knowledge Base Index

## Project: Markdown Linter CLI

A Bun/TypeScript CLI for static analysis of markdown documents — catching formatting, structural, and style issues.

### Project

- **[Overview](project/overview.md)** — Purpose, input/output model, core concept
- **[CLI Interface Design](project/cli-interface-design.md)** — Invocation patterns, output formats (human/json/compact), exit codes
- **[Parser Strategy](project/parser-strategy.md)** — Hybrid line-by-line tokenizer with stateful tracking; no external deps
- **[Rule Taxonomy](project/rule-taxonomy.md)** — 8 v1 rules: 3 structural (error), 4 formatting + 1 style (warning)
- **[Auto-Fix](project/auto-fix.md)** — Fixable vs unfixable classification, `--fix` strategy, idempotency

### Design

- **[Error Messages](design/error-messages.md)** — Anatomy of good lint messages: location, severity, rule ID, suggestion, docs link
- **[Plugin Architecture](design/plugin-architecture.md)** — Declarative rule files over full plugin API for the 80% case

### Patterns

- **[Hybrid Tokenizer](patterns/hybrid-tokenizer.md)** — Line-by-line regex + state machine emitting Block POD objects
- **[Rule-as-POD](patterns/rule-as-pod.md)** — Rules are plain data with embedded check functions; no classes or registration
- **[Pipeline Architecture](patterns/pipeline-architecture.md)** — Linear flow: CLI → Linter → Tokenizer → Rules → Formatter → Exit code

### Landscape

- **[Existing Tools](landscape/existing-tools.md)** — markdownlint, remark-lint, mdl; gaps in speed, Bun-native support, opinionated defaults

### Concerns

- **[Edge Cases](concerns/edge-cases.md)** — Spec ambiguity, code block awareness, front matter, HTML, unicode, large files
