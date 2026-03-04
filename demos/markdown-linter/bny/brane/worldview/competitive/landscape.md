# Competitive Landscape
Understanding existing tools reveals gaps worth filling and mistakes worth avoiding.

## Existing Tools

### markdownlint (David Anson)
- Node.js, mature, widely adopted
- ~50 built-in rules
- VS Code extension with 3M+ installs
- Configuration via `.markdownlint.json`
- Weakness: rule customization is limited, no auto-fix for most rules

### remark-lint
- Part of the unified ecosystem
- Extremely modular (each rule is an npm package)
- Powerful but high setup friction
- Weakness: configuration complexity, slow for large repos

### mdformat
- Python, opinionated formatter (not linter)
- Rewrites markdown to canonical form
- Weakness: not a linter — no diagnostics, just reformatting

### Vale
- Prose linter (grammar, style, terminology)
- Not markdown-specific but supports it
- Weakness: different domain (prose quality vs structural linting)

## Differentiation Opportunities

1. **Speed** — Bun runtime could make this significantly faster than Node alternatives
2. **Zero-config** — Smart defaults that work for 80% of projects
3. **Auto-fix** — Comprehensive fix support, not just detection
4. **Modern markdown** — First-class GFM, MDX, frontmatter support
5. **Integrated** — Works as CLI, CI check, git hook, and editor plugin from day one
