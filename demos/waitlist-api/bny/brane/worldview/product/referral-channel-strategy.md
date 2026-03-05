# Referral Channel Strategy
Where and how users share their referral link matters more than the reward — a great incentive with a broken share flow produces zero referrals.

## Channel Effectiveness Hierarchy
1. **Direct message** (iMessage, WhatsApp, DM) — highest conversion, feels personal, not spammy
2. **Email** — decent conversion if targeted, but easy to ignore
3. **Slack/Discord communities** — high conversion in niche communities, feels like a tip not an ad
4. **Twitter/X** — low conversion rate but high reach for tech audiences
5. **LinkedIn** — surprisingly effective for B2B SaaS waitlists
6. **Public forums** (Reddit, HN) — community-hostile to referral links, can backfire badly

## What the API Should Provide
- **Pre-composed messages** per channel (tweet-length, DM-length, email-length)
- **Platform-specific share URLs** with UTM tracking to measure channel effectiveness
- **Open Graph / social card metadata** so links preview well on each platform
- **QR codes** for physical events or slides
- **Copy-to-clipboard** optimized share text

## The Network Effect Paradox
Founders targeting technical audiences (SaaS tools, developer platforms) have users who are the MOST likely to detect and resent referral manipulation, but also the MOST connected in high-value networks. The share mechanic must feel organic, not gamified.

## API Surface Implications
Consider a `GET /waitlists/:id/entries/:id/share` endpoint that returns channel-optimized share content. This goes beyond basic referral_code — it's a share toolkit. Could be a premium feature.
