# Roadmap

## Workflow

```
roadmap → bny specify (create spec.md)
        → bny plan (create plan.md)
        → bny tasks (create tasks.md)
        → bny review (Gemini antagonist)
        → bny implement (execute tasks)
        → If stuck → Human checkpoint
        → Complete → Update roadmap
```

## Next

- [ ] slash commands — .claude/commands/bny.*.md wrappers

## Completed

- [x] dark factory infrastructure — app.call, Result envelope, handlers, invariant tests, logging
- [x] dev scripts — setup, test, health, pre_flight, post_flight
- [x] bin/bny dispatcher — git-style routing, assassin, ralph
- [x] bny dev wrappers — thin delegates to dev/ scripts
- [x] bny specify/plan/tasks/status — feature lifecycle
- [x] bny implement — claude -p autonomous implementation
- [x] bny review — gemini antagonist + --prompt-only
- [x] bny ai init — bootstrap AI tool awareness via symlinks
- [x] absorb .specify/ into bny/ — templates, constitution, scripts eliminated
- [x] bny ps — process table scan via pgrep, no extra state
