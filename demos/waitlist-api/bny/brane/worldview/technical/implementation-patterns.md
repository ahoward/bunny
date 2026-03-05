# Implementation Patterns
Reusable patterns that emerged from building the waitlist API with Hono + SQLite + Bun.

## Score-as-Inverted-Timestamp
Queue position uses `MAX_TIMESTAMP - created_at_unix` as a base score, so higher score = earlier signup = better position. Referral bonuses add to the score with an `EPOCH_SCALE` multiplier (1000) to make one referral worth ~16 minutes of queue advantage. This avoids separate sorting dimensions — everything collapses to a single `score DESC` order.

## Tie-Breaking in Position Queries
When two entries have identical scores, position is resolved by signup order:
```sql
WHERE waitlist_id = ? AND status = 'waiting' 
AND (score > ? OR (score = ? AND created_at < ?))
```
The composite index `(waitlist_id, status, score DESC, created_at ASC)` supports this efficiently.

## Atomic Score Updates
Referral score bumps use `UPDATE SET score = score + ?` rather than read-modify-write. This prevents race conditions under concurrent referral signups without requiring explicit locking.

## Silent Referral Code Failures
Invalid, cross-waitlist, cancelled, or self-referral codes are silently ignored — signup succeeds without the referral link. This prevents a bad referral code from blocking a legitimate signup. The principle: never let an optional enhancement become a blocking failure.

## Global Module Singleton for DB
The DB uses a module-level `_db` variable set by `open_db()` and retrieved by `get_db()`. Tests call `open_db(':memory:')` to replace the singleton. Simple, but means tests must be careful about ordering if run in parallel (Bun's test runner handles this via file-level isolation).

## Webhook Queue: In-Process Async
Webhook delivery uses an in-process array queue processed sequentially. Retries use exponential backoff (1s, 4s, 16s) with 3 attempts. DB status updates are wrapped in try/catch to handle cases where the DB isn't available (test environments). This is MVP-appropriate but won't survive process restarts — a durable queue (Redis, DB-backed) is the natural upgrade path.

## SSRF Validation on Webhook URLs
The `PUT /settings` endpoint validates webhook URLs against private IP ranges (10.x, 172.16-31.x, 192.168.x, 169.254.x, localhost, .internal, .local). URL parsing failure defaults to rejection. This is a hostname-level check — DNS rebinding could bypass it, which is a known limitation for production.

## Middleware Layering in Hono
Auth, CORS, and rate limiting are applied via `app.use()` with path patterns before route mounting. For routes that need conditional middleware (e.g., `GET /entries` is admin but `POST /entries` is public), the middleware checks `c.req.method` and delegates. This works but is fragile — a method typo silently removes protection.

## GDPR Purge via Query Parameter
`DELETE /entries/:id?purge=true` nullifies PII (email, name, ip_hash) in addition to status change. Without `purge`, it's a soft delete that preserves data for analytics. This gives founders explicit control over right-to-erasure compliance.
