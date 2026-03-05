# Waitlist API
A launch-day waitlist service for early-stage SaaS founders who need signup management before their product is ready.

## Core Capabilities
- **Signup management** — collect email and name
- **Referral tracking** — unique referral codes per user
- **Queue position estimation** — fair, transparent ordering
- **Webhook notifications** — fire events when users are promoted off the waitlist

## Target Users
Early-stage SaaS founders pre-launch. They need something lightweight, API-first, and easy to integrate into a landing page.

## Open Design Questions

### Referral Mechanics
- What reward structure drives viral growth? (queue bumps, guaranteed access, tiered rewards)
- How many referral levels deep should tracking go?
- Should referral rewards compound or cap?

### Queue Fairness
- Pure FIFO vs. referral-weighted scoring
- How to balance early adopters against high-referral latecomers
- Transparency: should users see their exact position or a range?

### Anti-Gaming
- Disposable email detection
- Rate limiting on signups from same IP/fingerprint
- Referral fraud detection (self-referral loops, bot signups)
- Email verification as a gate

### Engagement Touchpoints
- Confirmation email on signup
- Position update emails (periodic or on change)
- Referral milestone notifications
- Promotion notification (you're in!)
- Re-engagement for inactive referrers
