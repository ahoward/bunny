# Decision Log

Append-only record of decisions made during development.
Each entry includes date, decision, and brief rationale.

**Rules:**
- Append only — never edit or delete previous entries
- One line per decision
- Keep rationale to one sentence

## Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-14 | Lifted app.call + Result envelope pattern from brane | Proven handler registry with typed envelopes and optional emit callbacks |
| 2026-02-14 | Named global object `app` instead of `sys` | Broader than API, clearer than sys — it is the running application context |
| 2026-02-14 | Dev tooling lives in `./dev/` with shebangs, not package.json | Pure Unix — any language, tab-completable, no indirection |
| 2026-02-14 | Merged budget/scope and blast radius into single guardrails.json | One source of truth for all agent constraints |
| 2026-02-14 | Used tests/fixtures/ instead of tests/.seeds/ for tracked test data | .seeds/ is gitignored; fixtures need version control |
| 2026-02-14 | Structured logging defaults ON, disable with BUNNY_LOG=0 | Dark factory needs observability by default |
| 2026-02-18 | Created unified bny CLI with bin/bny dispatcher, assassin, ralph | Single entry point for dark factory; three-layer dispatch (slash → bny → dev) |
| 2026-02-18 | No SQLite — filesystem is the database, git is coordination | Multi-developer simplicity; all shared state comes from git/filesystem |
| 2026-02-18 | Moved roadmap, guardrails, decisions, agent-protocol from dna/ to bny/ | dna/ is pure context with zero operational dependencies; bny/ owns all operational state |
| 2026-02-18 | bny dev wrappers delegate to dev/ scripts, don't replace them | Three-layer dispatch preserved; dev/ stays per-project customizable plumbing |
| 2026-02-18 | Feature lifecycle ported from bash (.specify/) to bun (bny/lib/feature.ts) | Consistent with project language; shared module for specify/plan/tasks/status |
| 2026-02-18 | bny implement shells out to claude -p --continue --dangerously-skip-permissions | Single-pass execution; ralph handles retries at dispatcher level |
| 2026-02-18 | bny review shells out to gemini -p with --prompt-only fallback | Antagonist review automated; prompt-only mode when gemini unavailable |
| 2026-02-18 | Absorbed .specify/ into bny/ — templates, constitution, scripts all moved or deleted | bny is now self-contained; no spec-kit dependency |
| 2026-02-18 | bny ai init creates symlinks only, no content generation | agent-protocol.md is the single source of truth; symlinks point all agents to it |
| 2026-02-18 | bny ps scans process table via pgrep, no extra state files | Pure Unix — pidfile + pgrep is sufficient for process discovery |
| 2026-03-01 | Slash commands as .claude/commands/bny.*.md — thin wrappers that run bny CLI | Three-layer dispatch: /bny.specify → claude runs `bny specify` → bny handles everything |
| 2026-03-01 | bny ruminate — post-implementation reflection feeding brane | Closes the strange loop: build → reflect → grow; reuses brane eat machinery, no source stash |
| 2026-03-01 | bny map — tree-sitter WASM for structural codebase maps | Native bindings failed (C++20 node-gyp), WASM works clean; web-tree-sitter + tree-sitter-wasms = 2 deps, multi-language |
| 2026-03-01 | bny map auto-generates extractors for unknown languages via Claude | Factory builds its own eyes: parse sample file → dump AST → Claude writes extractor → cache in .bny/map/extractors/ |
| 2026-03-01 | samples/ directory — 3 projects built entirely headless by bny | Proof the factory works: mood (API), tldr (CLI), shelf (API+sqlite); each from a one-paragraph seed, 3 spins |
| 2026-03-01 | Sample projects symlink bny/ from parent, own .bny/ state | Real-world usage pattern: shared tooling, per-project state; demonstrates bny portability |
| 2026-03-01 | bny brane storm + enhance — divergent/convergent brane tools | Storm expands outward (brainstorm), enhance sharpens inward (refine); both use intake gate + regenerate_index; extracted shared regenerate_index() helper to brane.ts |
| 2026-03-01 | Compile bny to single binary via bun build --compile | All 26 subcommands refactored to export main(argv), renamed to .ts, unified entry point with command registry for in-process dispatch; 58MB arm64 binary |
| 2026-03-01 | bny init — scaffold projects with a single command | Creates .bny/, dev/, .githooks/ with lean defaults; idempotent (skips existing); --minimal for just state |
| 2026-03-02 | bny help — agent-friendly help system with grouped commands and JSON output | COMMAND_META registry parallel to COMMANDS; `bny help`, `bny brane`, `bny help --json` all work; stdout for help, stderr for errors |
| 2026-03-02 | Bunny spinner — TTY-aware progress indicator with bunny emoji frames | Zero deps, writes to stderr, degrades to plain text when piped or CI; wraps all call_claude() sites |
| 2026-03-02 | TL;DR convention — worldview files must start with H1 then one-sentence synopsis | Baked into all brane prompts (eat/enhance/storm/digest/ruminate); enables instant `bny brane tldr` without LLM |
| 2026-03-02 | bny brane tldr — instant worldview outline by reading file tree + extracting TL;DR lines | Zero LLM, graceful degradation for pre-convention files; --json for agents |
| 2026-03-02 | Permissive JSON parser — strip prose/fences/comments/trailing commas from LLM responses | Single parse_json() in brane.ts handles all cases; strict-first with permissive fallback; replaced ipm.ts inline copy |
| 2026-03-02 | --effort presets + implicit ralph — `bny --effort some implement` replaces `bny --ralph --max-iter 5` | Four levels: little/some/full/max; --max-iter alone implies --ralph; backwards compatible |
| 2026-03-02 | Review-driven cleanup — spinner unref, TL;DR wording standardization, DRY index regen | Timer.unref() prevents leaks; canonical TL;DR text in all 5 prompts; eat/digest/ruminate now use shared regenerate_index() |
