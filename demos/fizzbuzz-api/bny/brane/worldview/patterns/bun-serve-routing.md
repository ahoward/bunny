# Bun.serve() Manual Routing
Regex-based route matching in raw Bun.serve() is sufficient for small APIs and avoids framework dependencies.

## Pattern

```typescript
Bun.serve({
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // exact match
    if (path === "/health") return json_response({ status: "ok" });

    // path param extraction
    const match = path.match(/^\/fizzbuzz\/(.+)$/);
    if (match) return handle_single(match[1]);

    // query param route
    if (path === "/fizzbuzz") return handle_range(url);

    // fallback
    return error_response("NOT_FOUND", "Route not found", 404);
  },
});
```

## Key Decisions

- **Sequential if-chain** over a router map — readable for <10 routes, no abstraction overhead
- **Regex for path params** — `(.+)` captures the raw string; validation happens downstream
- **Query params for ranges** — `URL.searchParams` handles multi-param routes cleanly
- **`import.meta.main` guard** — allows the server module to be both importable (for tests) and directly runnable

## When This Breaks Down

- More than ~10 routes: switch to a lightweight router (Hono)
- Middleware needs (auth, logging, CORS): framework pays for itself
- Path param ambiguity: regex ordering becomes fragile

## Scaling Note

Port `0` lets the OS assign a random port — essential for parallel test runs. Access via `server.port` after creation.
