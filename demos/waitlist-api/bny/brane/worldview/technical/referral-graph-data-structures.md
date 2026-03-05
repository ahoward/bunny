# Referral Graph Data Structures
As referral chains deepen and widen, the naive `referred_by` foreign key becomes insufficient — the API needs graph-aware data patterns.

## Current Model Limitation
The `referred_by` FK on Entry only tracks direct referrals. To answer "how many total signups did Alice's referral chain produce?" requires recursive queries. At scale, this is expensive.

## Materialized Path Approach
Store the full referral chain as an array: `referral_path: [alice_id, bob_id, carol_id]`
- Alice refers Bob → Bob's path: `[alice_id]`
- Bob refers Carol → Carol's path: `[alice_id, bob_id]`
- To find all of Alice's descendants: `WHERE alice_id = ANY(referral_path)`
- Depth is `referral_path.length`
- Postgres supports array indexing and containment queries efficiently

## Adjacency List + Cached Counts
Keep `referred_by` but add `referral_count` and `deep_referral_count` to Entry. Update counts on signup:
- Increment direct parent's `referral_count`
- Walk up the chain, increment each ancestor's `deep_referral_count`
- Chain walk is bounded by depth cap (e.g., max 5 levels)

## Graph Analytics the API Could Expose
- **Referral tree depth** — how many levels deep does sharing go?
- **Branching factor** — average referrals per referrer
- **Top referrers** — leaderboard for founders to identify champions
- **Referral velocity** — signups per hour attributed to referrals vs. organic
- **Network clusters** — detect communities within the waitlist

## Admin Endpoint Implications
`GET /waitlists/:id/referral-graph` — returns tree structure or summary stats. This is a premium analytics feature, not MVP, but the data model should support it from day one.
