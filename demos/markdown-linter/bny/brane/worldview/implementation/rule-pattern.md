# Rule Implementation Pattern
Rules are POD objects with a discriminated union on `kind`, not classes or visitors.

## The Pattern

Each rule is a plain object: `{ name, kind, check }`. The `kind` field discriminates between two rule contexts:

| Kind | Context | Best For |
|------|---------|----------|
| `line` | Raw text lines + full content string | Whitespace, formatting, line-level checks |
| `ast` | Parsed MDAST tree + full content string | Structural checks (heading hierarchy, nesting) |

## Why This Works

- **No inheritance** — rules don't extend a base class, they satisfy a type
- **Testable in isolation** — `rule.check(context)` is a pure function call
- **Fault-isolated** — the lint engine wraps each `check()` in try/catch, converting crashes into error diagnostics rather than aborting
- **Composable** — rules are array elements, trivially filtered/reordered

## Adding a New Rule

1. Create `src/rules/my_rule.ts` exporting a `Rule` object
2. Add to `all_rules` array in `src/rules/index.ts`
3. Write tests using the minimal wrapper pattern:
   ```typescript
   const check = (content: string) =>
     rule.check({ file: "test.md", lines: content.split("\n"), content })
   ```

## Observation: Line Rules Dominate

3 of 4 MVP rules are line-based. AST rules are only needed for cross-node structural checks (heading hierarchy). Default to line rules unless the check requires tree context — they're simpler, faster, and easier to test.
