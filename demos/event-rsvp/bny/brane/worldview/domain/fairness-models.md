# Fairness Models for Waitlist Promotion
No allocation system is universally fair — the choice of fairness model is a values statement about the community, not a technical decision.

## FIFO (First In, First Out)
The simplest model. First to waitlist, first promoted. Rewards speed, which advantages people with flexible schedules and fast internet. Most intuitive to users. **Recommended default** for this platform.

## Lottery / Random Draw
Used by high-demand events (concerts, conferences). Eliminates speed advantage. Requires a registration window followed by a draw. Changes the UX fundamentally — users register intent, then wait for results.

## Weighted Lottery
Combines multiple criteria into probabilistic allocation. Each criterion adds "lottery tickets" — more tickets = higher chance, but never certainty. See [Weighted Lottery Allocation](weighted-lottery-allocation.md) for detailed design, real-world evidence, and mechanism design properties.

Advantage: Balances competing values without forcing a rigid priority ranking. Disadvantage: Harder to explain to users than simple queues.

## Stride Scheduling (Deterministic Proportional-Share)
A deterministic counterpart to lottery scheduling (Waldspurger, 1995). Instead of random draws, each participant is assigned a **stride** inversely proportional to their weight. A running counter ("pass") tracks accumulated strides. The participant with the lowest pass value is selected next.

### How It Works for Waitlist Promotion
1. Assign each waitlisted user a weight based on criteria (loyalty, equity, timeliness, reliability)
2. Compute stride = large_constant / weight (higher weight → smaller stride → selected more often)
3. Each user has a "pass" counter starting at 0
4. When a spot opens: promote the user with the lowest pass value, then increment their pass by their stride

### Trade-offs vs. Lottery
| Property | Lottery | Stride |
|----------|---------|--------|
| Fairness guarantee | Probabilistic (over many draws) | Deterministic (exact proportional allocation) |
| Single-draw fairness | Poor (high variance) | Perfect (lowest-pass always wins) |
| Predictability | Users can't predict outcome | Users could estimate their position |
| New participant handling | Simple (assign tickets) | Needs careful pass initialization |
| Explainability | "You had a 30% chance" | "Your priority score was highest" |

**When to use stride:** Spots open gradually over time (recurring cancellations) — stride's determinism shines across multiple promotion rounds. Less suitable for one-shot batch allocations.

## Priority-Based
- Loyalty: users who've attended previous events get priority
- Engagement: users who RSVP early and rarely cancel get boosted
- Membership tier: paid members before free-tier users

## Formal Fairness Definitions (from Fair Division Theory)

| Property | Definition | RSVP Application |
|----------|-----------|------------------|
| **Proportional** | Each of N participants gets at least 1/N of the value | Each waitlisted user has at least 1/N chance of promotion |
| **Envy-free** | No participant prefers another's allocation | No waitlisted user would trade their lottery position |
| **Equitable** | All participants derive the same subjective value | Harder to achieve — different users value attendance differently |
| **Strategy-proof** | No participant benefits from misrepresenting preferences | Users can't game the system by creating alt accounts or strategic cancellation |

Pure FIFO is proportional (everyone has a fair shot if they arrive in time) but not envy-free (late arrivals envy early ones). Pure lottery is more envy-free but may not be proportional to need. Weighted lotteries attempt to satisfy multiple properties simultaneously.

The [Gibbard-Satterthwaite theorem](game-theory-rsvps.md) constrains what's achievable: no system with 3+ options can be simultaneously strategy-proof, non-dictatorial, and have unrestricted domain.

## Anti-Gaming Considerations
- Users creating multiple accounts to increase lottery odds (Sybil attacks)
- RSVP-and-cancel patterns to game loyalty scores
- Bots submitting RSVPs at millisecond precision for FIFO systems
- See [Game Theory](game-theory-rsvps.md) for mechanism design principles that minimize gaming incentives
- See [Open Questions](open-questions.md) for unresolved abuse prevention decisions
