# Tech Stack Considerations
Bun's native HTTP server and test runner provide a zero-dependency foundation for lightweight APIs.

## Runtime: Bun
- Native `Bun.serve()` — no Express/Hono dependency needed for something this simple
- Built-in test runner (`bun test`) — no Jest/Vitest needed
- Fast startup, low memory — good for a lightweight service
- `import.meta.main` allows modules to serve as both library and entrypoint

## Framework vs Raw — Confirmed

Raw `Bun.serve()` with regex routing works well for <10 routes. The implementation confirmed:
- Manual `URL` parsing is straightforward
- `url.searchParams` handles query params cleanly
- No middleware needed for a stateless computation API
- The breakpoint for needing a framework is route count + middleware needs, not complexity

## Testing with Bun

- `bun test` runs all `*.test.ts` files with zero config
- Port `0` for test servers lets the OS assign random ports (parallel-safe)
- `beforeAll`/`afterAll` for server lifecycle
- `server.stop()` for cleanup

## Deployment
- Single binary with `bun build --compile`
- Docker: `oven/bun` base image, tiny container
- Edge: Cloudflare Workers (Bun-compatible), fly.io
- `process.env.PORT` for environment-based configuration

## No Database
This is pure computation. No state, no persistence, no connection pooling. The simplest possible backend.
