# Bunny - Agent Protocol

## What This Is

Bunny is a Bun + TypeScript project template with the bny dark factory CLI.

## Key Files

- `./bny/roadmap.md` - **START HERE** — Driving task list for all development
- `./bny/guardrails.json` - Machine-readable agent constraints
- `./dna/technical/development-loop.md` - Antagonistic Testing process

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

Read `bny/guardrails.json` before starting work. It defines:
- **protected_files** — never modify without human approval
- **blast_radius** — max files/lines per PR, dependency rules
- **forbidden_actions** — never do these autonomously
- **require_human_approval** — ask before doing these

### After completing work

Append a one-liner to `bny/decisions.md` recording what you did and why.

## Development Process: Antagonistic Testing

**See:** `./dna/technical/development-loop.md`

1. Design interface → 2. Design tests (Claude) → 3. Review tests (Gemini)
4. Implement → 5. Loop until green → 6. **Human checkpoint** (only if stuck)

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
specs/            # feature specs
bin/              # executables (bny entry point)
bny/              # dark factory CLI — operational state + tooling
  lib/            # shared modules (assassin, ralph)
  roadmap.md      # what to work on next
  guardrails.json # agent constraints
  decisions.md    # append-only decision log
dna/              # project knowledge — context only, no operational deps
  technical/      # development loop, conventions
  research/       # papers, analysis
dev/              # dev tooling (shebang, chmod +x, per-project customizable)
.githooks/        # git hooks (pre-commit, pre-push)
```

## Workflow: Picking Up Work

1. Run `./dev/pre_flight` — confirm environment is ready
2. Read `bny/roadmap.md` — find "Next" item
3. Read `bny/guardrails.json` — know the constraints
4. Run `/bny.specify` — creates `specs/{feature}/spec.md`
5. Open PR for human review
6. After approval: `/bny.plan` → `/bny.tasks`
7. Review tests with Gemini (antagonist)
8. Implement via `/bny.implement`
9. Run `./dev/test` after every change
10. Run `./dev/post_flight` before committing
11. If stuck (tests won't pass) → Human checkpoint
12. On completion → Update bny/roadmap.md, append to `bny/decisions.md`

## Don't

- Use classes for data
- Throw exceptions for control flow
- Implement without tests
- Skip Gemini review
- Change tests after review without human approval
- Commit without running `./dev/post_flight`
- Ignore `bny/guardrails.json` constraints
- Modify protected files without human approval
