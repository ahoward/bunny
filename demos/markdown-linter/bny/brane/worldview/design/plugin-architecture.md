# Plugin Architecture
Should the linter support custom rules, and if so, how?

## Arguments For Plugins

- Organizations have house style rules
- Domain-specific markdown (API docs, changelogs) has unique patterns
- Community can extend without forking

## Arguments Against Plugins

- Adds complexity to the core
- Plugin quality varies wildly
- Version compatibility becomes a burden
- "Just fork it" works for most cases

## Middle Ground: Rule Files

Instead of a full plugin API, support declarative rule definitions:

```json
{
  "custom-rules": [
    {
      "id": "no-todo-comments",
      "pattern": "TODO|FIXME|HACK",
      "message": "Resolve TODO comments before publishing",
      "severity": "warning"
    }
  ]
}
```

This covers 80% of custom rule needs without the complexity of a plugin runtime. Power users who need AST access can contribute to core.
