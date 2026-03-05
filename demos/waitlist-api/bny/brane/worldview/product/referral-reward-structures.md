# Referral Reward Structures
The shape of the reward function determines whether referrals drive sustainable growth or burn out after the first share.

## Reward Types

### Position Bumps
Each successful referral moves the referrer up N positions. Simple, intuitive, directly tied to the queue mechanic.
- **Linear**: +5 positions per referral. Predictable but lacks excitement.
- **Diminishing**: +10 for first, +7 for second, +4 for third... prevents gaming while rewarding early effort.
- **Threshold**: nothing until 3 referrals, then jump 50 positions. Creates a cliff that motivates completion but frustrates partial effort.

### Guaranteed Access
N referrals = skip the queue entirely. Robinhood used this — refer 3 friends, get early access. Powerful but undermines FIFO for non-sharers.

### Tiered Rewards
Bronze (1 referral) → Silver (3) → Gold (5) → skip-the-line (10). Each tier unlocks something: priority support, beta features, exclusive content. Requires the founder to have things worth unlocking.

### Score Multipliers
Rather than fixed bumps, referrals multiply your base score. This compounds — early signers with referrals become untouchable. Late signers can never catch up regardless of referral effort. This may or may not be desirable.

## Two-Sided Incentives
Most waitlist referral systems only reward the referrer. But the referee needs a reason to use the referral link instead of signing up directly.
- Referee gets a small position boost for using a referral link
- Referee sees "invited by [name]" — social proof and belonging
- Referee gets the referrer's position context ("join me in the top 10%")

## Decay and Caps
- **Referral cap**: max 20 referrals count toward score. Prevents whales from dominating.
- **Time decay**: referrals older than 30 days lose weight. Keeps engagement fresh.
- **Quality gate**: only verified referrals count. Prevents spam signups.

## The Compounding Problem
If Alice refers Bob, and Bob refers Carol, does Alice benefit? Multi-level referrals create exponential growth but also MLM dynamics and fraud vectors. For MVP, single-level is safer. But the data model should track `referred_by` chains for future flexibility.
