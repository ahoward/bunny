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
| 2026-03-25 | Boot context engine: load_boot_context(root, phase) | Phase-aware context assembly. test-gen rejected (throws). Token-budgeted map (80k char threshold). Zero-state = no specs + ≤2 decision rows. |
| 2026-03-25 | Boot context wired into specify, plan, implement | specify gets full context + writes change specs (evolve mode). plan gets full context + codebase map. implement gets decisions + guardrails + compact file list. test-gen untouched (adversarial isolation). Sandwich prompt pattern (context/task/reminder). |
| 2026-03-25 | SpecMode flipped: "evolve" is default, "new" is escape hatch | Every hop is evolution. Zero-state detection auto-falls back to greenfield mode. --force-new still works. Old "auto"/"greenfield"/"iteration" types replaced with "evolve"/"new". |
| 2026-03-26 | `ensure_initialized()` auto-creates `bny/` on first use | `find_root()` calls it when no `bny/` found. Requires `.git` (won't init in random dirs). Quiet, idempotent. Removes need for explicit `bny init` before `bny hop`. |
| 2026-03-26 | Roadmap guard removed from `hop.ts` and `build.ts` | Auto-init creates roadmap.md, so the guard was dead code. `bny hop` just works now. |
| 2026-03-26 | Fixed stale `mode: "auto"` in spike.ts and next.ts | SpecMode was changed to "evolve"/"new" but spike.ts and next.ts still passed "auto". Changed to "evolve". |
| 2026-03-26 | `session_id_for()` hashes slug to UUID v4 format | Claude CLI rejects non-UUID session IDs. MD5 hash of human-readable slug, formatted as UUID v4 with version/variant bits set. Deterministic and reproducible. |
| 2026-03-26 | QA harness: black-box adversarial testing at `qa/run.ts` | 3 canonical suites (semver, kv-store, json-patch). Runs `bny hop`, evaluates with both claude and gemini. KPI tracking over time. Zero shared code with bunny. |
| 2026-03-26 | QA baseline tracked in `qa/baseline.json` (git-tracked) | Scores travel with the repo. `--summary` shows delta from baseline. `--baseline` snapshots current scores. |
| 2026-03-26 | test-gen: enforce test framework imports, mandate edge case coverage | Gemini was generating `@jest/globals` imports (caused 2/3 build failures). Edge case tables in specs were systematically ignored — now mandatory. |
| 2026-03-26 | test-gen: adversarial property generators + error contract rigor | Property test generators were restricted to safe inputs, missing real bugs. Error tests were boolean-only (`.toThrow()` without shape). Now requires adversarial inputs and specific error assertions. |
| 2026-03-26 | verify.ts: inline full source code instead of outline | Gemini couldn't find bugs when it could only see file names. Now sees full implementation. |
| 2026-03-26 | implement.ts: remove escape hatch, mandate loop-until-green | "Stop after 3 attempts" let Claude give up. Now must exit 0 before finishing. QA hop timeout bumped to 30min. |
| 2026-03-26 | test-gen: domain correctness validation + API rigor | Gemini wrote tests with factually wrong assertions (e.g., 2.0.0 satisfies ^1.0.0). Now required to validate assertions against real domain rules. HTTP tests must assert headers + error shapes. |
| 2026-03-27 | `tests/SPEC.md` — behavioral spec document (#25) | Human-readable behavioral contract. Every line has a traceable ID (DOMAIN-NNN) mapping 1:1 to contract tests. Generated by `bny spec-doc` during spec phase. The review surface — a domain expert reads this instead of the code diff. |
| 2026-03-27 | Adversarial test locking (#25) | After test-gen rounds, tests are copied to `tests/adversarial/<feature>/` and registered as protected in guardrails.json. One-way ratchet — implementation cannot weaken locked tests. |
| 2026-03-27 | Review artifact generation (#25) | `specs/<feature>/review.md` — structured build summary (SPEC.md diff, test totals, adversarial findings, files changed). What a human reviewer reads instead of the code diff. Generated after verify, before retro. |
| 2026-03-27 | Two-pass verify: adversarial + behavioral (#25) | Split verify into two gemini passes. Adversarial reads full source (finds bugs). Behavioral reads SPEC.md + artifact only (checks completeness). Preserves adversarial independence while keeping bug-finding power. |
| 2026-03-27 | spec-doc.ts: mkdir before write + try/catch wrapper | ENOENT crash when tests/ didn't exist in fresh projects killed the entire hop pipeline. Root cause fix + defense-in-depth catch in spec.ts. |
| 2026-03-27 | `dev/bg` — detached background job runner | Long-running processes (QA suites, 30+ min) get killed by tool session recycling. setsid + disown gives jobs their own process group. Status/output/tail/kill via simple CLI. |
| 2026-03-27 | QA baseline updated: 1.79 → 2.47 (+0.68) | Round 2 prompt improvements + issue #25 pipeline changes. semver +1.67, json-patch +0.75, kv-store -0.38 (build failure). Gemini eval JSON parsing still broken (returns 0s). |
