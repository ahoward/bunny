Run `bny build $ARGUMENTS` from the project root and report the result.

The dark factory. Full build pipeline or single step.

Common usage:
- `bny build "add user auth"` — full pipeline (specify → plan → review → implement → ruminate)
- `bny build implement` — just the implement step
- `bny build --dry-run "topic"` — show what would run
- `bny build specify "description"` — just create a spec

Show the result to the user.
