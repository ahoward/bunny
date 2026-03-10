# Game Theory of RSVPs
RSVP systems create strategic incentives that rational users will exploit — the rules you choose determine the equilibrium behavior of your users.

## The Early Bird Dilemma
In FIFO systems, the rational move is to RSVP immediately, even if you're unsure. Cancel later if needed. This floods the system with tentative RSVPs and increases [no-show rates](no-show-problem.md).

## The Waitlist Hedge
Users RSVP to multiple competing events, planning to cancel all but one. Each event's capacity data is polluted by phantom RSVPs.

## The Cancellation Chicken
Two friends want to attend together. Both are accepted. One needs to cancel. Neither wants to cancel first because the other might then cancel too, and neither ends up going. Result: two no-shows.

## Mechanism Design Principles
Mechanism design is "reverse game theory" — instead of analyzing existing games, you design the rules to achieve a desired outcome.

- **Incentive compatibility** — the system should make honest behavior the best strategy
- **Individual rationality** — participation should be better than non-participation
- **Strategy-proofness** — no user should gain advantage by misrepresenting preferences
- **Revelation principle** — any outcome achievable by a complex mechanism can also be achieved by a "direct" mechanism where users simply report their true preferences

### Applying Mechanism Design to RSVPs
The RSVP system is a mechanism. The rules (FIFO vs lottery vs weighted lottery, cancellation policies, no-show penalties) determine equilibrium behavior. Key design levers:

1. **Make honesty optimal**: If cancellation is free and costless, dishonest RSVPs are rational. Add soft costs: reputation score, [undo grace period](undo-and-forgiveness.md) instead of instant release.
2. **Reduce information asymmetry**: Show attendee count, waitlist position, historical no-show rates — so users make informed decisions.
3. **Align incentives with capacity**: [Deposits](no-show-problem.md) align financial incentive with attendance. [Confirmation loops](no-show-problem.md) align attention with intent.

### The Gibbard-Satterthwaite Constraint
No voting/allocation system with 3+ options can be simultaneously strategy-proof, non-dictatorial, and have unrestricted domain. For RSVPs: you *cannot* build a perfect system where no one ever benefits from gaming. You can only minimize the gain from gaming. This is why [fairness models](fairness-models.md) involve trade-offs, not solutions.

## Real-World Parallels
| Domain | Gaming Problem | Solution |
|--------|---------------|----------|
| Restaurant reservations | No-shows | Deposits and no-show fees |
| College admissions | Multiple applications | Binding early decision |
| Organ donation | Free-riding | Priority for registered donors |
| Airline overbooking | Empty seats | Auction-based bumping |
| COVID-19 vaccines | Equity vs. speed | [Weighted lotteries](weighted-lottery-allocation.md) |

## Implication
The RSVP model isn't just a database schema — it's a mechanism design problem. Every architectural decision in this knowledge base (fairness model, cancellation policy, promotion timing, undo window) has game-theoretic consequences.
