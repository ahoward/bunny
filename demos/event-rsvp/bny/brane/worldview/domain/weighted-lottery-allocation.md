# Weighted Lottery Allocation
A weighted lottery gives every eligible person a chance proportional to how many fairness criteria they satisfy — more nuanced than strict priority or pure randomness.

## Why Weighted Lotteries?
When allocating scarce resources (event spots, vaccines, tickets), multiple criteria matter simultaneously:
- Medical/social need
- First-come order
- Group membership (disadvantaged populations)
- Potential to benefit

Strict priority systems force rigid ranking of criteria. Pure lotteries ignore all differences. Weighted lotteries give each eligible person a *chance* proportional to how many criteria they satisfy.

## Theoretical Foundation
Weighted lotteries derive from **lottery scheduling** (Waldspurger & Weihl, 1994), a proportional-share resource allocation algorithm from OS scheduling. Key properties:
- Each participant receives lottery tickets proportional to their weight
- Random drawing selects the next allocation
- Giving every participant at least one ticket **guarantees non-starvation** — everyone has a non-zero probability of selection
- Over many draws, allocation converges to exact proportional share

For the deterministic counterpart, see [stride scheduling](fairness-models.md).

## How They Work
1. **Define criteria** — each with a weight (e.g., essential worker = 2x, high-risk = 3x, FIFO position = 1x)
2. **Score each candidate** — sum of applicable weights becomes their lottery tickets
3. **Draw randomly** — candidates with more tickets have proportionally higher chances
4. **Allocate** — winners receive the scarce resource

## Real-World Evidence
- **UPMC COVID-19 monoclonal antibody allocation (2023)**: Used a weighted lottery to allocate 450 doses across a large health system. Patients from disadvantaged populations received higher weights. The system was feasible to implement and improved equitable access compared to first-come-first-served.
- **Vaccine allocation frameworks (2021)**: Jansen & Wall proposed weighted lotteries for COVID-19 vaccine distribution, arguing they solve the "balancing problem" — how to weigh occupation, group membership, and medical benefit against each other without arbitrary ranking.

## Application to Event RSVPs
For high-demand events where waitlist promotion decisions matter:
- **Loyalty weight**: Repeat attendees get extra tickets
- **Equity weight**: First-time attendees or underrepresented groups get a boost
- **Timeliness weight**: Earlier RSVP = slightly more tickets
- **No-show history weight**: Reliable attendees weighted higher (connects to [reputation systems](no-show-problem.md))

The event organizer configures weights per event. The system runs the lottery automatically when spots open.

## Design Tensions
- **Transparency**: Users may distrust a system where "I RSVPed first but didn't get in." The algorithm must be explainable.
- **Weight calibration**: How much should loyalty count vs. equity? This is a values question, not a technical one.
- **Perceived fairness**: Even if mathematically fairer, lotteries *feel* less fair than queues to many users. Education and framing matter.
- **Auditability**: Every lottery draw should be logged with seed, weights, and outcome for dispute resolution. This connects to the [state machine audit trail](rsvp-state-machine.md).

## Mechanism Design Properties
Weighted lotteries are a form of [mechanism design](game-theory-rsvps.md) — engineering the rules so the desired social outcome emerges from individual participation:
- **Incentive compatibility**: Honest participation should be the best strategy (no benefit to creating fake accounts for extra tickets)
- **Individual rationality**: Entering the lottery should always be better than not entering
- **Strategy-proofness**: No user gains advantage by misrepresenting their attributes

See [Fairness Models](fairness-models.md) for comparison with other allocation approaches and formal fairness definitions.
