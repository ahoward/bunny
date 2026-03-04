# Tasks: CLI Lints Markdown

- [x] Scaffold project (package.json, tsconfig.json, directory structure)
- [x] Define core POD types (LintMessage, LintResult, Block, Rule, CliOptions)
- [x] Write tests for tokenizer, rules, and CLI (42 tests)
- [x] Implement markdown tokenizer (hybrid: block-level structure with regex)
- [x] Implement lint rules: no-heading-skip, single-h1, no-trailing-whitespace, no-hard-tabs, no-consecutive-blank-lines, fenced-code-language, no-unclosed-fence, final-newline
- [x] Implement linter (orchestrates tokenizer + rules)
- [x] Implement formatter (human, json, compact output formats)
- [x] Implement CLI (arg parsing, file collection, exit codes)
- [x] Update dev scripts (test → bun test, setup → bun install)
- [x] Run post_flight — all green
