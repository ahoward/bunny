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

- [ ] bny ai init — bootstrap any AI tool's awareness of bny via symlinks
- [ ] bny ps — show running bny processes
- [ ] absorb .specify/ into bny/ — eliminate spec-kit dependency
- [ ] slash commands — .claude/commands/bny.*.md wrappers

## Completed

- [x] dark factory infrastructure — app.call, Result envelope, handlers, invariant tests, logging
- [x] dev scripts — setup, test, health, pre_flight, post_flight
- [x] bin/bny dispatcher — git-style routing, assassin, ralph
- [x] bny dev wrappers — thin delegates to dev/ scripts
- [x] bny specify/plan/tasks/status — feature lifecycle
- [x] bny implement — claude -p autonomous implementation
- [x] bny review — gemini antagonist + --prompt-only
