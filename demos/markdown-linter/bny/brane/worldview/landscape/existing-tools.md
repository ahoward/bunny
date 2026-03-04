# Existing Tools
The markdown linting space is mature — a new tool needs a clear reason to exist.

## markdownlint (Node.js)
- The dominant tool, used by VS Code extension
- 50+ built-in rules, configurable
- Line-based parsing approach
- Pain point: configuration is verbose, some rules conflict

## remark-lint (unified ecosystem)
- Plugin-based, part of the unified/remark ecosystem
- AST-based, very accurate
- Pain point: setup complexity, plugin sprawl

## mdl (Ruby)
- Older, inspired markdownlint
- Less maintained now

## Gaps in the Landscape

- **Speed**: None are optimized for large monorepos (thousands of files)
- **Bun-native**: No linter leverages Bun's fast startup and file I/O
- **Opinionated defaults**: Most require extensive configuration before being useful
- **Fix quality**: Auto-fix support is inconsistent across tools
- **CI-first design**: Most are editor-first, CI is an afterthought
