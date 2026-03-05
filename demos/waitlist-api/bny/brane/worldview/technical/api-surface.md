# API Surface
The implemented endpoints for managing waitlists, signups, referrals, positions, and promotions.

## Public Endpoints (no auth, CORS enabled)

### `POST /waitlists/:id/entries`
Create a signup. Rate limited: 100/min per IP.
- Body: `{ email, name?, referral_code? }`
- Returns 201: `{ entry_id, referral_code, position, total }`
- Errors: 404 (waitlist not found), 422 (validation), 409 (duplicate email), 400 (bad JSON), 413 (body > 64KB)
- Email is normalized (trim + lowercase) before storage
- Invalid referral codes are silently ignored
- IP is hashed (SHA-256) and stored for anti-gaming

### `GET /waitlists/:wid/entries/:eid/position`
Check queue position. Rate limited: 60/min per IP.
- Returns: `{ position, total, status }` where position is null if promoted
- Position uses tie-breaking: same score resolves by earlier `created_at`
- Cancelled entries return 404

### `GET /waitlists/:wid/entries/:eid/referrals`
Referral stats for an entry.
- Returns: `{ count, entries: [{ name, created_at }] }`

## Admin Endpoints (Bearer token auth required)

### `POST /waitlists`
Create a waitlist.
- Body: `{ name }` (required, max 100 chars)
- Returns 201: `{ id, name, settings, created_at }`
- Auto-generates `webhook_secret` (32-byte hex)
- Default settings: `{ referral_reward: { type: "position_bump", amount: 5 }, queue_strategy: "score" }`

### `GET /waitlists/:id`
Waitlist details with stats.
- Returns: `{ id, name, settings, created_at, stats: { waiting, promoted, cancelled } }`
- Stats computed via `GROUP BY status` on entries

### `PUT /waitlists/:id/settings`
Update settings (webhook URL, referral config, etc.).
- Merges provided fields into existing settings
- SSRF validation on `webhook_url`: rejects private IPs, localhost, link-local, .internal/.local domains

### `POST /waitlists/:id/promote`
Promote top N entries by score.
- Body: `{ count }` (1-1000)
- Returns: `{ promoted: [{ id, email, name, promoted_at }], count }`
- Fires webhook per promoted entry if `webhook_url` configured
- Webhook payload: `{ event: "promotion", entry: { id, email, name, promoted_at }, waitlist_id }`
- HMAC-SHA256 signature in `X-Webhook-Signature` header using `webhook_secret`

### `DELETE /waitlists/:id/entries/:eid`
Remove an entry (soft delete → `cancelled` status).
- `?purge=true` nullifies PII (email, name, ip_hash) for GDPR erasure
- Idempotent: cancelling an already-cancelled entry returns 200

### `GET /waitlists/:id/entries?email=`
Look up entry by email.
- Email is normalized before lookup
- Returns entry object or 404

## Security Measures (Implemented)
- API key auth on admin routes
- CORS on public routes
- Rate limiting per hashed IP on signup and position endpoints
- SSRF validation on webhook URLs
- IP address stored as SHA-256 hash
- Webhook payloads signed with HMAC-SHA256
- Body size limit: 64KB

## Not Yet Implemented
- Email verification flow (endpoints for send/verify token)
- `GET /waitlists/:id/referral-graph` analytics
- Channel-optimized share content endpoint
- Multi-tenant API key management
