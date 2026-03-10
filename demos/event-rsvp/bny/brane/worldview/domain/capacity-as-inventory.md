# Capacity as Inventory Management
Event capacity is perishable inventory — an empty seat at a past event has zero value, justifying more aggressive management than durable goods.

## The Inventory Analogy
| Inventory Concept | RSVP Equivalent |
|-------------------|------------------|
| SKU | Event |
| Stock quantity | Capacity |
| Order | RSVP |
| Backorder | Waitlist |
| Reserved stock | Held/pending RSVPs |
| Available-to-promise | Remaining open spots |

## What Inventory Systems Know That RSVP Systems Don't

### Available-to-Promise (ATP)
Inventory systems distinguish between physical stock and available stock. Available = physical - reserved - committed. RSVP systems often conflate "capacity" with "available," ignoring held or pending RSVPs.

**Implication:** Track `effective_capacity` (capacity minus holds, minus organizer reserves) separately from `raw_capacity`.

### Safety Stock
Inventory systems keep buffer stock for unexpected demand. Equivalent: reserve 5-10% of capacity for last-minute VIPs, organizer invites, or error correction. Most RSVP systems use 100% of capacity for general admission.

### Allocation Strategies
When demand exceeds supply across multiple channels (online, phone, walk-in), inventory systems allocate stock per channel. Equivalent: reserve slots for different RSVP sources (website, app, organizer invite, partner referral).

### Demand Forecasting
Inventory systems predict future demand to optimize stock levels. RSVP systems could use historical data to:
- Predict no-show rates per event type (see [No-Show Problem](no-show-problem.md) for predictive model research)
- Recommend capacity based on expected demand
- Optimize overbooking ratios

## The Perishability Factor
Event capacity is like airline seats or hotel rooms — perishable. An empty seat at a past event has zero value. This changes the calculus:
- **Overbooking is more justifiable** — wasted capacity is permanent loss. Evidence-based overbooking using [no-show predictive models](no-show-problem.md) reduces patient waiting by 6%+, overtime by 27%+, and total costs by 3%+ compared to flat overbooking.
- **Last-minute promotions should be aggressive** — a waitlisted user who might not show is better than an empty seat.
- **Segmented overbooking** — different rates for different event types based on historical no-show data, not a single global rate.
- **Safety stock** — reserve 5-10% capacity as buffer for overbooking overflow.

## Implications for the RSVP Data Model
- Track `effective_capacity` (capacity minus holds, minus organizer reserves) separately from `raw_capacity`
- Model RSVPs through states: `pending → accepted → attended` (the full [state machine](rsvp-state-machine.md) is richer)
- Consider a `capacity_allocation` table for multi-channel reservation
- The [concurrency patterns](concurrency-patterns-reservations.md) must protect effective_capacity, not just raw_capacity
