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

- [ ] P0: fix shell injection in --model flag — validate model name, use array spawn in implement.ts + review.ts
- [ ] P0: document secret detection — README security section, env vars, pattern list
- [ ] P0: document model pinning — README model selection section with examples
- [ ] P1: secret snippet leaks short secrets — always redact matched text ≤20 chars
- [ ] P1: SSRF guard in load_source() — blocklist private/local IPs, add --max-filesize to curl
- [ ] P1: validate --model input — reject shell metacharacters (alphanumeric/hyphens/dots only)
- [ ] P1: parse_json corrupts globs — /* in patterns and [ in prose stripped; needs smarter extraction
- [ ] P1: document cost tracking + brane size limits in README
- [ ] P1: README "most" → "all" slash commands (28/28)
- [ ] P2: extract duplicate call_claude retry logic into call_claude_with_retry<T>()
- [ ] P2: call_claude() timeout — Bun.spawnSync blocks indefinitely if claude hangs
- [ ] P2: unique temp files in implement.ts — concurrent runs collide on .bny/implement-prompt.tmp
- [ ] P2: fix AWS secret regex ReDoS — remove lookahead or simplify pattern
- [ ] P2: confirm_intake() default to no on error — currently auto-confirms on fd error
- [ ] P2: file size limit in read_dir_recursive — large files cause OOM
- [ ] P3: require() anti-pattern in log_usage() — use static import for appendFileSync
- [ ] P3: audit trail when secret scan disabled — log when BNY_SECRETS_SCAN=off is used
- [ ] P3: preview_operations Set-based diff ignores duplicate lines — use proper diff
- [ ] P3: verify binary size in README (currently says 58MB)

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
