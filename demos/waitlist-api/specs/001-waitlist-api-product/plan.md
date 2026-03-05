# Implementation Plan: 001-waitlist-api-product

**Date**: 2026-03-05
**Spec**: specs/001-waitlist-api-product/spec.md

# Implementation Plan: Waitlist API for Product Launches

**Feature Branch:** `001-waitlist-api-product`
**Date:** 2026-03-05

---

## 1. Summary

Build an API-first waitlist service for pre-launch SaaS founders. Core capabilities: signup management (email + name), referral tracking with unique codes, score-based queue position, batch promotion, and webhook notifications. The API is implemented as a Bun + TypeScript HTTP server using Hono for routing, SQLite (via `bun:sqlite`) for storage, and `bun:test` for testing. All data is POD — no classes for data containers.

---

## 2. Technical Context

| Concern | Choice |
|---------|--------|
| Runtime | Bun (latest) |
| Language | TypeScript, strict mode |
| HTTP framework | Hono (`hono`) — lightweight, Bun-native |
| Database | SQLite via `bun:sqlite` — zero-config, sufficient for MVP; atomic writes via WAL mode |
| Testing | `bun:test` — built-in, zero-dep |
| Naming | snake_case for files, variables, functions; PascalCase for types |
| Data style | POD only — interfaces/type aliases, functions transform POD to POD |
| Null semantics | `null` over `undefined` for explicit absence |

**Dependencies requiring human approval** (per `guardrails.json`):
- `hono` — HTTP routing framework
- No other runtime deps. `bun:sqlite` and `bun:test` are built-in.

---

## 3. Project Structure

waitlist-api/
  package.json
  tsconfig.json
  src/
    app.ts                    # Hono app factory (no listen — exported for testing)
    server.ts                 # entry point: imports app, calls serve()
    db.ts                     # SQLite connection, schema init, WAL mode
    schema.sql                # DDL as a raw string constant
    types.ts                  # POD types: Waitlist, Entry, Event, Settings
    result.ts                 # Result<T> envelope type
    middleware/
      auth.ts                 # API key validation middleware for admin routes
      cors.ts                 # CORS headers for public endpoints
      rate_limit.ts           # IP-based rate limiting (in-memory Map + sliding window)
    routes/
      waitlists.ts            # POST /waitlists, GET /waitlists/:id, PUT /waitlists/:id/settings
      entries.ts              # POST /waitlists/:id/entries, DELETE, GET by email
      position.ts             # GET /waitlists/:id/entries/:id/position
      referrals.ts            # GET /waitlists/:id/entries/:id/referrals
      promote.ts              # POST /waitlists/:id/promote
    lib/
      referral_code.ts        # generate unique 8-char alphanumeric codes
      score.ts                # score calculation: base_score + referral_bonus (with epoch scaling)
      email.ts                # normalize (trim, lowercase), validate format, length check
      ip_hash.ts              # SHA-256 hash of IP address
      webhook.ts              # async webhook dispatcher with retry + exponential backoff
      webhook_queue.ts        # in-process async queue for webhook delivery
  tests/
    helpers.ts                # test app factory, test DB setup/teardown
    waitlists.test.ts         # US-001, US-008, US-010
    entries.test.ts           # US-002, US-009, US-011, EC-001..EC-007
    position.test.ts          # US-003, EC-006..EC-007 (tie-breaker)
    referrals.test.ts         # US-004, US-005, EC-008..EC-012
    promote.test.ts           # US-006, US-007, EC-013..EC-015
    rate_limit.test.ts        # EC-016, EC-017
    webhook.test.ts           # US-007 retry behavior, EC-015
    score.test.ts             # score math, epoch scaling (challenge item #8)
  dev/
    setup                     # updated: bun install
    test                      # updated: bun test


---

## 4. Implementation Phases

### Phase 1: Project Scaffolding

**Deliverables:** `package.json`, `tsconfig.json`, updated `dev/setup` and `dev/test`, empty app that starts.

**Steps:**
1. Create `package.json` with `hono` dependency, `"type": "module"`, scripts for `dev` and `test`.
2. Create `tsconfig.json` — `strict: true`, `target: "esnext"`, `module: "esnext"`, `types: ["bun-types"]`.
3. Update `dev/setup` to run `bun install` and configure git hooks.
4. Update `dev/test` to run `bun test`.
5. Create `src/types.ts` — POD interfaces: `Waitlist`, `Entry`, `Event`, `WaitlistSettings`, `ReferralReward`.
6. Create `src/result.ts` — `Result<T> = { ok: true, data: T } | { ok: false, error: string, status: number }`.
7. Create `src/db.ts` — `open_db(path?: string): Database` function. Enables WAL mode, creates tables via `schema.sql`.
8. Create `src/schema.sql` (as exported string constant in `db.ts`) — DDL for `waitlists`, `entries`, `events` tables with all indexes.
9. Create `src/app.ts` — Hono app with placeholder routes, CORS middleware on public routes.
10. Create `src/server.ts` — `Bun.serve({ fetch: app.fetch, port })`.

**Key DDL decisions addressing challenge items:**
- `entries` table: `score REAL` (not integer) for epoch-scaled values.
- Unique index on `(waitlist_id, email)`.
- Unique index on `referral_code`.
- Composite index on `(waitlist_id, status, score DESC, created_at ASC)` — the `created_at` is the tie-breaker (challenge #6).
- Position query: `COUNT(*) + 1 WHERE waitlist_id = ? AND status = 'waiting' AND (score > ? OR (score = ? AND created_at < ?))` — breaks ties by signup order.

### Phase 2: Core Library Functions

**Deliverables:** Pure functions for email, referral codes, scoring, IP hashing, webhook dispatch.

**Steps:**
1. `src/lib/email.ts`
   - `normalize_email(raw: string): string` — trim, lowercase.
   - `validate_email(email: string): string | null` — returns error string or null. Checks format (regex), length <= 254, non-empty.

2. `src/lib/referral_code.ts`
   - `generate_referral_code(): string` — 8-char alphanumeric using `crypto.getRandomValues`. Retry on collision (checked at insert time via unique constraint).

3. `src/lib/score.ts`
   - `EPOCH_SCALE = 1000` — 1 referral point = 1000 seconds of queue advantage (addresses challenge #8).
   - `base_score(created_at: Date): number` — `MAX_TS - unix_seconds(created_at)` where `MAX_TS` is a far-future constant.
   - `compute_score(base: number, referral_count: number, reward_amount: number): number` — `base + (referral_count * reward_amount * EPOCH_SCALE)`.

4. `src/lib/ip_hash.ts`
   - `hash_ip(ip: string): string` — SHA-256 hex digest via `Bun.CryptoHasher`.

5. `src/lib/webhook.ts`
   - `dispatch_webhook(url: string, payload: object, secret: string): Promise<boolean>` — POST with JSON body, `X-Webhook-Signature` header (HMAC-SHA256 of body using secret — addresses challenge #2). Timeout 10s.

6. `src/lib/webhook_queue.ts`
   - In-process async queue. `enqueue(event_id: string, url: string, payload: object, secret: string): void`.
   - Processes sequentially with retry (3 attempts, exponential backoff: 1s, 4s, 16s).
   - Updates `events.webhook_status` and `events.attempts` in DB.

### Phase 3: Middleware

**Deliverables:** Auth, CORS, rate limiting middleware.

1. `src/middleware/auth.ts`
   - Reads `Authorization: Bearer <key>` header.
   - For MVP: API key is a config value (env var `API_KEY`). Single-tenant.
   - Returns 401 if missing/invalid.

2. `src/middleware/cors.ts`
   - Sets `Access-Control-Allow-Origin: *`, appropriate headers for public routes.
   - Handles preflight OPTIONS.

3. `src/middleware/rate_limit.ts`
   - In-memory sliding window per IP.
   - Configurable: `create_rate_limiter(max_requests: number, window_ms: number)`.
   - Returns 429 with `Retry-After` header when exceeded.

### Phase 4: Route Handlers — Waitlist CRUD (Admin)

**Deliverables:** `POST /waitlists`, `GET /waitlists/:id`, `PUT /waitlists/:id/settings`.

`src/routes/waitlists.ts`:
- `POST /waitlists` — validate `name` (required, max 100 chars). Generate UUID. Insert with default settings `{ webhook_url: null, webhook_secret: null, referral_reward: { type: "position_bump", amount: 5 }, queue_strategy: "score" }`. Return 201.
- `GET /waitlists/:id` — return waitlist + stats (`waiting`, `promoted`, `cancelled` counts via `GROUP BY status`). 404 if not found.
- `PUT /waitlists/:id/settings` — merge provided settings into existing. Validate `webhook_url` against SSRF allowlist (reject private IPs, link-local, metadata endpoints — addresses challenge #1). Return 200.

### Phase 5: Route Handlers — Entry Signup (Public)

**Deliverables:** `POST /waitlists/:id/entries`, `DELETE /waitlists/:id/entries/:id`, `GET /waitlists/:id/entries?email=`.

`src/routes/entries.ts`:
- `POST /waitlists/:id/entries`:
  1. Validate waitlist exists (404).
  2. Validate/normalize email (422 on invalid/missing/too-long).
  3. Validate name length (max 200, truncate or 422).
  4. Reject body > 64KB (413 — handled at app level).
  5. Generate referral code.
  6. Compute base score.
  7. If `referral_code` provided: look up referrer in same waitlist, with status != `cancelled`. If found, set `referred_by`. If not found (invalid, wrong waitlist, cancelled, self-referral), silently ignore.
  8. Insert entry (unique constraint catches concurrent duplicates → 409).
  9. If referrer found: atomic score update via `UPDATE entries SET score = score + ? WHERE id = ?` (addresses challenge #10 — no read-modify-write).
  10. Log `signup` event. If webhook configured for signups, enqueue.
  11. Compute position. Return 201 with `{ entry_id, referral_code, position, total }`.

- `DELETE /waitlists/:id/entries/:id` (admin):
  1. Set status to `cancelled`. Idempotent.
  2. Log `cancellation` event.
  3. For GDPR hard-delete (addresses challenge #3): accept `?purge=true` query param. When set, nullify `email`, `name`, `ip_hash` in addition to cancelling. This gives founders a way to truly erase PII.

- `GET /waitlists/:id/entries?email=` (admin):
  1. Normalize email, look up by `(waitlist_id, email)`. 404 if not found.

### Phase 6: Route Handlers — Position & Referrals (Public)

**Deliverables:** Position check, referral stats endpoints.

`src/routes/position.ts`:
- `GET /waitlists/:wid/entries/:eid/position`:
  1. Load entry (404 if missing).
  2. If `status = promoted`: return `{ position: null, total, status: "promoted" }`.
  3. If `status = cancelled`: return 404.
  4. Position query with tie-breaker: `SELECT COUNT(*) + 1 FROM entries WHERE waitlist_id = ? AND status = 'waiting' AND (score > ? OR (score = ? AND created_at < ?))`.
  5. Total: `SELECT COUNT(*) FROM entries WHERE waitlist_id = ? AND status = 'waiting'`.
  6. Return `{ position, total, status: "waiting" }`.

`src/routes/referrals.ts`:
- `GET /waitlists/:wid/entries/:eid/referrals`:
  1. Load entry (404 if missing).
  2. `SELECT name, created_at FROM entries WHERE referred_by = ? ORDER BY created_at`.
  3. Return `{ count, entries: [{ name, created_at }] }`.

### Phase 7: Route Handlers — Promotion (Admin)

**Deliverables:** Batch promote endpoint with webhook dispatch.

`src/routes/promote.ts`:
- `POST /waitlists/:id/promote`:
  1. Validate `count` (required, integer, > 0, max 1000 — addresses challenge #5). 422 otherwise.
  2. In a transaction:
     - `SELECT id, email, name FROM entries WHERE waitlist_id = ? AND status = 'waiting' ORDER BY score DESC, created_at ASC LIMIT ?`.
     - `UPDATE entries SET status = 'promoted', promoted_at = ? WHERE id IN (...)`.
     - Insert `promotion` events for each.
  3. If webhook URL configured: enqueue each promotion event.
  4. Return 200 with `{ promoted: [...entries], count: N }`.

### Phase 8: Webhook HMAC Signing

**Deliverables:** Webhook payloads include `X-Webhook-Signature` header.

- On waitlist creation, generate a `webhook_secret` (32-byte random hex).
- Expose `webhook_secret` in `GET /waitlists/:id` response (admin only) so founders can verify.
- `dispatch_webhook` computes `HMAC-SHA256(body, secret)` and sends as `X-Webhook-Signature` header.

### Phase 9: Integration Wiring

**Deliverables:** All routes mounted in `app.ts`, middleware applied.

`src/app.ts`:
typescript
// Public routes — CORS + rate limiting
app.use("/waitlists/:id/entries", cors())
app.use("/waitlists/:id/entries", rate_limit(100, 60_000))  // 100/min signup
app.use("/waitlists/*/entries/*/position", rate_limit(60, 60_000))  // 60/min position

// Admin routes — auth middleware
app.use("/waitlists", auth())  // POST /waitlists
app.use("/waitlists/:id/promote", auth())
app.use("/waitlists/:id/settings", auth())


Mount all route modules. Add global error handler for malformed JSON (400), payload size (413).

### Phase 10: Tests

**Deliverables:** Full test suite covering all user scenarios, edge cases, and challenge items.

Tests use `bun:test`. Each test file creates a fresh in-memory SQLite DB via `open_db(":memory:")` and a test Hono app instance.

`tests/helpers.ts`:
- `create_test_app(): { app, db }` — fresh DB + app wired together.
- `api_key` constant for auth headers.

Test files map directly to user scenarios:
- `tests/waitlists.test.ts` — US-001, US-008, US-010
- `tests/entries.test.ts` — US-002, US-009, US-011, EC-001 through EC-007
- `tests/position.test.ts` — US-003, tie-breaker (challenge #6)
- `tests/referrals.test.ts` — US-004, US-005, EC-008 through EC-012
- `tests/promote.test.ts` — US-006, EC-013, EC-014, promotion cap (challenge #5)
- `tests/webhook.test.ts` — US-007, HMAC verification (challenge #2), retry behavior
- `tests/rate_limit.test.ts` — EC-016, EC-017
- `tests/score.test.ts` — epoch scaling math (challenge #8), score update atomicity

---

## 5. Dependencies & Execution Order

Phase 1: Scaffolding
  |
  v
Phase 2: Core Libs ──────────────────> Phase 3: Middleware
  |                                        |
  v                                        v
Phase 4: Waitlist CRUD (admin) ───────> Phase 9: Integration Wiring
  |                                        ^
  v                                        |
Phase 5: Entry Signup (public) ────────┤
  |                                    |
  v                                    |
Phase 6: Position & Referrals ─────────┤
  |                                    |
  v                                    |
Phase 7: Promotion ────────────────────┤
  |                                    |
  v                                    |
Phase 8: Webhook HMAC ─────────────────┘
  |
  v
Phase 10: Tests (written BEFORE implementation per antagonistic testing protocol)


**Parallel opportunities:**
- Phase 2 (libs) and Phase 3 (middleware) are independent after Phase 1.
- Phases 4, 5, 6, 7 can be developed in parallel once Phase 2 is done (they share lib functions but not each other's routes).
- Phase 8 depends on Phase 7 (promotion webhooks) and Phase 4 (webhook secret in settings).

**Per the antagonistic testing protocol:** Tests (Phase 10) are designed first by Claude, reviewed by Gemini, locked, then implementation follows. The phase numbering above reflects logical dependency, not chronological order of authorship.

**Guardrail compliance:**
- `hono` is the only new runtime dependency — requires human approval.
- Total new files: ~20 (at the 20-file guardrail cap).
- Lines of code target: ~450 implementation + tests (within 500-line guardrail if split across PRs, or requires approval for a single PR).
