# Data Model Sketch
The implemented data model supports signups, referrals, score-based queue position, and webhook event tracking.

## Core Entities

### Waitlist
- `id` — UUID, primary key
- `name` — human label, required, max 100 chars
- `owner_id` — API key owner (empty string for single-tenant MVP)
- `settings` — JSON blob containing: `webhook_url`, `webhook_secret` (32-byte hex, generated on creation), `referral_reward` (`{ type, amount }`), `queue_strategy`
- `created_at` — ISO 8601 UTC

### Entry
- `id` — UUID, primary key
- `waitlist_id` — FK → Waitlist
- `email` — normalized (trimmed, lowercased), unique per waitlist
- `name` — optional, max 200 chars
- `referral_code` — unique globally, 8-char alphanumeric
- `referred_by` — FK → Entry, nullable
- `score` — REAL: `(MAX_TS - created_at_unix) + (referral_count × reward_amount × EPOCH_SCALE)`. Higher = better position.
- `status` — `waiting | promoted | cancelled`
- `email_verified` — boolean (integer 0/1 in SQLite), default false
- `ip_hash` — SHA-256 of signup IP
- `promoted_at` — nullable ISO 8601
- `created_at` — ISO 8601 UTC

**Indexes (implemented):**
- `(waitlist_id, email)` — UNIQUE, dedup + email lookup
- `(waitlist_id, status, score DESC, created_at ASC)` — position calculation + promotion ordering
- `(referral_code)` — UNIQUE (on column, not separate index)
- `(referred_by)` — referral count queries

### Event
- `id` — UUID
- `waitlist_id` — FK → Waitlist
- `entry_id` — FK → Entry
- `type` — `signup | referral | promotion | cancellation`
- `payload` — JSON
- `webhook_status` — `pending | delivered | failed | skipped`
- `attempts` — integer, tracks retry count
- `created_at` — ISO 8601

## Queue Position (Implemented)
Position is derived via:
```sql
SELECT COUNT(*) + 1 FROM entries 
WHERE waitlist_id = ? AND status = 'waiting' 
AND (score > ? OR (score = ? AND created_at < ?))
```
Ties broken by earlier `created_at` (FIFO within same score).

## Score Formula (Implemented)
- `MAX_TS = 4102444800` (2100-01-01 UTC)
- `EPOCH_SCALE = 1000`
- `base = MAX_TS - unix_seconds(created_at)`
- On referral: `UPDATE entries SET score = score + (amount × EPOCH_SCALE) WHERE id = referrer_id`
- One referral with default amount=5 is worth 5000 score points = ~83 minutes of queue advantage

## What's NOT Implemented Yet
- Materialized referral paths for multi-level tracking
- `deep_referral_count` for chain analytics
- Referral depth cap enforcement
- Automatic score decay over time
