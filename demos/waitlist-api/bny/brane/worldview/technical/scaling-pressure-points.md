# Scaling Pressure Points
Where the current implementation will break under load, based on architectural choices made.

## The Launch Spike
Waitlists experience extreme traffic concentration. The current implementation handles moderate bursts but has known limits.

## Known Bottlenecks

### Position Calculation (Current: COUNT query)
Every position check runs `SELECT COUNT(*) FROM entries WHERE waitlist_id = ? AND status = 'waiting' AND (score > ? OR (score = ? AND created_at < ?))`. With the composite index `(waitlist_id, status, score DESC, created_at ASC)`, this is an index scan bounded by the entry's position. For entry #50,000 of 100,000, it scans ~50K index entries. At high concurrency, this saturates SQLite's read capacity.

**Mitigation path:** Materialized position column updated asynchronously, or approximate position via cached total count and score percentile.

### SQLite Write Contention
SQLite in WAL mode allows concurrent reads but serializes writes. Under burst signup traffic (1000/min), each signup does: 1 INSERT (entry), 1 INSERT (event), and optionally 1 UPDATE (referrer score) + 1 INSERT (referral event). That's 2-4 writes per signup. At ~1000 writes/sec SQLite starts queuing.

**Mitigation path:** Move to Postgres. The schema and queries are compatible.

### Referral Code Lookups Under Burst
A viral referral code generates concurrent signups that all look up the same referrer and update their score. The atomic `score = score + ?` prevents data corruption but creates write contention on a hot row.

**Mitigation path:** Batch score updates or use a counter table with periodic merge.

### Webhook Delivery
The in-process webhook queue is sequential and non-durable. Promoting 100 users fires 100 sequential webhook deliveries. If each takes 1-2 seconds (slow endpoint), that's 100-200 seconds of queue processing. Process crash loses pending webhooks.

**Mitigation path:** Redis-backed queue, or DB-backed with a worker polling `WHERE webhook_status = 'pending'`.

### Rate Limiter Memory
The in-memory rate limiter map grows unbounded — one entry per unique IP hash. Under a DDoS with spoofed IPs, this could consume significant memory.

**Mitigation path:** LRU eviction on the rate limiter map, or external rate limiting (Redis, edge CDN).

## Infrastructure Choices
- SQLite is the ceiling for write throughput (~1000 writes/sec)
- In-process state (rate limiter, webhook queue) doesn't survive restarts or scale horizontally
- No connection pooling needed for SQLite but will be critical with Postgres
- Position checks could be edge-cached (stale by seconds is fine for UX)
