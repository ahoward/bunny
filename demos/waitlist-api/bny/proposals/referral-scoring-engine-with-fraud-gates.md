# Referral Scoring Engine with Fraud Gates

Generated: 2026-03-05
Topic: "--yes waitlist API design"
Effort: M

## Rationale

The worldview extensively documents referral reward structures (position bumps, thresholds, diminishing returns) and fraud vectors (self-referral loops, bot signups, referral farms). The viral-coefficient-math.md file shows that K-factor is brutally low by default, so the reward mechanic must be tuned carefully to maximize legitimate sharing. Meanwhile, referral-fraud-taxonomy.md warns that every incentive gets gamed — email verification, referral velocity caps, and disposable email detection must be baked in from day one rather than bolted on after abuse occurs. The tensions.md file frames the core tradeoff: simplicity vs. anti-gaming. The implementation should make anti-fraud invisible to legitimate users while blocking obvious abuse patterns.

## Worldview References

- product/referral-reward-structures.md
- product/referral-fraud-taxonomy.md
- product/viral-coefficient-math.md
- product/tensions.md
- technical/referral-graph-data-structures.md

## Summary

Build the referral tracking system with configurable reward structures and baseline anti-gaming measures. Referrals are the core growth mechanic but also the primary attack surface — both must ship together.

## Implementation Sketch

- Implement referral_code lookup on signup: resolve referred_by, increment parent's referral_count, recalculate parent's score based on waitlist reward config
- Support configurable reward strategies in waitlist settings: linear bumps, diminishing returns, and threshold-based jumps
- Add email verification gate — unverified referrals don't count toward referrer's score
- Implement referral velocity cap (configurable max referrals per hour per referrer) and IP-based rate limiting on signups
- Add disposable email domain detection using a maintained blocklist
- Store referred_by chain as referral_path array for future multi-level analytics without recursive queries
- Expose GET /waitlists/:id/entries/:id/referrals with count and verified/unverified breakdown
