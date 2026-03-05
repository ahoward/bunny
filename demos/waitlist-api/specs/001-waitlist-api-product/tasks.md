# Tasks: 001-waitlist-api-product

# Task List: Waitlist API for Product Launches

**Feature Branch:** `001-waitlist-api-product`

---

## Phase 1: Setup

- [x] T001 Create `package.json` with `hono` dependency, `"type": "module"`, and scripts for dev/test — `package.json`
- [x] T002 Create `tsconfig.json` with `strict: true`, `target: "esnext"`, `module: "esnext"`, `types: ["bun-types"]` — `tsconfig.json`
- [x] T003 Create `dev/setup` script that runs `bun install` and configures git hooks — `dev/setup`
- [x] T004 Create `dev/test` script that runs `bun test` — `dev/test`
- [x] T005 Run `bun install` to generate lockfile and verify setup — `bun.lockb`

**Checkpoint:** `bun test` runs (zero tests, exit 0). `dev/setup` and `dev/test` are executable.

---

## Phase 2: Foundational — Types, DB, Result Envelope

- [x] T006 [P] Define POD types (`Waitlist`, `Entry`, `Event`, `WaitlistSettings`, `ReferralReward`, status enums) — `src/types.ts`
- [x] T007 [P] Define `Result<T>` envelope type (`{ ok, data } | { ok, error, status }`) — `src/result.ts`
- [x] T008 Create `open_db(path?)` function with WAL mode, schema init from embedded DDL (tables: `waitlists`, `entries`, `events`; indexes: `(waitlist_id, email)` unique, `(waitlist_id, status, score DESC, created_at ASC)`, `(referral_code)` unique, `(referred_by)`) — `src/db.ts`
- [x] T009 Create placeholder Hono app factory exporting `create_app(db)` with health route `GET /health` — `src/app.ts`
- [x] T010 Create server entry point calling `Bun.serve` with app from `src/app.ts` — `src/server.ts`
- [x] T011 Create test helpers: `create_test_app()` returning `{ app, db }` with in-memory SQLite, and `api_key` constant — `tests/helpers.ts`

**Checkpoint:** `bun run src/server.ts` starts and responds to `GET /health`. Test helpers instantiate app with in-memory DB.

---

## Phase 3: Foundational — Core Libraries & Middleware

- [x] T012 [P] Implement `normalize_email(raw)` and `validate_email(email)` (trim, lowercase, regex, length ≤254) — `src/lib/email.ts`
- [x] T013 [P] Implement `generate_referral_code()` (8-char alphanumeric via `crypto.getRandomValues`) — `src/lib/referral_code.ts`
- [x] T014 [P] Implement `base_score(created_at)` and `compute_score(base, referral_count, reward_amount)` with `EPOCH_SCALE = 1000` — `src/lib/score.ts`
- [x] T015 [P] Implement `hash_ip(ip)` using `Bun.CryptoHasher` SHA-256 — `src/lib/ip_hash.ts`
- [x] T016 [P] Implement `dispatch_webhook(url, payload, secret)` with HMAC-SHA256 signature in `X-Webhook-Signature` header, 10s timeout — `src/lib/webhook.ts`
- [x] T017 [P] Implement in-process async webhook queue with 3 retries, exponential backoff (1s, 4s, 16s), DB status updates — `src/lib/webhook_queue.ts`
- [x] T018 [P] Implement auth middleware reading `Authorization: Bearer <key>`, returning 401 on missing/invalid — `src/middleware/auth.ts`
- [x] T019 [P] Implement CORS middleware (`Access-Control-Allow-Origin: *`, preflight OPTIONS handling) — `src/middleware/cors.ts`
- [x] T020 [P] Implement `create_rate_limiter(max_requests, window_ms)` with in-memory sliding window per hashed IP, returning 429 with `Retry-After` — `src/middleware/rate_limit.ts`

**Checkpoint:** All lib functions importable and unit-callable. Middleware functions return valid Hono middleware handlers.

---

## Phase 4: P1 User Stories — Waitlist CRUD (Admin)

- [x] T021 [US1] Implement `POST /waitlists` — validate `name` (required, max 100), generate UUID, insert with default settings (including generated `webhook_secret`), return 201 — `src/routes/waitlists.ts`
- [x] T022 [US8] Implement `GET /waitlists/:id` — return waitlist metadata + stats (`waiting`, `promoted`, `cancelled` counts via `GROUP BY status`), 404 if missing — `src/routes/waitlists.ts`
- [x] T023 [US10] Implement `PUT /waitlists/:id/settings` — merge settings, validate `webhook_url` against SSRF allowlist (reject private IPs, link-local, metadata endpoints), return 200 — `src/routes/waitlists.ts`
- [x] T024 Mount waitlist routes in app with auth middleware on all three endpoints — `src/app.ts`

**Checkpoint:** `POST /waitlists`, `GET /waitlists/:id`, `PUT /waitlists/:id/settings` respond correctly with auth. Existing tests pass.

---

## Phase 5: P1 User Stories — Entry Signup (Public)

- [x] T025 [US2] Implement `POST /waitlists/:id/entries` — validate waitlist exists (404), validate/normalize email (422), validate name length (max 200), generate referral code, compute base score, insert with unique constraint (409 on dupe), hash IP, compute position, return 201 with `{ entry_id, referral_code, position, total }` — `src/routes/entries.ts`
- [x] T026 [US4] Add referral handling to signup — look up `referral_code` in same waitlist (non-cancelled), set `referred_by` if valid, silently ignore if invalid/wrong-waitlist/cancelled/self-referral, atomic score update via `UPDATE SET score = score + ?` — `src/routes/entries.ts`
- [x] T027 [US2] Log `signup` event on entry creation; enqueue signup webhook if configured — `src/routes/entries.ts`
- [x] T028 Mount entry signup route in app with CORS and rate limiting (100/min) — `src/app.ts`

**Checkpoint:** Signups work end-to-end with referral tracking. Duplicate emails return 409. Invalid referral codes are silently ignored. Existing tests pass.

---

## Phase 6: P1 User Stories — Position & Referrals (Public)

- [x] T029 [US3] Implement `GET /waitlists/:wid/entries/:eid/position` — load entry (404 if missing/cancelled), return `{ position: null, status: "promoted" }` if promoted, else compute position with tie-breaker query `(score > ? OR (score = ? AND created_at < ?))`, return `{ position, total, status }` — `src/routes/position.ts`
- [x] T030 [US5] Implement `GET /waitlists/:wid/entries/:eid/referrals` — load entry (404), query `WHERE referred_by = ?`, return `{ count, entries: [{ name, created_at }] }` — `src/routes/referrals.ts`
- [x] T031 Mount position route with CORS and rate limiting (60/min), mount referrals route with CORS — `src/app.ts`

**Checkpoint:** Position and referral stats endpoints respond correctly. Tie-breakers resolve by signup order. Existing tests pass.

---

## Phase 7: P1 User Stories — Promotion & Webhooks (Admin)

- [x] T032 [US6] Implement `POST /waitlists/:id/promote` — validate `count` (required, integer, >0, max 1000), in transaction: select top N by `score DESC, created_at ASC` where `status = 'waiting'`, update to `promoted` with `promoted_at`, insert `promotion` events, return `{ promoted: [...], count }` — `src/routes/promote.ts`
- [x] T033 [US7] Enqueue webhook for each promotion event if `webhook_url` configured — `src/routes/promote.ts`
- [x] T034 Mount promote route in app with auth middleware — `src/app.ts`

**Checkpoint:** Batch promotion works. Promoting more than available promotes all remaining. Webhooks enqueued with HMAC signatures. Existing tests pass.

---

## Phase 8: P2 User Stories — Administration

- [x] T035 [P] [US9] Implement `DELETE /waitlists/:id/entries/:eid` — set status to `cancelled` (idempotent), log `cancellation` event, support `?purge=true` to nullify PII — `src/routes/entries.ts`
- [x] T036 [P] [US11] Implement `GET /waitlists/:id/entries?email=` — normalize email, look up by `(waitlist_id, email)`, return entry or 404 — `src/routes/entries.ts`
- [x] T037 Mount admin entry routes with auth middleware — `src/app.ts`

**Checkpoint:** Entry deletion (soft + purge) and email lookup work. Idempotent delete returns 200. Existing tests pass.

---

## Phase 9: Integration Wiring & Error Handling

- [x] T038 Add global error handler for malformed JSON (400) and payload size >64KB (413) — `src/app.ts`
- [x] T039 Verify all routes are mounted with correct middleware stack (auth on admin, CORS + rate limit on public) — `src/app.ts`
- [x] T040 Ensure all timestamps are ISO 8601 UTC in responses — verify across all route handlers

**Checkpoint:** Full API responds correctly to all endpoints. Malformed requests get proper error codes. `./dev/test` passes all tests.

---

## Phase 10: Polish

- [x] T041 Run `./dev/post_flight` and fix any issues
- [x] T042 Append decision to `bny/decisions.md`

**Checkpoint:** `./dev/post_flight` passes. All tests green. Decision logged.
