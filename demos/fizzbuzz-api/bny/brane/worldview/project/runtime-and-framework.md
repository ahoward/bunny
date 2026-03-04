# Runtime and Framework
Technology choices for hosting a compute-only HTTP service.

## Runtime Options

- **Bun** — fast startup, native TypeScript, built-in HTTP server
- **Node + Express/Fastify** — mature ecosystem, well-understood
- **Deno** — secure by default, native TypeScript

## Why This Matters for FizzBuzz

FizzBuzz is pure computation — no I/O, no database, no file system. This makes it an ideal case for:
- Benchmarking raw request throughput
- Testing framework overhead in isolation
- Exploring minimal-dependency HTTP servers

## Deployment Considerations

- Serverless (Lambda, Cloudflare Workers) — cold start matters, fizzbuzz is instant
- Container — overkill but standard
- Edge functions — fizzbuzz at the edge is amusingly fast

## The Minimalism Question

Does this project even need a framework? A raw `Bun.serve()` or `http.createServer()` with a router might be all that's needed.
