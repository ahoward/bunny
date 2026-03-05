# Design Tensions
Key tradeoffs that will shape the waitlist API's architecture and policy decisions.

## Fairness vs. Virality
Pure FIFO is the fairest queue. Referral-weighted scoring drives growth. These goals conflict — rewarding referrals means penalizing early signers who don't share. Need a balance point.

## Simplicity vs. Anti-Gaming
The more fraud prevention layers (email verification, IP limits, fingerprinting), the higher the friction for legitimate users. Target users (early SaaS founders) want drop-in simplicity.

## Engagement vs. Annoyance
More email touchpoints keep users warm but risk unsubscribes. Founders using this API inherit the reputation of its email behavior.
