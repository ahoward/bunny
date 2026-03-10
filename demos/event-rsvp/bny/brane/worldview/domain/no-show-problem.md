# The No-Show Problem
Free events see 30-50% no-show rates — the biggest operational failure in RSVP systems is not technical but behavioral.

## The Cost of No-Shows
- Wasted capacity that could have gone to waitlisted users
- Catering/venue costs based on inflated headcounts
- Demoralized organizers
- Waitlisted users who would have attended lose out

## Industry Data
Free events see 30-50% no-show rates. Paid events see 5-15%. The difference is skin in the game.

Primary care clinics report 10-30% no-show rates, with pediatric and community health clinics at the high end. The pattern is consistent across domains: free/low-friction reservations have the highest no-show rates.

## Predictive Models for No-Shows
Research (Huang & Hanauer, 2014) demonstrates that no-show behavior is predictable using logistic regression on historical data. Key predictive variables:
- **Prior no-show history** — strongest single predictor
- **Lead time** — longer gap between booking and event = higher no-show rate
- **Day of week / time of day** — certain slots have systematically higher no-shows
- **Insurance type / demographics** — socioeconomic factors correlate with no-show rates
- **Weather** — inclement weather increases no-shows for in-person events

Optimal models achieve ~86-90% accuracy in predicting individual show/no-show status. This enables *dynamic overbooking* — overbook only the specific slots where no-shows are predicted, rather than blanket overbooking.

## Mitigation Strategies

### Deposits / Fees
Charge a small refundable deposit. Returned if you attend or cancel before deadline. Effective but adds friction and excludes low-income attendees.

### Overbooking
Accept more RSVPs than capacity. Requires historical no-show data to calibrate. Risk: everyone actually shows up. See [Capacity as Inventory](capacity-as-inventory.md) for the perishable-inventory framing and overbooking calibration strategies (safety stock, segmented overbooking, dynamic pricing of urgency).

### Confirmation Loops
Send "Are you still coming?" 24-48 hours before. Non-responders are moved to tentative. Their spot opens for waitlist promotion. See [Notification Timing](notification-timing.md) for channel strategy and timing.

### Reputation Systems
Track attendance history. Chronic no-shows get lower priority or longer waitlist positions. Controversial — life happens, penalizing absence feels punitive. Integrates with [fairness models](fairness-models.md) via the "no-show history weight" in weighted lotteries.

### Waitlist Oversubscription
Always keep a waitlist even when capacity isn't full, to backfill no-shows on event day.

## Design Tension
Every no-show mitigation adds friction for good-faith users. The system must balance reducing no-shows against making RSVP feel welcoming and low-stakes. This parallels the [forgiveness principle](undo-and-forgiveness.md): optimize for the 99% of honest users, not the 1% gaming the system.

## Relationship to Game Theory
The no-show problem is a consequence of the [early bird dilemma](game-theory-rsvps.md): FIFO incentivizes RSVPing immediately even when unsure, which inflates no-show rates. Mechanism design solutions (deposits, reputation, confirmation loops) aim to make honest signaling the dominant strategy.
