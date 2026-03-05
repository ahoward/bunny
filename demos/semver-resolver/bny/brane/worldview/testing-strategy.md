# Testing Strategy
The test suite uses a layered architecture: contracts (spec acceptance), boundaries (edge cases), properties (invariants), and golden files (regression).

## Test Organization (What Worked)
```
tests/
  contracts/        # Spec-driven acceptance tests (US-001 through US-011)
    parse.test.ts
    compare.test.ts
    satisfies.test.ts
  boundaries/       # Edge cases and challenge scenarios
    edge_cases.test.ts
  properties/       # Invariant-based tests
    round_trip.test.ts
  golden/           # Golden file regression tests
    golden.test.ts
    satisfies.golden.json
```

### Why This Layering Works
- **Contracts** map 1:1 to user stories — easy to verify spec coverage
- **Boundaries** catch the tricky interactions (pre-release + caret, hyphen ambiguity, integer overflow)
- **Properties** verify structural invariants (round-trip, monotonicity) without enumerating cases
- **Golden files** provide regression safety from a known-good oracle (node-semver compatibility)

## High-Value Test Vectors
These cases caught real bugs during implementation:
- `satisfies('1.0.0-beta', '>=1.0.0')` → false (pre-release gate)
- `satisfies('0.0.4', '^0.0.3')` → false (zero-zero caret)
- `satisfies('2.4.0', '1.2.3 - 2.3')` → false (partial right hyphen)
- `satisfies('1.0.0-rc.1', '*')` → false (wildcard pre-release leakage)
- `satisfies('2.0.0-alpha', '<2.0.0')` → false (pre-release cross-contamination)
- `satisfies('1.2.3', '1.x.x')` → true (multi-segment wildcard)

## Antagonistic Testing Protocol
Tests were written before implementation and reviewed by an antagonist agent. After review, tests were locked — implementation had to pass them, not the other way around. This caught several design assumptions that would have been silently wrong.
