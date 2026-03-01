# Worldview Index

## Patterns

- **[Bun API Scaffold](patterns/bun-api-scaffold.md)** — Handler registry (`app.call`), Result envelope (`ok`/`err`), filesystem JSON store, guard-early validation, and test structure for minimal Bun JSON APIs
- **[POD Types](patterns/pod-types.md)** — Plain Old Data convention: `type` over `class`, `null` over `undefined`, standalone functions over methods, Result\<T\> envelope shape

## Risks

- **[Prototype Limits](risks/prototype-limits.md)** — Known tradeoffs: last-write-wins file store, no auth, no rate limiting. Mitigation paths noted (SQLite, etc.)
