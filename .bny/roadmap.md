# Roadmap

## Workflow

```
seed → feed brane → think (loop/storm/enhance)
     → propose → build (specify → plan → review → implement → ruminate)
     → brane learns → next cycle
```

## Next

- [x] M1: `bny build` — collapse factory into single command with subcommands
- [x] M2: `bny spike` — same interface as build, guardrails off
- [x] M3: decouple specify from git branches — specify creates spec without `git checkout -b`; .bny/current-feature state file tracks active feature
- [x] M4: auto-ruminate on build — build and spike both ruminate on completion
- [x] M5: loop→propose pipeline — `--propose [N]` flag on bny brane loop
- [x] M6: slash commands for new commands — .claude/commands wrappers for build, spike
- [x] M7: update CLAUDE.md — workflow section reflects build/spike

### hardening (carried forward)

- [ ] P0: fix shell injection in --model flag — validate model name, use array spawn in implement.ts + review.ts
- [ ] P1: SSRF guard in load_source() — blocklist private/local IPs, add --max-filesize to curl
- [ ] P1: validate --model input — reject shell metacharacters (alphanumeric/hyphens/dots only)
- [ ] P1: parse_json corrupts globs — /* in patterns and [ in prose stripped; needs smarter extraction
- [ ] P2: extract duplicate call_claude retry logic into call_claude_with_retry<T>()
- [ ] P2: call_claude() timeout — Bun.spawnSync blocks indefinitely if claude hangs
- [ ] P2: unique temp files in implement.ts — concurrent runs collide on .bny/implement-prompt.tmp
- [ ] P2: confirm_intake() default to no on error — currently auto-confirms on fd error

## Completed

- [x] P0: harden brane file ops — path traversal guard, fd leak fix, parseInt validation
- [x] P0: harden spin.ts — shell quoting for paths with spaces
- [x] P1: slash command completeness — create 10 missing .claude/commands/bny.*.md wrappers
- [x] P1: docs refresh — update AGENTS.md structure, fix README effort preset docs
- [x] P2: CLI test suite — dispatch, arg parsing, help output, command registry consistency
- [x] P2: cost tracking — log token usage per command, surface in bny status
- [x] P2: brane size limits — warn when worldview exceeds threshold

- [x] P3: secret detection — scan content before LLM API calls
- [x] P3: model version pinning — --model flag or BNY_MODEL env var
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
