# Psychology of Waiting
Queue psychology research reveals that perceived fairness and uncertainty management matter more than actual wait time.

## Key Principles from Queue Theory

### Occupied time feels shorter than unoccupied time
Giving users something to do (share referral link, check position, engage with content) reduces perceived wait. The referral mechanic serves double duty: growth driver AND psychological occupation.

### Uncertain waits feel longer than known, finite waits
Showing position (#847 of 2,341) reduces anxiety vs. "you're on the list." But exact position can backfire — #847 feels hopeless. A range or tier ("top 10%") may work better.

### Unfair waits feel longer
If referral-bumping is visible ("you dropped from #50 to #78 because others got referrals"), it breeds resentment. Users should only see forward movement or stability, never regression.

### Social proof accelerates commitment
"4,231 people are waiting" signals demand. But showing the number growing while your position stalls is demoralizing. Careful what metrics are exposed.

## Implications for the API
- Position display should be designed, not just exposed as a raw number
- The API should support "position context" — not just rank, but framing (percentile, tier, estimated time)
- Movement notifications should emphasize progress, not displacement
- Consider hiding exact positions and showing bands: "You're in the first 100" or "Top 5%"
