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

- [x] P0: harden brane file ops — path traversal guard, fd leak fix, parseInt validation
- [ ] P0: harden spin.ts — shell quoting for paths with spaces
- [ ] P1: slash command completeness — create 12 missing .claude/commands/bny.*.md wrappers
- [ ] P1: docs refresh — update AGENTS.md structure, fix README effort preset docs
- [ ] P2: CLI test suite — dispatch, arg parsing, help output, command registry consistency
- [ ] P2: cost tracking — log token usage per command, surface in bny status
- [ ] P2: brane size limits — warn when worldview exceeds threshold
- [ ] P3: secret detection — scan content before LLM API calls
- [ ] P3: model version pinning — --model flag or BNY_MODEL env var

## Completed

- [x] review cleanup — spinner unref, TL;DR consistency, DRY index regen
- [x] bny help — agent-friendly help system with grouped commands, namespace help, --json
- [x] bunny spinner — TTY-aware progress indicators across all brane commands
- [x] bny brane tldr — instant worldview outline with TL;DR synopses
- [x] TL;DR convention — all brane prompts enforce H1 + one-sentence synopsis
- [x] slash commands — .claude/commands/bny.*.md wrappers
- [x] effort presets — --effort little/some/full/max canned retry limits
- [x] permissive JSON parser — strip fences/comments/trailing commas from LLM responses

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
- [x] bny brane — eat, ask, storm, enhance, digest, pov, tldr
- [x] bny ruminate — post-build reflection feeding brane
- [x] bny map — tree-sitter structural codebase maps
- [x] bny next/spin — autonomous pipeline orchestration
- [x] bny todo/close-issue/ipm — project chores
- [x] single binary compilation — bun build --compile
- [x] bny init + install.sh — single-command project scaffolding
- [x] samples/ — 3 projects built entirely by bny
