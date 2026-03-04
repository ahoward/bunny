# Rule Architecture
Rules are POD objects with a discriminated union on `kind` — no classes, no visitor pattern framework.

## Core Questions (Resolved)

- **Are rules pure functions or stateful visitors?** Pure functions. Each rule receives full context and returns diagnostics. No accumulated state across rules.
- **How does rule configuration work?** Not yet — MVP has no configuration. All rules always run with default severity (warning).
- **Can users write custom rules?** Not yet — but the POD pattern makes this trivial to add later.

## Implemented Design: Discriminated Union

Rules declare their `kind` ("line" or "ast") and the engine provides the matching context. This is simpler than the visitor pattern considered in early design.

```typescript
type Rule = LineRule | AstRule

// LineRule.check receives { file, lines, content }
// AstRule.check receives { file, ast, content }
```

### Why Not Visitor Pattern?

The hybrid visitor pattern (ESLint-style) was considered but rejected for MVP. Reasons:
- Only 1 of 4 rules needed AST access
- Line rules are simpler and faster without framework overhead
- The discriminated union is sufficient and requires no traversal framework
- Can evolve toward visitors later if cross-node rules proliferate

## Configuration Layers (Future)

1. **Defaults** — sensible out-of-box rules (implemented)
2. **Project config** — `.mdlintrc` or similar (not yet)
3. **Inline directives** — `<!-- mdlint-disable no-bare-urls -->` (not yet)
4. **CLI flags** — `--rule no-bare-urls:off` (not yet)

## Trade-off: Strictness vs Adoption
All MVP rules default to "warning" severity. No "error" level rules yet. This is deliberately lenient to encourage adoption — users see issues without failing CI by default.
