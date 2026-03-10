# Real-Time Updates and Live Capacity
Users staring at a full event page want to know the instant a spot opens — but real-time capacity displays can cause more problems than they solve.

## What Should Be Real-Time?
- **Capacity counters** — "3 spots remaining" should update live
- **Waitlist position** — "You are #5" dropping to #4 without refresh
- **Event status changes** — cancelled, time changed, location changed
- **Promotion notifications** — "A spot opened! Confirm now"

## What Should NOT Be Real-Time?
- Attendee list (too much churn, [privacy implications](privacy-and-visibility.md) of seeing names appear/disappear)
- Historical event data
- Organizer analytics (batch updates are fine)

## Implementation Patterns

### ActionCable / WebSockets
Rails-native. Each event gets a channel. Capacity changes broadcast to all subscribers.
```ruby
EventChannel.broadcast_to(event, { spots_remaining: event.spots_remaining })
```
**Trade-off:** Persistent connections consume server resources. 10,000 users watching a popular event = 10,000 open connections.

### Server-Sent Events (SSE)
One-directional (server → client). Lower overhead than WebSockets. Sufficient for capacity updates where the client only listens.

### Polling with ETag
Simplest. Client polls every 5 seconds. Server returns 304 Not Modified if nothing changed. Low engineering cost, acceptable latency for most events. **Recommended starting point** — upgrade to WebSockets only when polling creates measurable load.

## The Stale Data Problem
User sees "1 spot remaining" (real-time update). Clicks RSVP. By the time the POST reaches the server, the spot is taken. The real-time display created false hope and a worse experience than showing "almost full" would have.

**Mitigation:** Show fuzzy availability at low counts: "Almost full" or "fewer than 5 spots" instead of exact numbers. This sets expectations without promising a specific count.

## Thundering Herd via Real-Time
Real-time updates can cause [thundering herds](distributed-failure-modes.md): broadcast "1 spot available" → 500 users simultaneously hit the RSVP endpoint.

**Mitigation:** Stagger broadcasts with jitter. Or don't broadcast exact counts below a threshold — just broadcast "spots available" / "waitlist only." This aligns with the fuzzy availability approach above.

## Offline and Reconnection
Mobile users lose connectivity. When they reconnect:
- Resync current state (not replay all missed events)
- If they were promoted while offline, is the [promotion window](rsvp-state-machine.md) still valid? Start the timer from acknowledgment, not from send.
- Optimistic UI: show last-known state with a "refreshing..." indicator
