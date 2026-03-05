# Viral Coefficient Math
A waitlist goes viral when each signup generates more than one additional signup — but the math is less forgiving than it appears.

## The K-Factor
K = (invites sent per user) × (conversion rate per invite)

If each user shares with 5 people and 10% convert: K = 0.5. That's not viral — it's supplemental growth. For true virality, K must exceed 1.0.

## Waitlist-Specific Dynamics
Unlike social products where K-factor operates continuously, waitlists have a **single-shot sharing window**. Users share when they first sign up (excitement is highest), then engagement decays rapidly. The viral loop is:

1. User signs up → sees position
2. Shown referral incentive → shares link
3. Some contacts click → some convert
4. New signups repeat from step 1

The decay at each step is brutal. Typical conversion: 40% see the referral prompt, 15% share, contacts have 5% click rate, 30% of clickers convert. That's 0.4 × 0.15 × 5 contacts × 0.05 × 0.30 = 0.0045 referrals per signup. K = 0.0045. Nowhere near viral.

## What Actually Moves K
- **Incentive salience**: "You're #4,847. Refer 3 friends to jump to #127" is far more motivating than "+5 positions per referral"
- **Sharing friction**: pre-composed tweet/message vs. copy-paste link. Every click lost in the share flow kills K.
- **Social proof in the share**: "Join 8,000 people waiting for X" converts better than a bare link
- **Urgency**: "Referral bonus expires in 48 hours" creates action pressure
- **Channel**: DMs convert 5-10x better than public posts. The API should optimize for shareable DM links, not just social posts.

## The Honest Truth
Most waitlists don't go viral through referrals alone. Referrals are a growth multiplier on top of organic/paid acquisition. The API should help founders maximize K, but not promise virality. Setting expectations matters.
