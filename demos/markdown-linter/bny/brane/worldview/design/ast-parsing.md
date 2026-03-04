# AST Parsing Strategy
Using remark-parse (unified/mdast) as a stateless singleton parser for markdown → AST conversion.

## Decision: remark-parse

Chose `remark-parse` + `unified` over markdown-it and custom parser.

### Why remark
- True AST (mdast spec) with position tracking (line/column)
- TypeScript-friendly with `@types/mdast`
- Parser handles edge cases like headings inside code blocks (ignored correctly)
- Minimal API surface: `unified().use(remark_parse).parse(content)`

### Implementation Detail
The parser is a **stateless singleton** — created once at module load, reused for every file. Each `parse_markdown()` call is independent with no shared state.

### The "Why Not remark-lint" Question (Resolved)
Using remark's parser doesn't mean using remark-lint. The differentiation is:
- Custom rule architecture (POD objects, not unified plugins)
- Bun runtime for speed
- Zero-config defaults
- Simpler mental model (no unified pipeline to understand)

## Dependencies

| Package | Version | Purpose |
|---------|---------|--------|
| `unified` | 11.0.5 | AST pipeline framework |
| `remark-parse` | 11.0.0 | Markdown → MDAST |
| `@types/mdast` | 4.0.4 | TypeScript types |

## Dialects
Currently parses CommonMark baseline. GFM, MDX, and frontmatter support would require additional remark plugins (`remark-gfm`, `remark-mdx`, `remark-frontmatter`).
