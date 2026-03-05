# Prior Art & Alternative Cron Formats
The 5-field cron format is just one dialect in a family of scheduling syntaxes worth understanding.

## Vixie Cron (Standard)

The reference implementation. 5 fields, OR semantics for day-of-month/day-of-week, supports `*`, `,`, `-`, `/`. This is what we're implementing.

## Extended Cron (6-7 fields)

- **Seconds field** (position 0): Used by Quartz, Spring, many job schedulers
- **Year field** (position 6): Quartz-specific
- Not in scope but worth noting as a future extension vector

## Named Values

- `JAN-DEC` for months, `SUN-SAT` for days — common extension
- Some implementations also support `L` (last day of month), `W` (nearest weekday), `#` (nth weekday)

## Systemd Timers

An alternative to cron entirely, using calendar expressions like `*-*-* 00:00:00` with different semantics.

## Human-Readable Libraries

- `every 5 minutes`, `at 3pm on weekdays` — NLP-style scheduling
- These typically compile down to cron or an equivalent internal representation

## Notable npm Packages

- `cron-parser` — the dominant Node.js library; supports seconds, timezone
- `croner` — modern, lightweight, Deno/Bun compatible
- `node-cron` — validation + scheduling combined

## What This Project Can Learn

Studying how `cron-parser` handles field expansion and next-time iteration would inform our algorithm choice. Its test suite is also a goldmine of edge cases.
