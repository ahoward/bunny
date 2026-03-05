# Referral Fraud Taxonomy
Every incentive creates a game, and every game gets gamed — referral systems attract systematic abuse from both bots and motivated humans.

## Fraud Patterns

### Self-Referral Loops
User creates multiple accounts with different emails, refers themselves. Detected by: shared IP, browser fingerprint, email pattern similarity (john+1@gmail, john+2@gmail).

### Referral Farms
Coordinated groups trade referrals: "I'll sign up with your link if you sign up with mine." Harder to detect because each individual action is legitimate. Detected by: temporal clustering, reciprocal referral patterns, geographic anomalies.

### Bot Signups
Automated account creation using disposable emails. Each fake signup credits the referrer. Detected by: email domain blacklists, CAPTCHA, signup velocity, missing browser fingerprints.

### Incentive Arbitrage
If referral rewards are valuable enough (guaranteed early access to a hot product), people will buy/sell referral codes. Not technically fraud, but undermines the growth mechanic. Detected by: unusual referral patterns from single codes, referrals from unrelated geographic clusters.

### Social Engineering
Posting referral links in misleading contexts ("official signup link" in forums). The referrer gets credit for organic signups that would have happened anyway. Detected by: referral codes appearing in public URLs, unusually high conversion rates.

## Detection Strategies for the API
- **Email verification** as a mandatory gate (kills bot and self-referral)
- **Rate limiting** per IP and fingerprint
- **Referral velocity caps** — no one legitimately gets 100 referrals in an hour
- **Graph analysis** — look for cycles, clusters, and anomalies in the referral graph
- **Disposable email detection** — reject known throwaway domains

## The Cost of False Positives
Every fraud check risks blocking a legitimate user who's genuinely excited and sharing widely. A user who legitimately refers 50 people from a viral tweet looks identical to a bot. The API must expose fraud signals to founders and let them decide thresholds, not enforce a one-size-fits-all policy.
