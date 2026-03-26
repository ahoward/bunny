# Bunny - Agent Protocol

## What This Is

Bunny is a Bun + TypeScript CLI that manages a persistent knowledge graph and build factory for software projects. Auto-initializes on first use — no setup required.

## TL;DR

```bash
bny hop "add user auth"         # the whole thing: spec → plan → test → build
bny spike "prototype X"         # same thing, no guardrails
bny brane ask "how does X work" # query the knowledge graph
bny digest docs/                # feed it knowledge
bny brane storm "topic"         # brainstorm
bny brane tldr                  # what does the brane know?
```

`hop` is the main loop. `spike` is the sandbox. `brane` is the memory. Everything else is plumbing.

## Key Files

- `./bny/roadmap.md` - **START HERE** — Driving task list for all development
- `./bny/guardrails.md` - Machine-readable agent constraints

## Protocol

**You MUST follow this protocol. It is not optional.**

| When | Run | Why |
|------|-----|-----|
| Before starting work | `./dev/pre_flight` | Confirms environment is ready |
| After any code change | `./dev/test` | Catches regressions immediately |
| Before committing | `./dev/post_flight` | Enforced by git hook — commit will fail if broken |
| To check system health | `./dev/health` | Exercises app infrastructure beyond ping |
| After cloning | `./dev/setup` | Installs deps, configures git hooks |

All scripts return structured output (Result envelope or exit codes). Parse them, don't ignore them.

### Guardrails

Read `bny/guardrails.md` before starting work. It defines:
- **protected_files** — never modify without human approval
- **blast_radius** — max files/lines per PR, dependency rules
- **forbidden_actions** — never do these autonomously
- **require_human_approval** — ask before doing these

### After completing work

Append a one-liner to `bny/decisions.md` recording what you did and why.

## Development Process: Antagonistic Testing

1. **Design Interface** — Define public API
2. **Design Tests (Claude)** — Write test cases
3. **Review Tests (Gemini)** — Antagonist review, incorporate suggestions
4. **Implement** — Write code
5. **Loop Until Green** — Fix failures, re-run tests
6. **If Stuck → Human Checkpoint** — Only when tests cannot pass

Rules:
- Tests MUST exist before implementation
- Gemini reviews tests, finds blind spots
- After Gemini review, tests are LOCKED
- Human checkpoint ONLY when stuck (not pre-approval)
- No changing tests after review without human approval

## Coding Conventions

1. **POD only** - Plain Old Data in/out, no classes for data
2. **Guard early** - Return errors at function top
3. **snake_case** - Variables, functions, file names
4. **null over undefined** - Explicit absence
5. **Simplicity** - Three similar lines > one premature abstraction

## Commands

```bash
./dev/setup        # Install deps, configure git hooks
./dev/test         # Run tests
./dev/health       # Check system health
./dev/pre_flight   # Pre-work validation
./dev/post_flight  # Pre-commit validation
```

## Directory Structure

```
src/              # CLI source code (the dark factory)
  lib/            # shared modules (assassin, ralph, feature, prompt, brane, map, spinner, log, result, types)
  brane/          # knowledge commands (digest, ask, storm, enhance, rebuild, lens, tldr, loop)
  dev/            # wrappers for ./dev/* scripts
  templates/      # spec, plan, tasks templates
  hop.ts          # the dark factory — unified 4-phase pipeline
  spec.ts         # phase 1: specify + challenge
  plan-phase.ts   # phase 2: plan + tasks
  test-phase.ts   # phase 3: 3×3 narrowing
  build-phase.ts  # phase 4: implement + verify + retro + ruminate
  build.ts        # legacy full pipeline (deprecated, use hop)
  init.ts         # scaffold a project (guest mode, auto-runs on first use)
  uninit.ts       # cleanly remove all bny traces
  ...             # specify, plan, tasks, implement, review, ruminate, etc.
  handlers/       # app.call handlers (one file per endpoint)
tests/            # tests
  fixtures/       # deterministic test inputs (POD)
bin/              # executables (bny entry point)
bny/              # project state (tracked)
  roadmap.md      # what to work on next
  guardrails.md   # agent constraints
  decisions.md    # append-only decision log
dev/              # dev tooling (shebang, chmod +x, per-project customizable)
.githooks/        # git hooks (pre-commit, pre-push)
```

## Workflow: Picking Up Work

1. Run `./dev/pre_flight` — confirm environment is ready
2. Read `bny/roadmap.md` — find "Next" item
3. Read `bny/guardrails.md` — know the constraints
4. Run `bny hop "description"` — full 4-phase pipeline (spec → plan → test → build)
5. Or run phases individually: `bny spec "desc"`, `bny plan`, `bny test`, `bny build`
6. For exploratory work: `bny spike "description"` — same phases, guardrails off
7. Run `./dev/test` after every change
8. Run `./dev/post_flight` before committing
9. If stuck (tests won't pass) → Human checkpoint
10. On completion → Update bny/roadmap.md, append to `bny/decisions.md`

## Don't

- Use classes for data
- Throw exceptions for control flow
- Implement without tests
- Skip Gemini review
- Change tests after review without human approval
- Commit without running `./dev/post_flight`
- Ignore `bny/guardrails.md` constraints
- Modify protected files without human approval
