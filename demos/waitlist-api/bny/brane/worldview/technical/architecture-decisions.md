# Architecture Decisions
Key technical choices made during implementation and their rationale.

## Hono over Express/Fastify
Hono is Bun-native, lightweight, and has middleware patterns similar to Express but with better TypeScript support. No adapter layer needed. The `app.route()` pattern for mounting sub-routers keeps route files self-contained.

## SQLite over Postgres for MVP
`bun:sqlite` is zero-config and built into the runtime. WAL mode handles concurrent reads well. The main limitation is write concurrency under heavy burst traffic — position calculation is a COUNT query that scans the index, which is fine at MVP scale (< 100K entries) but becomes a bottleneck beyond that. The natural upgrade path is Postgres with the same schema.

## Derived Position over Stored Position
Position is computed on every query via `COUNT(*) + 1` rather than stored as a column. This avoids rewriting every entry's position on each new signup (O(n) writes per insert). The tradeoff is that position checks are O(log n) reads with the composite index, which is acceptable up to ~100K entries per waitlist.

## JSON Settings Column
Waitlist settings (webhook_url, referral_reward, queue_strategy) are stored as a JSON blob rather than normalized columns. This provides schema flexibility for adding new settings without migrations. The downside is no SQL-level validation or indexing on settings fields.

## Single-Tenant Auth for MVP
A single API key via environment variable (`API_KEY`). Admin endpoints check `Authorization: Bearer <key>`. Public endpoints have no auth — the waitlist ID acts as a capability token. This is sufficient for single-founder use but needs multi-tenant key management for a real SaaS offering.

## No ORM
Raw SQL queries via `bun:sqlite`'s prepared statements. Results are cast to `any` for pragmatism. This keeps the dependency surface minimal and SQL visible, but sacrifices type safety on query results.

## Event Sourcing Lite
Every state change (signup, referral, promotion, cancellation) creates an Event record. This provides an audit trail and webhook delivery tracking without full event sourcing complexity. Events are append-only; the `entries` table is the materialized view.
