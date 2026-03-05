# Cron Expression Parser
A tool that validates standard 5-field cron expressions and computes the next N scheduled times from a given start time.

## Scope

- **Input**: Standard 5-field cron expressions (minute, hour, day-of-month, month, day-of-week)
- **Validation**: Confirm expressions conform to cron syntax rules
- **Computation**: Given a start time, calculate the next N times the cron schedule fires

## Key Concepts

### Five-Field Cron Format

```
┌───────────── minute (0–59)
│ ┌───────────── hour (0–23)
│ │ ┌───────────── day of month (1–31)
│ │ │ ┌───────────── month (1–12)
│ │ │ │ ┌───────────── day of week (0–7, 0 and 7 = Sunday)
│ │ │ │ │
* * * * *
```

### Core Responsibilities

| Responsibility | Description |
|---|---|
| **Parse** | Break expression into five fields |
| **Validate** | Check each field against allowed values and syntax (wildcards, ranges, steps, lists) |
| **Compute next times** | Walk forward from a start time to find the next N matching instants |

### Field Syntax Elements

- `*` — wildcard (all valid values)
- `,` — list separator (`1,15,30`)
- `-` — range (`1-5`)
- `/` — step (`*/5`, `1-30/2`)

## Tensions & Considerations

- Day-of-month and day-of-week interaction (OR vs AND semantics — standard cron uses OR when both are specified)
- Month-length edge cases (e.g., Feb 30 never fires)
- Leap year handling
- Timezone awareness (not specified — likely UTC-only for v1)
