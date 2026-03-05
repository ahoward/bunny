# Feature Specification: a waitlist API for product launches — manage signups with email and name, referral tracking with unique codes, queue position estimation, and webhook notifications when users are promoted

**Feature Branch**: `001-waitlist-api-product`
**Created**: 2026-03-05
**Status**: Draft

# Feature Specification: Waitlist API for Product Launches

**Branch:** `001-waitlist-api-product`
**Date:** 2026-03-05
**Status:** Draft

---

## 1. User Scenarios & Testing

### P1 — Core Signup Flow

**US-001: Founder creates a waitlist**

> As a founder, I want to create a named waitlist so I can start collecting signups before my product launches.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | I have a valid API key | I `POST /waitlists` with `{ name: "Acme Beta" }` | I receive a waitlist object with `id`, `name`, `created_at`, and default settings |
| 2 | I omit the `name` field | I `POST /waitlists` with `{}` | I receive a 422 with a validation error |
| 3 | My API key is missing or invalid | I `POST /waitlists` | I receive a 401 Unauthorized |

**US-002: User signs up for a waitlist**

> As a visitor on a landing page, I want to join a waitlist with my email and name so I can get early access.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | A waitlist exists | I `POST /waitlists/:id/entries` with `{ email: "alice@example.com", name: "Alice" }` | I receive `{ entry_id, referral_code, position, total }` with status 201 |
| 2 | I omit `email` | I submit the signup | I receive a 422 with `email is required` |
| 3 | I provide an invalid email format | I submit the signup | I receive a 422 with `email is invalid` |
| 4 | I use an email already registered on this waitlist | I submit the signup | I receive a 409 Conflict with `email already registered` |
| 5 | The waitlist ID does not exist | I submit the signup | I receive a 404 Not Found |
| 6 | `name` is omitted | I submit the signup with only `email` | Signup succeeds; `name` is null |

**US-003: User checks their queue position**

> As a waitlist user, I want to check my position so I know how close I am to getting access.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | I am entry #47 of 500 waiting | I `GET /waitlists/:wid/entries/:eid/position` | I receive `{ position: 47, total: 500, status: "waiting" }` |
| 2 | I have been promoted | I check position | I receive `{ position: null, total: 500, status: "promoted" }` |
| 3 | My entry ID doesn't exist | I check position | I receive 404 |

### P1 — Referral Tracking

**US-004: User signs up via a referral link**

> As a visitor, I want to use a friend's referral code when signing up so we both benefit.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | Bob has referral code `BOB123` | I `POST /waitlists/:id/entries` with `{ email: "carol@example.com", referral_code: "BOB123" }` | My entry is created with `referred_by` pointing to Bob's entry; Bob's score is updated per reward config |
| 2 | The referral code doesn't exist | I submit with `referral_code: "INVALID"` | Signup succeeds but `referred_by` is null (silent ignore — don't block signup over a bad code) |
| 3 | I try to use my own referral code | I sign up, then somehow submit my own code | The referral is ignored; `referred_by` remains null |

**US-005: User checks their referral stats**

> As a waitlist user, I want to see how many people signed up using my code.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | I referred 3 people | I `GET /waitlists/:wid/entries/:eid/referrals` | I receive `{ count: 3, entries: [{ name, created_at }, ...] }` |
| 2 | I referred no one | I check referrals | I receive `{ count: 0, entries: [] }` |

### P1 — Promotion & Webhooks

**US-006: Founder promotes users off the waitlist**

> As a founder, I want to promote the top N users so I can grant them product access in batches.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | 500 users are waiting | I `POST /waitlists/:id/promote` with `{ count: 10 }` | The top 10 entries by score move to `promoted` status; each fires a webhook event; response includes the promoted entries |
| 2 | I request promoting 100 but only 30 are waiting | I promote | 30 entries are promoted; response indicates 30 promoted |
| 3 | I request `count: 0` or negative | I promote | 422 validation error |

**US-007: Founder receives webhook on promotion**

> As a founder, I want to receive a webhook when a user is promoted so my system can grant access automatically.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | Webhook URL is configured | A user is promoted | An HTTP POST is sent to the URL with `{ event: "promotion", entry: { id, email, name, promoted_at }, waitlist_id }` |
| 2 | Webhook delivery fails (5xx or timeout) | System retries | Up to 3 retries with exponential backoff; event marked `failed` after exhaustion |
| 3 | No webhook URL configured | A user is promoted | No webhook sent; promotion still succeeds |

### P2 — Administration

**US-008: Founder views waitlist details**

> As a founder, I want to see my waitlist stats (total entries, promoted count) at a glance.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | My waitlist has 1,200 waiting and 50 promoted | I `GET /waitlists/:id` | I receive waitlist metadata plus `{ stats: { waiting: 1200, promoted: 50, cancelled: 0 } }` |

**US-009: Founder removes an entry**

> As a founder, I want to remove a signup (spam, request for deletion) from my waitlist.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | Entry exists with status `waiting` | I `DELETE /waitlists/:id/entries/:eid` | Entry status becomes `cancelled`; a `cancellation` event is logged |
| 2 | Entry is already cancelled | I delete again | 200 OK (idempotent) |

**US-010: Founder updates waitlist settings**

> As a founder, I want to configure referral rewards, webhook URL, and queue strategy.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | Waitlist exists | I `PUT /waitlists/:id/settings` with `{ webhook_url: "https://...", referral_reward: { type: "position_bump", amount: 5 } }` | Settings are persisted; future signups and promotions use new config |

### P2 — Entry Lookup by Email

**US-011: Founder looks up an entry by email**

> As a founder, I want to find a specific signup by email so I can check their status or remove them.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | alice@example.com exists on waitlist | I `GET /waitlists/:id/entries?email=alice@example.com` | I receive the entry object |
| 2 | Email not found | I query | 404 Not Found |

### P3 — Email Verification

**US-012: User verifies their email**

> As a waitlist user, I want to verify my email so my signup counts toward promotion eligibility.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | I just signed up | System sends a verification email with a token | I click the link; `email_verified` becomes true |
| 2 | I try to use an expired/invalid token | I click the link | I receive an error; `email_verified` remains false |
| 3 | I am already verified | I click again | 200 OK (idempotent) |

[NEEDS CLARIFICATION] Should unverified entries be excluded from promotion, or is verification optional per waitlist config?

### P3 — Signup Event Webhook

**US-013: Founder receives webhook on new signup**

> As a founder, I want to be notified when someone joins my waitlist so I can send a custom welcome email or trigger other automations.

| # | Given | When | Then |
|---|-------|------|------|
| 1 | Webhook URL is configured, `signup` event is enabled | A new entry is created | Webhook fires with `{ event: "signup", entry: { id, email, name, referral_code, position }, waitlist_id }` |

---

## 2. Edge Cases

### Signup Boundaries

| ID | Condition | Expected Behavior |
|----|-----------|-------------------|
| EC-001 | Email with leading/trailing whitespace | Trimmed and normalized to lowercase before uniqueness check |
| EC-002 | Email with `+` alias (john+test@gmail.com) | Accepted as-is; treated as distinct from john@gmail.com (founders can add alias normalization later) |
| EC-003 | Very long email (>254 chars) | Rejected with 422 |
| EC-004 | Very long name (>200 chars) | Truncated to 200 chars or rejected with 422 |
| EC-005 | Concurrent signups with the same email | Only one succeeds; the other receives 409. Enforced by unique constraint. |
| EC-006 | Unicode/emoji in name field | Accepted; stored as UTF-8 |
| EC-007 | Empty string for email | Rejected with 422 (same as missing) |

### Referral Boundaries

| ID | Condition | Expected Behavior |
|----|-----------|-------------------|
| EC-008 | Referral code belongs to a different waitlist | Ignored silently; signup succeeds without referral |
| EC-009 | Referral code belongs to a cancelled entry | Ignored silently |
| EC-010 | Burst of 50 signups using the same referral code in 1 minute | All accepted; referrer's score updates are serialized to prevent race conditions |
| EC-011 | Circular referral attempt (A→B→A) | Impossible by design: A already exists when B signs up, so A cannot re-sign up |
| EC-012 | Referral to a promoted entry's code | Accepted; the referrer has already been promoted so the score bump is moot, but the relationship is recorded |

### Promotion Boundaries

| ID | Condition | Expected Behavior |
|----|-----------|-------------------|
| EC-013 | Promote when waitlist is empty | Returns 200 with empty list; no webhooks fired |
| EC-014 | Two concurrent promote requests | Serialized; no entry is promoted twice |
| EC-015 | Entry promoted but webhook URL unreachable | Promotion committed; webhook retried asynchronously; event logged as `pending` |

### API Abuse

| ID | Condition | Expected Behavior |
|----|-----------|-------------------|
| EC-016 | >100 signups/minute from same IP | Rate limited with 429 Too Many Requests |
| EC-017 | Position check polling at >60 req/min per entry | Rate limited with 429 |
| EC-018 | Nonexistent waitlist ID in any endpoint | 404 |
| EC-019 | Malformed JSON body | 400 Bad Request |
| EC-020 | Request body exceeds 64KB | 413 Payload Too Large |

---

## 3. Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | The system MUST allow creating a waitlist with a name via authenticated admin API | P1 |
| FR-002 | The system MUST allow creating an entry with an email (and optional name and referral_code) on a public endpoint | P1 |
| FR-003 | The system MUST generate a unique `referral_code` for each entry on creation | P1 |
| FR-004 | The system MUST enforce email uniqueness per waitlist | P1 |
| FR-005 | The system MUST normalize emails (trim whitespace, lowercase) before storage and uniqueness checks | P1 |
| FR-006 | The system MUST return queue position as a derived rank (count of waiting entries with higher score) | P1 |
| FR-007 | The system MUST support promoting the top N entries by score, transitioning their status from `waiting` to `promoted` | P1 |
| FR-008 | The system MUST fire webhook HTTP POST requests on promotion events when a webhook URL is configured | P1 |
| FR-009 | The system MUST retry failed webhook deliveries up to 3 times with exponential backoff | P1 |
| FR-010 | The system MUST track the referral relationship (`referred_by`) when a valid referral code is provided at signup | P1 |
| FR-011 | The system MUST update the referrer's score according to the waitlist's configured reward structure on a successful referral | P1 |
| FR-012 | The system MUST support entry deletion (status → `cancelled`) via admin API | P2 |
| FR-013 | The system MUST support looking up entries by email via admin API | P2 |
| FR-014 | The system MUST support configurable waitlist settings (webhook URL, referral reward type/amount, queue strategy) | P2 |
| FR-015 | The system MUST return referral stats (count and list of referred entries) for a given entry | P2 |
| FR-016 | The system SHOULD support CORS headers on public endpoints for browser-based landing page integration | P1 |
| FR-017 | The system SHOULD rate-limit public endpoints by IP address (100 req/min for signups, 60 req/min for position checks) | P1 |
| FR-018 | The system SHOULD fire webhook on signup events when configured | P3 |
| FR-019 | The system SHOULD support email verification as an optional gate for promotion eligibility | P3 |
| FR-020 | The system SHOULD silently ignore invalid, self-referencing, or cross-waitlist referral codes rather than blocking signup | P1 |
| FR-021 | The system MUST authenticate admin endpoints via API key (Bearer token in Authorization header) | P1 |
| FR-022 | The system MUST NOT require authentication for public endpoints (signup, position check, referral stats) | P1 |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-001 | Position calculation MUST return in <200ms at 100K entries |
| NFR-002 | Signup endpoint MUST handle burst traffic of 1,000 req/min per waitlist without data loss |
| NFR-003 | Webhook delivery MUST be asynchronous — promotion response MUST NOT block on webhook success |
| NFR-004 | IP addresses MUST be stored hashed (SHA-256) for privacy compliance |
| NFR-005 | All timestamps MUST be stored and returned as ISO 8601 UTC |

### Open Questions

| ID | Question |
|----|----------|
| OQ-001 | [NEEDS CLARIFICATION] Should the default score formula be `signup_timestamp + (referral_count × bump_amount)`, or should referrals modify a separate priority that's blended with time? |
| OQ-002 | [NEEDS CLARIFICATION] Should email verification be on by default, or opt-in per waitlist? |
| OQ-003 | [NEEDS CLARIFICATION] Should `GET /entries/:id/referrals` be a public endpoint (anyone with entry ID) or admin-only? Current spec assumes public. |
| OQ-004 | [NEEDS CLARIFICATION] What is the maximum number of entries per waitlist? Unbounded, or does free tier cap at a threshold? |
| OQ-005 | [NEEDS CLARIFICATION] Should deleted entries' referral contributions be revoked (decrement referrer score) or preserved? |

---

## 4. Key Entities

### Waitlist

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | UUID | PK, generated |
| `name` | string | Required, max 100 chars |
| `owner_id` | string | FK to API key / account |
| `settings` | JSON | Webhook URL, referral reward config, queue strategy |
| `created_at` | timestamp | UTC, immutable |

### Entry

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | UUID | PK, generated |
| `waitlist_id` | UUID | FK → Waitlist, required |
| `email` | string | Required, normalized, unique per waitlist_id |
| `name` | string | Optional, max 200 chars |
| `referral_code` | string | Unique globally, generated (8-char alphanumeric) |
| `referred_by` | UUID | FK → Entry, nullable |
| `score` | float | Computed: base timestamp + referral bonuses. Higher = better position. |
| `status` | enum | `waiting` \| `promoted` \| `cancelled`. Default: `waiting` |
| `email_verified` | boolean | Default: false |
| `ip_hash` | string | SHA-256 of signup IP, nullable |
| `promoted_at` | timestamp | Nullable, set on promotion |
| `created_at` | timestamp | UTC, immutable |

**Indexes:**
- `(waitlist_id, email)` — unique, for signup dedup and email lookup
- `(waitlist_id, status, score)` — for position calculation and promotion ordering
- `(referral_code)` — unique, for referral lookups
- `(referred_by)` — for counting referrals

### Event

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | UUID | PK, generated |
| `waitlist_id` | UUID | FK → Waitlist |
| `entry_id` | UUID | FK → Entry |
| `type` | enum | `signup` \| `referral` \| `promotion` \| `cancellation` |
| `payload` | JSON | Event-specific data |
| `webhook_status` | enum | `pending` \| `delivered` \| `failed` \| `skipped` |
| `attempts` | integer | Default: 0 |
| `created_at` | timestamp | UTC |

### Entity Relationships


Waitlist 1──* Entry
Entry    1──* Entry (referred_by → referrer)
Entry    1──* Event
Waitlist 1──* Event

### Score Calculation (Default)


base_score = MAX_TIMESTAMP - created_at_unix
// Earlier signups get higher base score (FIFO)

referral_bonus = referral_count × settings.referral_reward.amount
// e.g., 5 referrals × 10 points = 50

score = base_score + referral_bonus

Position = `COUNT(*) + 1` of entries in the same waitlist where `status = 'waiting'` AND `score > this_entry.score`.

---

## 5. Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Signup latency (p95) | < 150ms | Load test: 1,000 signups/min sustained for 5 min |
| Position query latency (p95) | < 100ms | At 100K entries per waitlist |
| Promotion + webhook fire (p95) | < 500ms for promote response; webhooks dispatched within 5s | Promote 100 entries, measure response time and webhook arrival |
| Referral attribution accuracy | 100% — every valid referral code correctly links referrer to referee | Automated test: create chain of 10 referrals, verify all `referred_by` links and score updates |
| Webhook delivery rate | > 99% within 3 retry attempts (given reachable endpoint) | Integration test with flaky endpoint mock |
| Duplicate signup rejection | 100% — no duplicate emails per waitlist under concurrent load | Load test: 50 concurrent signups with same email; exactly 1 succeeds |
| Rate limiting effectiveness | 100% of requests beyond threshold receive 429 | Burst test: 200 signups/min from single IP |
