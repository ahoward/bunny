# Plan: REST API Serves FizzBuzz

## Architecture

```
src/
  fizzbuzz.ts      # pure fizzbuzz logic
  server.ts        # Bun.serve HTTP server + routing
  validate.ts      # input validation helpers
tests/
  fizzbuzz.test.ts # unit tests for fizzbuzz logic
  server.test.ts   # API-level integration tests
```

## Steps

1. Initialize Bun project (package.json, tsconfig.json)
2. Implement `fizzbuzz(n)` — pure function, no I/O
3. Implement input validation — `parse_positive_int(s)`
4. Implement HTTP server with routes: `/fizzbuzz/:number`, `/fizzbuzz?from=&to=`, `/health`
5. Write unit tests for fizzbuzz logic
6. Write integration tests for HTTP endpoints
7. Wire up `dev/test` to run `bun test`
