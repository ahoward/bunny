# Waitlist API — Knowledge Base Index

## Product Definition
- [waitlist-api.md](./product/waitlist-api.md) — Core spec: signup management, referral tracking, queue positioning, webhooks for pre-launch SaaS founders

## Growth Mechanics
- [viral-coefficient-math.md](./product/viral-coefficient-math.md) — K-factor math, sharing decay curves, what actually moves the needle
- [referral-reward-structures.md](./product/referral-reward-structures.md) — Position bumps, guaranteed access, tiered rewards, two-sided incentives, decay/caps
- [referral-channel-strategy.md](./product/referral-channel-strategy.md) — Channel effectiveness hierarchy, share toolkit requirements, API surface implications
- [referral-fraud-taxonomy.md](./product/referral-fraud-taxonomy.md) — Self-referral loops, farms, bots, arbitrage; detection strategies and false positive costs

## Design & Psychology
- [tensions.md](./product/tensions.md) — Key tradeoffs: fairness vs. virality, simplicity vs. anti-gaming, engagement vs. annoyance
- [psychology-of-waiting.md](./product/psychology-of-waiting.md) — Queue psychology: position framing, perceived fairness, progress notifications
- [dark-patterns-and-ethical-growth.md](./product/dark-patterns-and-ethical-growth.md) — Artificial scarcity, hidden regression, ethical defaults the API can enforce

## Business Strategy
- [monetization-models.md](./product/monetization-models.md) — Free tier, pricing axes, competitive landscape, revenue timing
- [lifecycle-beyond-launch.md](./product/lifecycle-beyond-launch.md) — Post-launch extensions: beta cohorts, feature waitlists, capacity management
- [case-studies-referral-waitlists.md](./product/case-studies-referral-waitlists.md) — Robinhood, Superhuman, Clubhouse, Hey.com — lessons from real launches

## Compliance
- [privacy-and-compliance.md](./product/privacy-and-compliance.md) — GDPR processor obligations, CAN-SPAM, data retention, minimum viable compliance

## Technical Architecture
- [api-surface.md](./technical/api-surface.md) — Public and admin endpoints, CORS/rate-limiting, webhook payload design
- [data-model-sketch.md](./technical/data-model-sketch.md) — Core entities (Waitlist, Entry, Event), derived queue position, anti-gaming fields
- [implementation-patterns.md](./technical/implementation-patterns.md) — Score-as-inverted-timestamp, atomic updates, silent failures, SSRF validation
- [referral-graph-data-structures.md](./technical/referral-graph-data-structures.md) — Materialized paths, cached counts, graph analytics for multi-level referrals
- [testing-patterns.md](./technical/testing-patterns.md) — Test app factory, Hono without server, test organization by concern
- [architecture-decisions.md](./technical/architecture-decisions.md) — Hono, SQLite, derived positions, JSON settings, event sourcing lite
- [scaling-pressure-points.md](./technical/scaling-pressure-points.md) — Launch spike handling, position calculation bottlenecks, webhook backpressure
