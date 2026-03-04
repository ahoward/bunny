# Rule-as-POD Pattern
Lint rules are plain data objects with an embedded check function — no classes, no inheritance, no registration ceremony.

## Structure

```typescript
type Rule = {
  id: string
  description: string
  severity: Severity
  check: (blocks: Block[], lines: string[], file: string) => LintMessage[]
}
```

## Why This Works

- Adding a rule = adding one object to an array. No subclassing, no decorator, no config file.
- `get_all_rules()` returns the full array. The linter iterates it. That's the entire plugin system.
- Rules choose their own abstraction level: structural rules use `blocks`, formatting rules use `lines`, some use both.
- The `file` parameter enables location-aware messages without rules needing I/O access.

## Scaling Considerations

- At 8 rules, a flat array is fine. At 50+, consider categorization (structural, formatting, style, semantic) for selective enabling.
- The declarative rule file idea from the design phase (regex pattern + message) could layer on top without changing the core `Rule` type — just generate `Rule` objects from config.
- Rule ordering doesn't matter because messages are sorted by location after collection.
