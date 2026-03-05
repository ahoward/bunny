# Cron Parser Knowledge Base

## Core Design
- [Overview](overview.md) — Scope, 5-field cron format, field syntax (`*`, `,`, `-`, `/`)
- [Data Model](data-model.md) — Expanded sorted sets + wildcard flags; why wild flags are necessary for OR semantics
- [Algorithm Strategies](algorithm-strategies.md) — Field-by-field forward search with dynamic day-of-month; performance characteristics

## Correctness & Edge Cases
- [Edge Cases](edge-cases.md) — Impossible dates, leap years, DST, wraparound, step overflow, day-of-week normalization
- [Testing Dimensions](testing-dimensions.md) — Five test axes, test directory structure, implementation-discovered challenges

## Implementation
- [Implementation Patterns](implementation-patterns.md) — Result envelope, wildcard tracking, cursor initialization, iteration guard, days_in_month trick, OR semantics dispatch

## Context
- [Prior Art](prior-art.md) — Vixie cron, extended formats, named values, notable npm packages
