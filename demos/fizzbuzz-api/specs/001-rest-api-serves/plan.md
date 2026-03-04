# Plan: REST API Serves FizzBuzz

## Architecture

```
src/
  fizzbuzz.ts      — pure fizzbuzz function
  server.ts        — Bun.serve() with routing
  validation.ts    — input parsing and validation
  types.ts         — shared POD types
tests/
  fizzbuzz.test.ts — unit tests for core function
  server.test.ts   — integration tests for HTTP layer
```

## Implementation Order

1. **Types** — define Result, ErrorResponse, FizzbuzzResult POD types
2. **Core function** — `fizzbuzz(n: number): string` — pure, no HTTP
3. **Validation** — `parse_positive_int(s: string): number | null`
4. **Server** — `Bun.serve()` with route matching, content-type headers
5. **Dev scripts** — wire up `./dev/test` to `bun test`

## Decisions

- Path params for single (`/fizzbuzz/:n`), query params for range
- Numbers echo back as integers in JSON, results as strings
- Max range size 1000, return 400 beyond that
- No framework — raw `Bun.serve()` with manual URL parsing
- Tests before implementation (per protocol)
