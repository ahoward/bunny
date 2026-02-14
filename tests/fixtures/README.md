# Test Fixtures

Deterministic test inputs for bunny handlers.

## Convention

- One directory per handler: `fixtures/ping/`, `fixtures/health/`
- Each directory contains JSON files: `input.json`, `expected.json`
- File names use snake_case
- All data is POD — JSON-serializable
- Fixtures MUST be deterministic — no timestamps, random values, or PIDs
- Use `null` for absent values, never `undefined`

## Usage

```typescript
const input = await Bun.file("tests/fixtures/ping/input.json").json()
const result = await app.call("/ping", input)
```
