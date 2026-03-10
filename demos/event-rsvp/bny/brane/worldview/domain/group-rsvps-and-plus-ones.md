# Group RSVPs and Plus-Ones
A group RSVP for N people consumes N capacity slots, creating partial-fit problems that don't exist in the one-person-one-RSVP model.

## Scenarios
- "RSVP for me + 1 guest" (unnamed plus-one)
- "RSVP for me and 3 named colleagues" (group booking)
- "RSVP for my team of 8" (bulk reservation)

## Capacity Complications
- A +2 RSVP consumes 3 capacity slots, not 1. The [concurrency patterns](concurrency-patterns-reservations.md) must account for `party_size` in the capacity check.
- If the primary cancels, all guests lose their spots (cascading cancellation). The [undo grace period](undo-and-forgiveness.md) is especially important here — accidentally cancelling a group RSVP affects multiple people.
- Can a guest be promoted independently from the primary? Generally no — the group is an atomic unit.
- Waitlist position: does a group of 4 need 4 contiguous slots, or can they be split? See the partial fit problem below.

## The Partial Fit Problem
Capacity has 2 remaining slots. Next on waitlist is a group of 3. Options:
1. **Skip them** and promote the solo person behind them. Unfair to the group, but maximizes utilization.
2. **Hold slots open** hoping more cancel. Wastes capacity in the meantime.
3. **Offer partial promotion** — "2 of your 3 can attend." Most flexible but complex UX.

This is a variant of the bin-packing problem. No clean solution exists.

### Implemented Solution: Skip with Retained Position
The promotion algorithm iterates waitlisted RSVPs in position order. For each:
- If `party_size <= spots_remaining`: promote (accept, clear position, increment counter by `party_size`)
- If `party_size > spots_remaining`: **skip, retain position** — the group stays in its original place

After all promotions, positions are recalculated sequentially. Skipped groups are re-evaluated every time new capacity opens. This maximizes utilization without penalizing large groups.

**Trade-off:** A group of 5 at position 1 can be indefinitely stuck if only 1-2 spots open at a time. This is acceptable for FIFO fairness — the group chose a large party size knowing the trade-off.

See [Error Recovery](error-recovery-ux.md) for how partial success in group RSVPs is communicated via the API.

## Model Impact
The RSVP entity needs:
- `party_size` field (default 1, per [Progressive Disclosure](progressive-disclosure-api.md))
- Primary/guest relationship (optional — unnamed plus-ones need only a count)
- Cascading cancellation rules

## Headcount Tracking
`accepted_count` on Event tracks **headcount** (sum of party_size across accepted RSVPs), not the number of RSVP records. Every capacity check, increment, and decrement uses `party_size`:
- Creation: `accepted_count + party_size <= capacity`
- Cancellation: `accepted_count -= party_size`
- Promotion: `accepted_count += party_size`

## Open Questions
- Maximum party size per RSVP? Global max and per-event max. See [Open Questions](open-questions.md).
- Do guests need accounts, or are they just headcount? For [privacy](privacy-and-visibility.md) and [no-show tracking](no-show-problem.md), named guests are better. For simplicity, headcount is sufficient.
- How do plus-ones interact with the [fairness model](fairness-models.md)? A group of 4 entering a weighted lottery has 4x the capacity impact of a solo RSVP. Should their lottery weight be divided by party size?
