# Bunny - Agent Protocol

## What This Is

Bunny is a Bun + TypeScript CLI that manages a persistent knowledge graph for software projects.

## Key Files

- `./.bny/roadmap.md` - **START HERE** — Driving task list for all development
- `./.bny/guardrails.json` - Machine-readable agent constraints

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

Read `.bny/guardrails.json` before starting work. It defines:
- **protected_files** — never modify without human approval
- **blast_radius** — max files/lines per PR, dependency rules
- **forbidden_actions** — never do these autonomously
- **require_human_approval** — ask before doing these

### After completing work

Append a one-liner to `.bny/decisions.md` recording what you did and why.

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
src/              # source code
  handlers/       # app.call handlers (one file per endpoint)
  lib/            # shared types, result helpers, logging
tests/            # tests
  fixtures/       # deterministic test inputs (POD)
bin/              # executables (bny entry point)
.bny/             # project state (git-tracked, per-project)
  roadmap.md      # what to work on next
  guardrails.json # agent constraints
  decisions.md    # append-only decision log
bny/              # dark factory CLI — tool code (symlinkable)
  lib/            # shared modules (assassin, ralph, feature, prompt, brane, map, spinner)
  brane/          # knowledge commands (eat, ask, storm, enhance, rebuild, lens, tldr, loop)
  dev/            # wrappers for ./dev/* scripts
  templates/      # spec, plan, tasks templates
  build.ts        # the dark factory (full pipeline or per-step)
  spike.ts        # exploratory build (guardrails off)
  digest.ts       # top-level digest command (URI scheme support)
  proposal.ts     # brane → roadmap bridge
  specify.ts      # create feature spec
  plan.ts         # create implementation plan
  tasks.ts        # generate task list
  implement.ts    # claude autonomous implementation
  review.ts       # gemini antagonist review
  ruminate.ts     # reflect on build, feed brane
  status.ts       # show feature state
  next.ts         # full pipeline for next roadmap item
  spin.ts         # autonomous factory run (tmux)
  map.ts          # structural codebase map (tree-sitter)
  todo.ts         # project chore tracking
  close-issue.ts  # close github issue
  ipm.ts          # iteration planning meeting
  ps.ts           # show running bny processes
  init.ts         # scaffold a project (guest mode)
  uninit.ts       # cleanly remove all bny traces
dev/              # dev tooling (shebang, chmod +x, per-project customizable)
.githooks/        # git hooks (pre-commit, pre-push)
```

## Workflow: Picking Up Work

1. Run `./dev/pre_flight` — confirm environment is ready
2. Read `.bny/roadmap.md` — find "Next" item
3. Read `.bny/guardrails.json` — know the constraints
4. Run `bny build "description"` — full pipeline (specify → plan → tasks → review → implement → ruminate)
5. Or run steps individually: `bny build specify "desc"`, `bny build plan`, etc.
6. For exploratory work: `bny spike "description"` — same steps, no review
7. Run `./dev/test` after every change
8. Run `./dev/post_flight` before committing
9. If stuck (tests won't pass) → Human checkpoint
10. On completion → Update .bny/roadmap.md, append to `.bny/decisions.md`

## Don't

- Use classes for data
- Throw exceptions for control flow
- Implement without tests
- Skip Gemini review
- Change tests after review without human approval
- Commit without running `./dev/post_flight`
- Ignore `.bny/guardrails.json` constraints
- Modify protected files without human approval
