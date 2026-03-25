# Decision Log

Append-only record of decisions made during development.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-04 | `bny init` uses marker-delimited blocks instead of replacing files | guest, not landlord — append to existing files, never clobber |
| 2026-03-04 | `bny uninit` added for clean removal | fully reversible drop-in requires a way to fully reverse |
| 2026-03-04 | `bny ai init` absorbed into `bny init`, deleted `bny/ai/` | one command does everything, fewer moving parts |
| 2026-03-04 | AGENTS.md moved from `bny/` to repo root as real file | CLAUDE.md/GEMINI.md symlink to it; bny/AGENTS.md was confusing (described bny internals, not usage) |
| 2026-03-04 | 32 slash commands consolidated into single `/bny` | bny already has its own dispatcher; one command rules them all |
| 2026-03-04 | BUNNY_LOG inverted to opt-in (`BUNNY_LOG=1`) | every caller was suppressing it with `BUNNY_LOG=0`; default should match common case |
| 2026-03-04 | Tracked state lives in `bny/`, not `.bny/` | `.bny/` is dead; `bny/` is the single state directory for any project |
| 2026-03-04 | CLI source moved from `bny/` to `src/` | `bny/` is project state only; `src/` + `bin/` hold all CLI source code |
| 2026-03-08 | 3×3 narrowing replaces test-gen+review+implement | 3 rounds of increasingly adversarial tests (contracts→properties→boundaries). rounds 2-3 see Claude's source. review absorbed — narrowing IS review with teeth. max 9 test runs, typical ~4. |
| 2026-03-08 | post_flight scoped to `./tests/` | bare `bun test` was picking up demo test files in `demos/` |
| 2026-03-14 | `call_claude_structured<T>()` with `--json-schema` | eliminates parse failures — API guarantees valid JSON matching schema, no more retry loops |
| 2026-03-14 | Claude timeout bumped from 300s to 600s | storm was timing out on large worldviews in real usage |
| 2026-03-14 | Uniform `read_input()` across all commands | positional = inline text, `-` = stdin, `--input <path>` = file. No `existsSync` guessing. Unix-y and consistent |
| 2026-03-14 | `--verbose` global flag streams LLM stderr | callers (Claude Code) couldn't tell if bny was hung or thinking. `BNY_VERBOSE=1` inherits subprocess stderr |
| 2026-03-15 | Subprocess sandbox: deny-list env, `--session-id` replaces `--continue` | `--continue` caused session bleed (subprocess wrote to host session). Deny-list is default-open (pass everything, strip known-bad); optional allowlist for paranoid mode. Sandbox is a POD value, not a container. |
| 2026-03-16 | plan/tasks return 0 when artifact exists (idempotent) | `bny build` resume was broken because plan/tasks errored on existing files. Idempotent steps enable re-running the pipeline after interruption. |
| 2026-03-16 | `bny version` skips project root requirement | version reports the tool's own info, not the project's. Works from any directory. `NO_ROOT_COMMANDS` list in dispatcher. |
| 2026-03-16 | version handler resolves own package.json via import.meta.dir | Avoids reading CWD's package.json when run from a different directory. Uses Bun.spawnSync directly (not spawn_sync) to avoid progress logging to stderr. |
| 2026-03-25 | `bny hop` replaces `bny build` as the top-level pipeline command | 4-phase model (spec/plan/test/build) is simpler to remember and supports both greenfield and iteration. Old `bny build "desc"` delegates to hop with deprecation warning. Phases are individually runnable: `bny spec`, `bny plan`, `bny test`, `bny build`. |
| 2026-03-25 | Auto-detect greenfield vs iteration in spec phase | `--force-new` / `--force-evolve` overrides. Default is auto. Detection heuristic lives in the specify step — claude reads codebase context and decides. |
| 2026-03-25 | next.ts and spike.ts refactored to use phase functions | Eliminated duplicated pipeline orchestration. Both now call `run_spec()`, `run_plan_phase()`, `run_test_phase()`, `run_build_phase()` from phase modules. |
| 2026-03-25 | specify.ts parses --force-new/--force-evolve explicitly | Previously flags were eaten as positional args, corrupting feature names. Prerequisite for boot context (#18). |
| 2026-03-25 | test-gen.ts uses temp file + stdin for gemini prompts | CLI arg delivery hit ARG_MAX with large prompts. Now uses same temp file pattern as implement.ts. |
| 2026-03-25 | load_constraints() reads guardrails.md, not guardrails.json | guardrails.json never existed. guardrails.md is the real file. Fallback to .json preserved for legacy. |
| 2026-03-25 | format_compact() added to map.ts | File-paths-only codebase map for token-budgeted contexts. Used by boot context for implement phase. |
