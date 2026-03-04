# Unix Philosophy Applied
A good CLI linter should compose with other tools, not replace them.

## Principles

- **Do one thing well** — lint markdown structure, not prose quality
- **Text streams as interface** — diagnostics on stdout, errors on stderr
- **Exit codes matter** — 0 = clean, 1 = issues found, 2 = tool error
- **Composable** — pipe output to `wc -l` for counts, `grep` for filtering, `jq` for JSON processing
- **Silent on success** — unless `--verbose` is passed
- **Fast startup** — sub-100ms for small files, no JIT warmup penalty

## Bun Advantage

Bun's fast startup time (~10ms) compared to Node (~50-100ms) is a real advantage for a tool that runs on every commit or keystroke. This is one of the few cases where runtime choice directly affects UX.

## Integration Points

- `git diff --name-only | xargs mdlint` — lint only changed files
- `find . -name '*.md' | mdlint --stdin-paths` — lint from file list
- `mdlint --format json | jq '.[] | select(.severity == "error")'` — filter
- Pre-commit hook: `mdlint $(git diff --cached --name-only -- '*.md')`
